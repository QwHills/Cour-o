// Attendance marks — teacher ticks which booked + walk-in students actually
// showed up to a session. Backed by the `attendance_marks` table.
//
// Each mark identifies the attendee via EITHER `booking_id` OR `manual_id`
// (mutually exclusive at the DB level). The service exposes a single
// `upsert` that takes the higher-level attendee shape the UI uses.

import { supabase } from './supabase/client';

export interface AttendanceMark {
  id: string;
  sessionId: string;
  teacherId: string;
  bookingId: string | null;
  manualId: string | null;
  present: boolean;
  markedAt: string;
}

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// In-memory cache keyed by `${sessionId}::${attendeeKey}` (booking id or
// manual id prefixed). Synchronous reads for the UI tick boxes.
const cache = new Map<string, AttendanceMark>();
function cacheKey(sessionId: string, bookingId: string | null, manualId: string | null) {
  return `${sessionId}::${bookingId ? 'bk_' + bookingId : 'mp_' + manualId}`;
}

function rowToMark(row: any): AttendanceMark {
  return {
    id: row.id,
    sessionId: row.session_id,
    teacherId: row.teacher_id,
    bookingId: row.booking_id ?? null,
    manualId: row.manual_id ?? null,
    present: !!row.present,
    markedAt: row.marked_at,
  };
}

export const attendanceService = {
  async loadForSession(sessionId: string): Promise<AttendanceMark[]> {
    const { data, error } = await supabase
      .from('attendance_marks')
      .select('*')
      .eq('session_id', sessionId);
    if (error) {
      console.warn('attendance load:', error.message);
      return [];
    }
    const marks = (data ?? []).map(rowToMark);
    // Prune existing cache entries for this session so a removed mark gets
    // dropped from the in-memory store too.
    for (const k of Array.from(cache.keys())) {
      if (k.startsWith(`${sessionId}::`)) cache.delete(k);
    }
    for (const m of marks) {
      cache.set(cacheKey(m.sessionId, m.bookingId, m.manualId), m);
    }
    notify();
    return marks;
  },

  /** Sync read — UI uses this to decide whether the checkbox is filled. */
  isPresent(sessionId: string, bookingId: string | null, manualId: string | null): boolean {
    const k = cacheKey(sessionId, bookingId, manualId);
    return cache.get(k)?.present ?? false;
  },

  /** Idempotent upsert — flips the present flag for one attendee on a session. */
  async setPresence(input: {
    sessionId: string;
    teacherId: string;
    bookingId?: string;
    manualId?: string;
    present: boolean;
  }): Promise<void> {
    if ((!input.bookingId && !input.manualId) || (input.bookingId && input.manualId)) {
      throw new Error('Exactement un de bookingId / manualId est requis.');
    }
    const k = cacheKey(input.sessionId, input.bookingId ?? null, input.manualId ?? null);
    // Optimistic update.
    const existing = cache.get(k);
    const tentative: AttendanceMark = existing
      ? { ...existing, present: input.present, markedAt: new Date().toISOString() }
      : {
          id: `local_${Math.random().toString(36).slice(2, 10)}`,
          sessionId: input.sessionId,
          teacherId: input.teacherId,
          bookingId: input.bookingId ?? null,
          manualId: input.manualId ?? null,
          present: input.present,
          markedAt: new Date().toISOString(),
        };
    cache.set(k, tentative);
    notify();

    // Persist. The unique constraints on (session_id, booking_id) /
    // (session_id, manual_id) drive the upsert target so re-toggling the
    // same attendee never creates duplicates.
    const target = input.bookingId ? 'session_id,booking_id' : 'session_id,manual_id';
    const { data, error } = await supabase
      .from('attendance_marks')
      .upsert(
        {
          session_id: input.sessionId,
          teacher_id: input.teacherId,
          booking_id: input.bookingId ?? null,
          manual_id: input.manualId ?? null,
          present: input.present,
          marked_at: new Date().toISOString(),
        },
        { onConflict: target },
      )
      .select()
      .single();
    if (error) {
      // Roll back to the previous state on failure.
      if (existing) cache.set(k, existing);
      else cache.delete(k);
      notify();
      throw new Error(error.message);
    }
    if (data) {
      cache.set(k, rowToMark(data));
      notify();
    }
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
