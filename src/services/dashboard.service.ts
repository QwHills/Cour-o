// Pro dashboard service — Supabase-backed
// Computes the teacher's daily-glance stats (réservations, revenus, prochaine
// séance, remplissage) from real rows instead of the old mockDashboard.
// Pattern: in-memory cache + onChange listeners, like courses.service.
import { supabase } from './supabase/client';
import { ClassSession, ProDashboardStats, SessionStatus } from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// teacherId → last computed stats (sync reads between loads)
const statsCache = new Map<string, ProDashboardStats>();

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

export const dashboardService = {
  // Recompute the stats for one teacher straight from Supabase.
  // RLS already restricts bookings to the teacher's own rows; the explicit
  // filters keep the queries cheap and unambiguous.
  async load(teacherId: string): Promise<ProDashboardStats> {
    const nowIso = new Date().toISOString();
    const weekAgoIso = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [classesRes, sessionsRes, bookingsRes] = await Promise.all([
      supabase
        .from('classes')
        .select('id, title, active')
        .eq('teacher_id', teacherId),
      // Upcoming, non-cancelled sessions of this teacher's classes, sorted so
      // the first row is genuinely the next one in time. The join goes through
      // classes because class_sessions.teacher_id is nullable (multi-vendor).
      supabase
        .from('class_sessions')
        .select('*, classes!inner(teacher_id, title)')
        .eq('classes.teacher_id', teacherId)
        .gt('starts_at', nowIso)
        .neq('status', 'cancelled')
        .order('starts_at', { ascending: true }),
      // Bookings created over the last 7 days → "réservations cette semaine"
      // + real revenue (teacher_amount = net for the prof, 0 for free/credit).
      supabase
        .from('bookings')
        .select('teacher_amount, status, created_at')
        .eq('teacher_id', teacherId)
        .gte('created_at', weekAgoIso),
    ]);

    if (classesRes.error) console.warn('dashboard classes:', classesRes.error.message);
    if (sessionsRes.error) console.warn('dashboard sessions:', sessionsRes.error.message);
    if (bookingsRes.error) console.warn('dashboard bookings:', bookingsRes.error.message);

    const classes = classesRes.data ?? [];
    const sessionRows = sessionsRes.data ?? [];
    const weekBookings = (bookingsRes.data ?? []).filter(
      (b: any) => b.status === 'confirmed' || b.status === 'completed',
    );

    const upcomingBooked = sessionRows.reduce(
      (sum: number, r: any) => sum + (r.booked_count ?? 0),
      0,
    );
    const upcomingCapacity = sessionRows.reduce(
      (sum: number, r: any) => sum + (r.max_participants ?? 0),
      0,
    );

    const nextRow = sessionRows[0];
    const weekRevenue = weekBookings.reduce(
      (sum: number, b: any) => sum + Number(b.teacher_amount ?? 0),
      0,
    );

    const stats: ProDashboardStats = {
      upcomingBookings: upcomingBooked,
      recentBookings: weekBookings.length,
      weekRevenue: Math.round(weekRevenue * 100) / 100,
      fillRate: upcomingCapacity > 0 ? upcomingBooked / upcomingCapacity : 0,
      totalClasses: classes.length,
      activeClasses: classes.filter((c: any) => c.active !== false).length,
      nextSession: nextRow
        ? { ...rowToSession(nextRow), classTitle: nextRow.classes?.title ?? '' }
        : undefined,
    };

    statsCache.set(teacherId, stats);
    notify();
    return stats;
  },

  // Sync read of the last loaded stats (undefined until first load resolves).
  get(teacherId: string): ProDashboardStats | undefined {
    return statsCache.get(teacherId);
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
