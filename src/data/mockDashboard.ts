import { ProDashboardStats } from '../types/domain';
import { coursesService } from '../services/courses.service';

export function getProDashboard(proId: string): ProDashboardStats {
  const proClasses = coursesService.listForTeacher(proId);
  const proSessions = coursesService
    .allSessions()
    .filter((s) => proClasses.some((c) => c.id === s.classId));
  // Upcoming sessions, sorted chronologically so `upcoming[0]` is genuinely
  // the next session (closest in time). Without this the order was whatever
  // came back from the DB — which often surfaced a session weeks ahead as
  // "prochaine session" while a closer one existed.
  const upcoming = proSessions
    .filter((s) => new Date(s.startsAt) > new Date())
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const weekRevenue = upcoming.reduce((sum, s) => {
    const cls = proClasses.find((c) => c.id === s.classId);
    return sum + (cls ? cls.price * s.bookedCount : 0);
  }, 0);

  // Fill rate computed on UPCOMING sessions only — most actionable metric
  // for a working prof (tells them whether their NEXT sessions need more
  // bookings). Matches the value on the Planning screen for consistency.
  // For a global / retrospective view, see the Stats screen.
  const upcomingCapacity = upcoming.reduce((sum, s) => sum + s.maxParticipants, 0);
  const upcomingBooked = upcoming.reduce((sum, s) => sum + s.bookedCount, 0);
  const fillRate = upcomingCapacity > 0 ? upcomingBooked / upcomingCapacity : 0;

  const nextSession = upcoming[0];
  const nextClass = nextSession
    ? proClasses.find((c) => c.id === nextSession.classId)
    : undefined;

  return {
    upcomingBookings: upcomingBooked,
    weekRevenue: Math.round(weekRevenue * 100) / 100,
    fillRate,
    totalClasses: proClasses.length,
    activeClasses: proClasses.length,
    nextSession:
      nextSession && nextClass
        ? { ...nextSession, classTitle: nextClass.title }
        : undefined,
  };
}
