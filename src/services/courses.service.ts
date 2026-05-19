// Courses service — Supabase-backed
// Reads classes + class_sessions from Supabase, enriches with teacher profile.
import { supabase } from './supabase/client';
import { teachersService } from './teachers.service';
import { calendarService } from './calendar.service';
import {
  ClassOffer,
  ClassSession,
  Category,
  Level,
  ClassFormat,
  SessionStatus,
  TeacherProfile,
  isPromoLive,
} from '../types/domain';

export interface CourseSearchFilters {
  category?: string;
  format?: ClassFormat;
  level?: Level;
  query?: string;
  maxPrice?: number;
  maxDistanceMeters?: number;
  certifiedOnly?: boolean;
  freeOnly?: boolean;
}

export interface EnrichedCourse {
  class: ClassOffer;
  teacher: TeacherProfile | undefined;
  nextSession?: ClassSession;
  distanceMeters: number;
  distanceLabel: string;
  spotsLeft: number;
}

export const USER_LAT = 48.1113;
export const USER_LNG = -1.68;

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Local caches for sync reads
const classCache = new Map<string, ClassOffer>();
const sessionCache = new Map<string, ClassSession>();
// classId → sessionIds[] (maintained on load)
const sessionsByClass = new Map<string, Set<string>>();

function rowToClass(row: any): ClassOffer {
  return {
    id: row.id,
    teacherId: row.teacher_id,
    // Fall back to teacher ownership for rows that predate the multi-vendor
    // migration (owner_type/owner_id nullable in DB).
    ownerType: (row.owner_type as 'teacher' | 'organization') ?? 'teacher',
    ownerId: row.owner_id ?? row.teacher_id,
    title: row.title,
    category: row.category as Category,
    format: row.format as ClassFormat,
    level: row.level as Level,
    durationMinutes: row.duration_minutes,
    price: Number(row.price ?? 0),
    isFree: !!row.is_free,
    maxParticipants: row.max_participants,
    description: row.description ?? '',
    imageUrl: row.image_url ?? '',
    cancellationHoursBefore: row.cancellation_hours_before ?? 48,
  };
}

function rowToSession(row: any): ClassSession {
  return {
    id: row.id,
    classId: row.class_id,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    bookedCount: row.booked_count ?? 0,
    maxParticipants: row.max_participants,
    status: row.status as SessionStatus,
    promoPrice: row.promo_price != null ? Number(row.promo_price) : undefined,
    promoActive: !!row.promo_active,
    promoExpiresAt: row.promo_expires_at ?? undefined,
  };
}

function cacheClass(c: ClassOffer) {
  classCache.set(c.id, c);
}
function cacheSession(s: ClassSession) {
  sessionCache.set(s.id, s);
  let set = sessionsByClass.get(s.classId);
  if (!set) {
    set = new Set();
    sessionsByClass.set(s.classId, set);
  }
  set.add(s.id);
}

export const coursesService = {
  // Hydrate caches with all classes + their sessions + their teachers.
  async load(): Promise<void> {
    const [{ data: classes }, { data: sessions }] = await Promise.all([
      supabase.from('classes').select('*'),
      supabase.from('class_sessions').select('*'),
    ]);

    classCache.clear();
    sessionCache.clear();
    sessionsByClass.clear();

    (classes ?? []).forEach((r: any) => cacheClass(rowToClass(r)));
    (sessions ?? []).forEach((r: any) => cacheSession(rowToSession(r)));

    // Ensure teachers cache is populated for enrichment
    await teachersService.list();

    notify();
  },

  listAll(): EnrichedCourse[] {
    return Array.from(classCache.values()).map(enrich);
  },

  search(filters: CourseSearchFilters): EnrichedCourse[] {
    let list = this.listAll();
    const cat = filters.category;

    if (cat && cat !== 'Tous') {
      if (cat === 'Promotions') {
        list = list.filter((c) => !!c.nextSession && isPromoLive(c.nextSession));
      } else if (cat === 'Ce soir') {
        list = list.filter((c) => {
          if (!c.nextSession) return false;
          const d = new Date(c.nextSession.startsAt);
          const now = new Date();
          return d.toDateString() === now.toDateString() && d.getHours() >= 17;
        });
      } else if (cat === 'Cette semaine') {
        // Du jour courant jusqu'à dimanche soir (lundi = début de semaine côté FR)
        list = list.filter((c) => {
          if (!c.nextSession) return false;
          const d = new Date(c.nextSession.startsAt);
          const now = new Date();
          // Fin de semaine = dimanche 23:59:59
          const end = new Date(now);
          const dayIdx = (now.getDay() + 6) % 7; // 0=lundi … 6=dimanche
          end.setDate(now.getDate() + (6 - dayIdx));
          end.setHours(23, 59, 59, 999);
          return d >= now && d <= end;
        });
      } else if (cat === 'Ce weekend') {
        // Samedi 00:00 → dimanche 23:59
        list = list.filter((c) => {
          if (!c.nextSession) return false;
          const d = new Date(c.nextSession.startsAt);
          const now = new Date();
          const dayIdx = (now.getDay() + 6) % 7; // 0=lundi
          const sat = new Date(now);
          sat.setDate(now.getDate() + (5 - dayIdx)); // jusqu'à samedi
          sat.setHours(0, 0, 0, 0);
          const sun = new Date(sat);
          sun.setDate(sat.getDate() + 1);
          sun.setHours(23, 59, 59, 999);
          return d >= sat && d <= sun;
        });
      } else if (cat === 'Gratuit') {
        list = list.filter((c) => c.class.isFree);
      } else if (cat === 'Payant') {
        list = list.filter((c) => !c.class.isFree);
      } else if (cat === 'Certifié') {
        list = list.filter(
          (c) =>
            c.teacher?.status === 'certified_teacher' ||
            c.teacher?.status === 'professional'
        );
      } else {
        // Filtre par catégorie restant (utilisé par SearchScreen, pas la map)
        list = list.filter((c) => c.class.category === (cat as Category));
      }
    }

    if (filters.format) {
      list = list.filter((c) => c.class.format === filters.format);
    }
    if (filters.level) {
      list = list.filter(
        (c) => c.class.level === filters.level || c.class.level === 'all'
      );
    }

    if (filters.query && filters.query.trim()) {
      const q = filters.query.trim().toLowerCase();
      list = list.filter((c) => {
        const haystack = [
          c.class.title,
          c.class.description,
          c.class.category,
          c.teacher?.displayName ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      });
    }

    if (filters.freeOnly) {
      list = list.filter((c) => c.class.isFree);
    }

    if (typeof filters.maxPrice === 'number' && filters.maxPrice > 0) {
      list = list.filter((c) => c.class.isFree || c.class.price <= filters.maxPrice!);
    }

    if (typeof filters.maxDistanceMeters === 'number') {
      list = list.filter((c) => c.distanceMeters <= filters.maxDistanceMeters!);
    }

    if (filters.certifiedOnly) {
      list = list.filter(
        (c) =>
          c.teacher?.status === 'certified_teacher' ||
          c.teacher?.status === 'professional'
      );
    }

    return list;
  },

  get(id: string): EnrichedCourse | null {
    const cls = classCache.get(id);
    if (!cls) return null;
    return enrich(cls);
  },

  getClass(id: string): ClassOffer | undefined {
    return classCache.get(id);
  },

  getSessions(classId: string): ClassSession[] {
    const ids = sessionsByClass.get(classId);
    if (!ids) return [];
    const now = Date.now();
    return Array.from(ids)
      .map((id) => sessionCache.get(id)!)
      .filter((s) => s && new Date(s.startsAt).getTime() > now && s.status !== 'cancelled')
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  },

  getSession(sessionId: string): ClassSession | undefined {
    return sessionCache.get(sessionId);
  },

  // Raw cached collections (for pro screens that filter by teacher)
  allClasses(): ClassOffer[] {
    return Array.from(classCache.values());
  },

  allSessions(): ClassSession[] {
    return Array.from(sessionCache.values());
  },

  listForTeacher(teacherId: string): ClassOffer[] {
    return Array.from(classCache.values()).filter((c) => c.teacherId === teacherId);
  },

  // Persist promotion fields for a single session. Best-effort: patch the local
  // cache + push to Supabase. Promotions are per-session so a pro can discount
  // a specific timeslot to fill it.
  async updateSessionPromo(
    sessionId: string,
    promo: { promoActive: boolean; promoPrice?: number; promoExpiresAt?: string | null },
  ): Promise<void> {
    const s = sessionCache.get(sessionId);
    if (!s) return;
    sessionCache.set(sessionId, {
      ...s,
      promoActive: promo.promoActive,
      promoPrice: promo.promoPrice,
      promoExpiresAt: promo.promoExpiresAt ?? undefined,
    });
    notify();
    const { error } = await supabase
      .from('class_sessions')
      .update({
        promo_active: promo.promoActive,
        promo_price: promo.promoPrice ?? null,
        promo_expires_at: promo.promoExpiresAt ?? null,
      })
      .eq('id', sessionId);
    if (error) console.warn('updateSessionPromo sync:', error.message);
  },

  // Internal helpers for services that mutate session booked_count locally
  _updateSessionLocal(sessionId: string, patch: Partial<ClassSession>) {
    const s = sessionCache.get(sessionId);
    if (s) {
      sessionCache.set(sessionId, { ...s, ...patch });
      notify();
    }
  },

  // Pro-side session cancellation. Marks the session as cancelled locally
  // (so it disappears from the planning and the booking UI) and pushes the
  // change to Supabase best-effort. Actual refund processing for booked
  // participants would happen server-side via a dedicated edge function.
  async cancelSession(sessionId: string): Promise<void> {
    const session = sessionCache.get(sessionId);
    const cls = session ? classCache.get(session.classId) : undefined;
    this._updateSessionLocal(sessionId, { status: 'cancelled' });
    try {
      await supabase
        .from('class_sessions')
        .update({ status: 'cancelled' })
        .eq('id', sessionId);
    } catch (e) {
      console.warn('cancelSession Supabase sync failed:', (e as Error).message);
    }
    // Best-effort: pull the event out of the teacher's connected calendar.
    // Silent no-op if the teacher hasn't connected their calendar.
    if (cls?.teacherId && session) {
      calendarService
        .removeSessionFromCalendar(cls.teacherId, {
          sessionId,
          classId: session.classId,
          startsAt: session.startsAt,
        })
        .catch((e) => console.warn('cal removeSession:', (e as Error).message));
    }
  },

  // Reconcile the class's FUTURE sessions against a target list of (starts_at,
  // ends_at) computed from a weekly pattern. Used by CreateClassScreen when
  // saving an offer: we keep matches, cancel orphans without bookings, and
  // create new sessions for new times. Booked orphans are preserved (pro must
  // cancel them explicitly). Best-effort Supabase sync — local cache is the
  // authoritative view for the current app session.
  async syncSessionsForClass(
    classId: string,
    target: Array<{ startsAt: string; endsAt: string }>,
    maxParticipants: number,
  ): Promise<{ created: number; cancelled: number; kept: number }> {
    const cls = classCache.get(classId);
    if (!cls) return { created: 0, cancelled: 0, kept: 0 };

    const ids = sessionsByClass.get(classId) ?? new Set<string>();
    const now = Date.now();
    const existing = Array.from(ids)
      .map((id) => sessionCache.get(id)!)
      .filter((s) => s && new Date(s.startsAt).getTime() > now && s.status !== 'cancelled');

    const targetByStart = new Map(target.map((t) => [t.startsAt, t]));
    const existingByStart = new Map(existing.map((s) => [s.startsAt, s]));

    const toCancel = existing.filter((s) => !targetByStart.has(s.startsAt) && s.bookedCount === 0);
    const toCreate = target.filter((t) => !existingByStart.has(t.startsAt));
    const kept = existing.length - toCancel.length;

    // Cancel orphans (no bookings)
    for (const s of toCancel) {
      this._updateSessionLocal(s.id, { status: 'cancelled' });
      supabase
        .from('class_sessions')
        .update({ status: 'cancelled' })
        .eq('id', s.id)
        .then(({ error }) => {
          if (error) console.warn('syncSessions cancel sync:', error.message);
        });
    }

    // Create new sessions — generate client-side UUIDs so the cache update is
    // atomic with the Supabase insert.
    for (const t of toCreate) {
      const id = `local_${Math.random().toString(36).slice(2, 10)}_${Date.now()}`;
      const newSession: ClassSession = {
        id,
        classId,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
        bookedCount: 0,
        maxParticipants,
        status: 'open',
      };
      cacheSession(newSession);

      supabase
        .from('class_sessions')
        .insert({
          class_id: classId,
          starts_at: t.startsAt,
          ends_at: t.endsAt,
          booked_count: 0,
          max_participants: maxParticipants,
          status: 'open',
        })
        .select()
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.warn('syncSessions insert sync:', error.message);
            return;
          }
          // Swap the temp local id for the server-generated one so subsequent
          // updates (cancel, etc.) target the real row.
          if (data?.id && data.id !== id) {
            sessionCache.delete(id);
            sessionsByClass.get(classId)?.delete(id);
            cacheSession(rowToSession(data));
            notify();
          }
        });
    }

    notify();

    // Push the new schedule into the teacher's connected calendar so they
    // see Koureo sessions next to their personal events. Silent no-op when
    // not connected. We also remove the events we just cancelled.
    const teacherId = cls.teacherId;
    if (teacherId) {
      const upcoming = target.map((t) => ({
        // We don't have the final session id for newly-inserted rows (Supabase
        // generates them async); use a stable hash so we can upsert later.
        id: `${classId}::${t.startsAt}`,
        title: cls.title,
        startsAt: t.startsAt,
        endsAt: t.endsAt,
      }));
      calendarService
        .syncSessionsToCalendar(teacherId, upcoming)
        .catch((e) => console.warn('cal syncSessions:', (e as Error).message));
      for (const s of toCancel) {
        calendarService
          .removeSessionFromCalendar(teacherId, {
            sessionId: s.id,
            classId: s.classId,
            startsAt: s.startsAt,
          })
          .catch(() => {});
      }
    }

    return { created: toCreate.length, cancelled: toCancel.length, kept };
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

function enrich(cls: ClassOffer): EnrichedCourse {
  const teacher = teachersService.getCached(cls.teacherId);
  const sessions = coursesService.getSessions(cls.id);
  const nextSession = sessions[0];
  const distanceMeters = teacher
    ? computeDistance(USER_LAT, USER_LNG, teacher.latitude, teacher.longitude)
    : 0;
  const spotsLeft = nextSession
    ? nextSession.maxParticipants - nextSession.bookedCount
    : cls.maxParticipants;
  return {
    class: cls,
    teacher,
    nextSession,
    distanceMeters,
    distanceLabel: formatDistance(distanceMeters),
    spotsLeft,
  };
}

export function computeDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}
