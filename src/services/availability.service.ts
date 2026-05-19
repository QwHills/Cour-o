// Availability service — stores opening hours + closed periods per teacher,
// and computes candidate slots that CreateClassScreen can offer when a pro
// publishes a new offer.
//
// Storage is in-memory for now (defaults seeded per teacher). A Supabase-backed
// persistence layer can plug in later without changing callers.

import {
  AvailableSlot,
  CandidateSlot,
  ClosedPeriod,
  DayOpening,
  ScheduleConflict,
  WeekDayKey,
  WeeklyOpeningHours,
  WeeklyPattern,
} from '../types/domain';
import { coursesService } from './courses.service';
import { calendarService } from './calendar.service';

const DAY_KEYS: WeekDayKey[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];
const MONTH_LABELS = [
  'janv.', 'févr.', 'mars', 'avril', 'mai', 'juin',
  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.',
];

function defaultOpeningHours(): WeeklyOpeningHours {
  return {
    mon: { open: true, slots: [{ start: '09:00', end: '18:00' }] },
    tue: { open: true, slots: [{ start: '09:00', end: '18:00' }] },
    wed: { open: true, slots: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }] },
    thu: { open: true, slots: [{ start: '09:00', end: '18:00' }] },
    fri: { open: true, slots: [{ start: '09:00', end: '18:00' }] },
    sat: { open: true, slots: [{ start: '10:00', end: '17:00' }] },
    sun: { open: false, slots: [{ start: '09:00', end: '18:00' }] },
  };
}

function defaultClosedPeriods(): ClosedPeriod[] {
  return [
    { id: 'p_summer', label: "Vacances d'été", start: '2026-07-15', end: '2026-08-15' },
  ];
}

// Per-teacher in-memory cache — keyed by teacher id.
const openingHoursStore = new Map<string, WeeklyOpeningHours>();
const closedPeriodsStore = new Map<string, ClosedPeriod[]>();

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Helpers -------------------------------------------------------------------

function dayKeyFor(date: Date): WeekDayKey {
  // JS: 0 = Sunday .. 6 = Saturday
  // Our WeekDayKey is mon..sun; convert with an offset.
  const jsDay = date.getDay(); // 0..6
  const idx = jsDay === 0 ? 6 : jsDay - 1; // 0..6 mapping to mon..sun
  return DAY_KEYS[idx]!;
}

function parseHM(hm: string): { h: number; m: number } {
  const [h, m] = hm.split(':').map((s) => parseInt(s, 10));
  return { h: h || 0, m: m || 0 };
}

function setTimeOnDate(date: Date, hm: string): Date {
  const { h, m } = parseHM(hm);
  const d = new Date(date);
  d.setHours(h, m, 0, 0);
  return d;
}

function ymd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isWithinClosedPeriod(date: Date, periods: ClosedPeriod[]): boolean {
  const stamp = ymd(date);
  return periods.some((p) => stamp >= p.start && stamp <= p.end);
}

function formatDayLabel(date: Date): string {
  return `${DAY_LABELS[date.getDay()]} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`;
}

function formatTimeLabel(start: Date, end: Date): string {
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

// Public API ----------------------------------------------------------------

export const availabilityService = {
  // Opening hours ----------------------------------------------------------
  getOpeningHours(teacherId: string): WeeklyOpeningHours {
    if (!openingHoursStore.has(teacherId)) {
      openingHoursStore.set(teacherId, defaultOpeningHours());
    }
    return openingHoursStore.get(teacherId)!;
  },

  setOpeningHours(teacherId: string, schedule: WeeklyOpeningHours): void {
    openingHoursStore.set(teacherId, schedule);
    notify();
  },

  // Closed periods ---------------------------------------------------------
  getClosedPeriods(teacherId: string): ClosedPeriod[] {
    if (!closedPeriodsStore.has(teacherId)) {
      closedPeriodsStore.set(teacherId, defaultClosedPeriods());
    }
    return closedPeriodsStore.get(teacherId)!;
  },

  setClosedPeriods(teacherId: string, periods: ClosedPeriod[]): void {
    closedPeriodsStore.set(teacherId, periods);
    notify();
  },

  addClosedPeriod(teacherId: string, period: ClosedPeriod): void {
    const list = this.getClosedPeriods(teacherId);
    closedPeriodsStore.set(teacherId, [...list, period]);
    notify();
  },

  removeClosedPeriod(teacherId: string, periodId: string): void {
    const list = this.getClosedPeriods(teacherId);
    closedPeriodsStore.set(teacherId, list.filter((p) => p.id !== periodId));
    notify();
  },

  // Candidate slots for CreateClassScreen ----------------------------------
  // Generates [now + 1 day ... now + daysAhead] slots that fit within
  // opening hours, avoid closed periods, and don't overlap external
  // calendar busy events. Step between slot starts defaults to 30 min.
  async generateCandidateSlots(
    teacherId: string,
    durationMinutes: number,
    daysAhead = 14,
    stepMinutes = 30,
  ): Promise<CandidateSlot[]> {
    if (durationMinutes <= 0) return [];

    const hours = this.getOpeningHours(teacherId);
    const closed = this.getClosedPeriods(teacherId);

    // Busy events from external calendar (Google / Apple). Defensive: if the
    // service errors, we just treat calendar as "no busy" to stay usable.
    let busy: { start: string; end: string }[] = [];
    try {
      const horizonEnd = new Date();
      horizonEnd.setDate(horizonEnd.getDate() + daysAhead);
      busy = await calendarService.listBusy(teacherId, new Date(), horizonEnd);
    } catch {
      busy = [];
    }

    const overlapsBusy = (startMs: number, endMs: number): boolean =>
      busy.some((e) => {
        const bs = new Date(e.start).getTime();
        const be = new Date(e.end).getTime();
        return startMs < be && endMs > bs;
      });

    const slots: CandidateSlot[] = [];
    const now = Date.now();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start at "tomorrow" so we never offer a past time.
    for (let offset = 1; offset <= daysAhead; offset++) {
      const day = new Date(today);
      day.setDate(day.getDate() + offset);

      if (isWithinClosedPeriod(day, closed)) continue;

      const dayOpening: DayOpening = hours[dayKeyFor(day)];
      if (!dayOpening || !dayOpening.open) continue;

      for (const window of dayOpening.slots) {
        const windowStart = setTimeOnDate(day, window.start);
        const windowEnd = setTimeOnDate(day, window.end);

        // Walk the window in `stepMinutes` increments
        for (
          let cursor = windowStart.getTime();
          cursor + durationMinutes * 60_000 <= windowEnd.getTime();
          cursor += stepMinutes * 60_000
        ) {
          const startMs = cursor;
          const endMs = cursor + durationMinutes * 60_000;
          if (startMs < now) continue;
          if (overlapsBusy(startMs, endMs)) continue;

          const startDate = new Date(startMs);
          const endDate = new Date(endMs);
          slots.push({
            startsAt: startDate.toISOString(),
            endsAt: endDate.toISOString(),
            dayLabel: formatDayLabel(startDate),
            timeLabel: formatTimeLabel(startDate, endDate),
          });
        }
      }
    }

    return slots;
  },

  // Weekly pattern helpers -------------------------------------------------
  // Given a weekday and a class duration, returns the possible start times
  // that fit within the teacher's opening windows for that day (HH:MM).
  // Used by CreateClassScreen to populate the time picker.
  getAllowedStartTimes(
    teacherId: string,
    weekDay: WeekDayKey,
    durationMinutes: number,
    stepMinutes = 30,
  ): string[] {
    if (durationMinutes <= 0) return [];
    const hours = this.getOpeningHours(teacherId);
    const day = hours[weekDay];
    if (!day?.open) return [];

    const times: string[] = [];
    const seen = new Set<string>();
    for (const window of day.slots) {
      const { h: sh, m: sm } = parseHM(window.start);
      const { h: eh, m: em } = parseHM(window.end);
      const startMin = sh * 60 + sm;
      const endMin = eh * 60 + em;
      for (let t = startMin; t + durationMinutes <= endMin; t += stepMinutes) {
        const hh = String(Math.floor(t / 60)).padStart(2, '0');
        const mm = String(t % 60).padStart(2, '0');
        const label = `${hh}:${mm}`;
        if (!seen.has(label)) {
          seen.add(label);
          times.push(label);
        }
      }
    }
    return times;
  },

  // Expand a WeeklyPattern into concrete CandidateSlots for the next
  // `weeksAhead` weeks, skipping closed periods and past times.
  expandPattern(
    teacherId: string,
    pattern: WeeklyPattern,
    durationMinutes: number,
    weeksAhead = 8,
  ): CandidateSlot[] {
    if (durationMinutes <= 0) return [];
    const closed = this.getClosedPeriods(teacherId);
    const now = Date.now();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const horizon = weeksAhead * 7;

    const slots: CandidateSlot[] = [];
    for (let offset = 0; offset <= horizon; offset++) {
      const day = new Date(today);
      day.setDate(day.getDate() + offset);
      if (isWithinClosedPeriod(day, closed)) continue;

      const key = dayKeyFor(day);
      const times = pattern[key] ?? [];
      for (const hm of times) {
        const start = setTimeOnDate(day, hm);
        const end = new Date(start.getTime() + durationMinutes * 60_000);
        if (start.getTime() < now) continue;
        slots.push({
          startsAt: start.toISOString(),
          endsAt: end.toISOString(),
          dayLabel: formatDayLabel(start),
          timeLabel: formatTimeLabel(start, end),
        });
      }
    }
    return slots;
  },

  // Detect conflicts between a set of candidate slots and the existing
  // sessions of the teacher's OTHER offers. Two sessions conflict when
  // they overlap in time. Non-blocking — we return the list to display
  // a warning; the pro may legitimately run two rooms in parallel.
  findConflicts(
    teacherId: string,
    slots: CandidateSlot[],
    excludeClassId?: string,
  ): ScheduleConflict[] {
    const teacherClasses = coursesService
      .listForTeacher(teacherId)
      .filter((c) => c.id !== excludeClassId);
    const classById = new Map(teacherClasses.map((c) => [c.id, c]));
    const otherSessions = coursesService
      .allSessions()
      .filter((s) => classById.has(s.classId) && s.status !== 'cancelled');

    const conflicts: ScheduleConflict[] = [];
    for (const slot of slots) {
      const slotStart = new Date(slot.startsAt).getTime();
      const slotEnd = new Date(slot.endsAt).getTime();
      for (const os of otherSessions) {
        const osStart = new Date(os.startsAt).getTime();
        const osEnd = new Date(os.endsAt).getTime();
        if (slotStart < osEnd && slotEnd > osStart) {
          const cls = classById.get(os.classId);
          conflicts.push({
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            dayLabel: slot.dayLabel,
            timeLabel: slot.timeLabel,
            conflictWith: cls?.title ?? 'Autre offre',
            kind: 'class',
          });
          break; // one conflict per slot is enough to surface
        }
      }
    }
    return conflicts;
  },

  // Detect conflicts between a set of candidate slots and the teacher's
  // personal calendar events (read via expo-calendar). Non-blocking — same
  // contract as findConflicts(). Returns [] if no calendar connection or
  // permission was denied.
  async findCalendarConflicts(
    teacherId: string,
    slots: CandidateSlot[],
  ): Promise<ScheduleConflict[]> {
    if (slots.length === 0) return [];

    // Horizon = earliest slot → latest slot, with a small buffer.
    let minStart = Infinity;
    let maxEnd = -Infinity;
    for (const s of slots) {
      const start = new Date(s.startsAt).getTime();
      const end = new Date(s.endsAt).getTime();
      if (start < minStart) minStart = start;
      if (end > maxEnd) maxEnd = end;
    }
    const from = new Date(minStart);
    const to = new Date(maxEnd);

    let busy: { start: string; end: string; title?: string }[] = [];
    try {
      busy = await calendarService.listBusy(teacherId, from, to);
    } catch {
      return [];
    }
    if (busy.length === 0) return [];

    const conflicts: ScheduleConflict[] = [];
    for (const slot of slots) {
      const slotStart = new Date(slot.startsAt).getTime();
      const slotEnd = new Date(slot.endsAt).getTime();
      for (const e of busy) {
        const eStart = new Date(e.start).getTime();
        const eEnd = new Date(e.end).getTime();
        if (slotStart < eEnd && slotEnd > eStart) {
          conflicts.push({
            startsAt: slot.startsAt,
            endsAt: slot.endsAt,
            dayLabel: slot.dayLabel,
            timeLabel: slot.timeLabel,
            conflictWith: e.title?.trim() || 'Événement personnel',
            kind: 'calendar',
          });
          break;
        }
      }
    }
    return conflicts;
  },

  // Existing API (kept for class detail screen) ----------------------------
  // Still used by CourseDetailScreen to show already-published sessions.
  async getSlotsForClass(
    classId: string,
    _from: Date,
    _to: Date
  ): Promise<AvailableSlot[]> {
    const cls = coursesService.getClass(classId);
    if (!cls) return [];

    const sessions = coursesService.getSessions(classId);

    const busy = await calendarService.listBusy(
      cls.teacherId,
      new Date(),
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    return sessions
      .filter((s) => s.status === 'open')
      .filter((s) => {
        const sStart = new Date(s.startsAt).getTime();
        const sEnd = new Date(s.endsAt).getTime();
        return !busy.some((e) => {
          const bStart = new Date(e.start).getTime();
          const bEnd = new Date(e.end).getTime();
          return sStart < bEnd && sEnd > bStart;
        });
      })
      .map((s) => ({
        sessionId: s.id,
        startsAt: s.startsAt,
        endsAt: s.endsAt,
        spotsLeft: s.maxParticipants - s.bookedCount,
      }));
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
