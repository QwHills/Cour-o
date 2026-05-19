// Calendar sync service — backed by EventKit on iOS via expo-calendar.
//
// Responsibilities:
//   - Ask the OS for calendar access (read + write).
//   - Find or create a dedicated "Koureo" calendar so we never pollute the
//     user's personal calendars.
//   - Read events from the user's other calendars so the booking flow can
//     block conflicting slots (RDV dentiste, vacances, etc).
//   - Push Koureo sessions into the dedicated calendar so the teacher sees
//     them alongside their personal events.
//
// Persistence: the connection (teacherId → koureoCalendarId) is stored in
// AsyncStorage so it survives app restarts. We don't store any access token
// here — EventKit handles the OS-level permission state.

import * as Calendar from 'expo-calendar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { BusyEvent, CalendarConnection } from '../types/domain';

const STORAGE_KEY = 'koureo:calendar-connections:v1';
const KOUREO_CALENDAR_TITLE = 'Koureo — Mes cours';
const NOTE_TAG = 'koureo:'; // prefix used in event.notes to identify our events
// Increment when the on-disk schema changes — old entries will be ignored.
type StoredConn = {
  id: string;
  teacherId: string;
  provider: 'apple';
  koureoCalendarId: string;
  connectedAt: string;
};

// In-memory cache, hydrated from AsyncStorage on first call. We keep this
// sync-readable so getConnectionFor() can stay synchronous (the UI calls it
// from useState initializers).
let connectionsCache: StoredConn[] | null = null;

async function loadConnections(): Promise<StoredConn[]> {
  if (connectionsCache) return connectionsCache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    connectionsCache = raw ? (JSON.parse(raw) as StoredConn[]) : [];
  } catch {
    connectionsCache = [];
  }
  return connectionsCache!;
}

async function saveConnections(list: StoredConn[]): Promise<void> {
  connectionsCache = list;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// Pick a calendar Source on iOS so we can create a calendar. iCloud first, falls
// back to local. Android handles this via a different path; for the MVP we
// keep iOS-only and gracefully no-op on Android.
async function getDefaultCalendarSource() {
  if (Platform.OS !== 'ios') return null;
  const defaultCal = await Calendar.getDefaultCalendarAsync();
  if (defaultCal?.source) return defaultCal.source;
  // Fallback: any source we can find
  const sources = await Calendar.getSourcesAsync();
  return sources[0] ?? null;
}

async function findOrCreateKoureoCalendar(): Promise<string> {
  const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const existing = all.find(
    (c) => c.title === KOUREO_CALENDAR_TITLE && (c.allowsModifications ?? true),
  );
  if (existing) return existing.id;
  const source = await getDefaultCalendarSource();
  if (!source) throw new Error('Aucune source de calendrier disponible sur cet appareil.');
  const id = await Calendar.createCalendarAsync({
    title: KOUREO_CALENDAR_TITLE,
    color: '#43c4b0',
    entityType: Calendar.EntityTypes.EVENT,
    sourceId: source.id,
    source,
    name: KOUREO_CALENDAR_TITLE,
    ownerAccount: source.name ?? 'Koureo',
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
  });
  return id;
}

function storedToConn(s: StoredConn): CalendarConnection {
  return {
    id: s.id,
    teacherId: s.teacherId,
    provider: s.provider,
    connectedAt: s.connectedAt,
  };
}

export const calendarService = {
  /** Trigger OS permission dialog + initial sync setup. Returns the connection. */
  async connect(teacherId: string): Promise<CalendarConnection> {
    if (Platform.OS !== 'ios') {
      throw new Error("La synchro calendrier n'est disponible que sur iOS pour l'instant.");
    }
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status !== 'granted') {
      throw new Error("Accès au calendrier refusé. Active-le dans Réglages > Koureo.");
    }
    const koureoCalendarId = await findOrCreateKoureoCalendar();
    const list = await loadConnections();
    // Replace any existing connection for this teacher
    const filtered = list.filter((c) => c.teacherId !== teacherId);
    const conn: StoredConn = {
      id: `cal_${Date.now()}`,
      teacherId,
      provider: 'apple',
      koureoCalendarId,
      connectedAt: new Date().toISOString(),
    };
    filtered.push(conn);
    await saveConnections(filtered);
    return storedToConn(conn);
  },

  /** Drop the saved connection. We don't delete the user's calendar — they
   *  can do that manually in the Calendar app if they want. */
  async disconnect(connectionId: string): Promise<void> {
    const list = await loadConnections();
    const next = list.filter((c) => c.id !== connectionId);
    await saveConnections(next);
  },

  /** Sync read — hydrates cache on first call. */
  getConnectionFor(teacherId: string): CalendarConnection | undefined {
    if (!connectionsCache) return undefined;
    const found = connectionsCache.find((c) => c.teacherId === teacherId);
    return found ? storedToConn(found) : undefined;
  },

  /** Call once on app boot (or before reading a teacher's connection) to make
   *  sure getConnectionFor() returns the persisted state. */
  async hydrate(): Promise<void> {
    await loadConnections();
  },

  /** Read events from the user's other calendars to know when they're busy.
   *  We exclude our own Koureo calendar so a teacher's session doesn't
   *  conflict-block itself. */
  async listBusy(teacherId: string, from: Date, to: Date): Promise<BusyEvent[]> {
    const list = await loadConnections();
    const conn = list.find((c) => c.teacherId === teacherId);
    if (!conn) return [];
    try {
      const all = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const ids = all
        .filter((c) => c.id !== conn.koureoCalendarId)
        .map((c) => c.id);
      if (ids.length === 0) return [];
      const events = await Calendar.getEventsAsync(ids, from, to);
      return events
        // Skip all-day events that span multiple days (vacation banners etc.) — they shouldn't block punctual slots
        .filter((e) => !e.allDay)
        .map((e) => ({
          start: typeof e.startDate === 'string' ? e.startDate : new Date(e.startDate).toISOString(),
          end: typeof e.endDate === 'string' ? e.endDate : new Date(e.endDate).toISOString(),
          title: e.title,
        }));
    } catch (e) {
      console.warn('calendarService.listBusy:', (e as Error).message);
      return [];
    }
  },

  /** Upsert Koureo sessions into the dedicated calendar.
   *  Events are tagged in the `notes` field as `koureo:<id>` so subsequent
   *  syncs can update them instead of duplicating. Pass either the real
   *  session id or a stable composite id (classId + startsAt) — what matters
   *  is consistency between sync and remove calls. */
  async syncSessionsToCalendar(
    teacherId: string,
    sessions: Array<{ id: string; title: string; startsAt: string; endsAt: string; location?: string }>,
  ): Promise<{ created: number; updated: number; skipped: number }> {
    const list = await loadConnections();
    const conn = list.find((c) => c.teacherId === teacherId);
    if (!conn) return { created: 0, updated: 0, skipped: sessions.length };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    for (const s of sessions) {
      const start = new Date(s.startsAt);
      const end = new Date(s.endsAt);
      // Look for an existing event we wrote previously — search a tight window
      // around the session date to keep the read cheap.
      const windowStart = new Date(start.getTime() - 24 * 60 * 60 * 1000);
      const windowEnd = new Date(end.getTime() + 24 * 60 * 60 * 1000);
      const existingEvents = await Calendar.getEventsAsync(
        [conn.koureoCalendarId],
        windowStart,
        windowEnd,
      );
      const tag = `${NOTE_TAG}${s.id}`;
      const tagged = existingEvents.find((e) => (e.notes ?? '').includes(tag));
      const payload: Partial<Calendar.Event> = {
        title: s.title,
        startDate: start,
        endDate: end,
        notes: tag,
        location: s.location ?? '',
        timeZone: 'Europe/Paris',
      };
      try {
        if (tagged) {
          await Calendar.updateEventAsync(tagged.id, payload as any);
          updated++;
        } else {
          await Calendar.createEventAsync(conn.koureoCalendarId, payload as any);
          created++;
        }
      } catch (e) {
        console.warn('calendarService.syncSessions skipped:', (e as Error).message);
        skipped++;
      }
    }
    return { created, updated, skipped };
  },

  /** Remove a previously-synced Koureo session from the calendar.
   *  Accepts either the session id used at sync time, or both fallback
   *  identifiers (classId + startsAt) so the caller can match the composite
   *  id strategy used by `coursesService.syncSessionsForClass`. */
  async removeSessionFromCalendar(
    teacherId: string,
    ids: string | { sessionId?: string; classId?: string; startsAt?: string },
  ): Promise<void> {
    const list = await loadConnections();
    const conn = list.find((c) => c.teacherId === teacherId);
    if (!conn) return;
    const candidates: string[] = [];
    if (typeof ids === 'string') {
      candidates.push(`${NOTE_TAG}${ids}`);
    } else {
      if (ids.sessionId) candidates.push(`${NOTE_TAG}${ids.sessionId}`);
      if (ids.classId && ids.startsAt) candidates.push(`${NOTE_TAG}${ids.classId}::${ids.startsAt}`);
    }
    if (candidates.length === 0) return;
    try {
      // Search the next 12 months for the tagged event
      const now = new Date();
      const horizon = new Date();
      horizon.setMonth(horizon.getMonth() + 12);
      const events = await Calendar.getEventsAsync([conn.koureoCalendarId], now, horizon);
      const target = events.find((e) => {
        const notes = e.notes ?? '';
        return candidates.some((c) => notes.includes(c));
      });
      if (target) await Calendar.deleteEventAsync(target.id);
    } catch (e) {
      console.warn('calendarService.removeSession:', (e as Error).message);
    }
  },
};
