import { Booking } from '../types/domain';
import { mockSessions, mockClasses } from './mockCourses';
import { calculateCommission } from '../services/commission.service';
import { getTeacherById } from './mockTeachers';

function addHours(isoStr: string, hours: number): string {
  const d = new Date(isoStr);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function daysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function daysFromNow(days: number, hour: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

const demoUserId = 'u_demo';

function createBooking(sessionIdx: number, daysOffset: number): Booking {
  const session = mockSessions[sessionIdx]!;
  const cls = mockClasses.find((c) => c.id === session.classId)!;
  const commission = calculateCommission(cls.price);
  const created = new Date();
  created.setDate(created.getDate() - daysOffset);

  const teacher = getTeacherById(cls.teacherId);
  const needsQuestionnaire =
    teacher?.status === 'new_teacher' || teacher?.status === 'under_review';

  return {
    id: `bk_${sessionIdx}_demo`,
    userId: demoUserId,
    sessionId: session.id,
    classId: cls.id,
    teacherId: cls.teacherId,
    status: 'confirmed',
    priceTotal: cls.price,
    commissionAmount: commission.commissionAmount,
    teacherAmount: commission.proAmount,
    createdAt: created.toISOString(),
    cancelDeadline: addHours(session.startsAt, -cls.cancellationHoursBefore),
    sessionStartsAt: session.startsAt,
    isFree: cls.isFree,
    questionnaireRequired: needsQuestionnaire,
    questionnaireCompleted: false,
  };
}

// ─── Simulate realistic revenue bookings ───

// Sophie (certified, t_sophie) — Yoga 15€ and Yin Yoga 18€
const yogaClass = mockClasses.find((c) => c.id === 'cls_yoga')!;
const yinClass = mockClasses.find((c) => c.id === 'cls_yoga_yin')!;
const yogaCommission = calculateCommission(yogaClass.price);
const yinCommission = calculateCommission(yinClass.price);

// James (professional, t_james) — English 10€ and DJ 20€
const englishClass = mockClasses.find((c) => c.id === 'cls_english')!;
const djClass = mockClasses.find((c) => c.id === 'cls_dj')!;
const englishCommission = calculateCommission(englishClass.price);
const djCommission = calculateCommission(djClass.price);

export const mockBookings: Booking[] = [
  // ─── User's own bookings ───
  createBooking(0, 2),   // Salsa Alex (gratuit, new_teacher → questionnaire)
  createBooking(3, 1),   // Yoga Sophie (payant)
  createBooking(9, 5),   // Poterie Marie (gratuit, under_review → questionnaire)

  // ─── Sophie's revenue: 5 bookings from various clients (PAST = already happened) ───
  // Booking 1: Yoga — cours passé il y a 5 jours — VERSÉ
  {
    id: 'bk_rev_1',
    userId: 'u_client1',
    sessionId: 'cls_yoga_past1',
    classId: 'cls_yoga',
    teacherId: '22222222-2222-2222-2222-222222222003',
    status: 'completed',
    priceTotal: 15,
    commissionAmount: yogaCommission.commissionAmount,
    teacherAmount: yogaCommission.proAmount,
    createdAt: daysAgo(7),
    cancelDeadline: daysAgo(7),
    sessionStartsAt: daysAgo(5),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },
  // Booking 2: Yin Yoga — cours passé il y a 3 jours — VERSÉ
  {
    id: 'bk_rev_2',
    userId: 'u_client2',
    sessionId: 'cls_yoga_yin_past1',
    classId: 'cls_yoga_yin',
    teacherId: '22222222-2222-2222-2222-222222222003',
    status: 'completed',
    priceTotal: 18,
    commissionAmount: yinCommission.commissionAmount,
    teacherAmount: yinCommission.proAmount,
    createdAt: daysAgo(5),
    cancelDeadline: daysAgo(5),
    sessionStartsAt: daysAgo(3),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },
  // Booking 3: Yoga — cours hier — EN ATTENTE (fenêtre 24h)
  {
    id: 'bk_rev_3',
    userId: 'u_client3',
    sessionId: 'cls_yoga_past2',
    classId: 'cls_yoga',
    teacherId: '22222222-2222-2222-2222-222222222003',
    status: 'confirmed',
    priceTotal: 15,
    commissionAmount: yogaCommission.commissionAmount,
    teacherAmount: yogaCommission.proAmount,
    createdAt: daysAgo(3),
    cancelDeadline: daysAgo(3),
    sessionStartsAt: daysAgo(1),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },
  // Booking 4: Yoga — cours demain — EN ATTENTE (escrow bloqué)
  {
    id: 'bk_rev_4',
    userId: 'u_client4',
    sessionId: mockSessions.find((s) => s.classId === 'cls_yoga')?.id ?? 'cls_yoga_s0',
    classId: 'cls_yoga',
    teacherId: '22222222-2222-2222-2222-222222222003',
    status: 'confirmed',
    priceTotal: 15,
    commissionAmount: yogaCommission.commissionAmount,
    teacherAmount: yogaCommission.proAmount,
    createdAt: daysAgo(2),
    cancelDeadline: daysFromNow(0, 8),
    sessionStartsAt: daysFromNow(1, 8),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },
  // Booking 5: Yin Yoga — dans 3 jours — EN ATTENTE
  {
    id: 'bk_rev_5',
    userId: 'u_client5',
    sessionId: mockSessions.find((s) => s.classId === 'cls_yoga_yin')?.id ?? 'cls_yoga_yin_s0',
    classId: 'cls_yoga_yin',
    teacherId: '22222222-2222-2222-2222-222222222003',
    status: 'confirmed',
    priceTotal: 18,
    commissionAmount: yinCommission.commissionAmount,
    teacherAmount: yinCommission.proAmount,
    createdAt: daysAgo(1),
    cancelDeadline: daysFromNow(1, 17),
    sessionStartsAt: daysFromNow(3, 17),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },

  // ─── James's revenue: 3 bookings ───
  {
    id: 'bk_rev_j1',
    userId: 'u_client6',
    sessionId: 'cls_english_past1',
    classId: 'cls_english',
    teacherId: '22222222-2222-2222-2222-222222222004',
    status: 'completed',
    priceTotal: 10,
    commissionAmount: englishCommission.commissionAmount,
    teacherAmount: englishCommission.proAmount,
    createdAt: daysAgo(6),
    cancelDeadline: daysAgo(6),
    sessionStartsAt: daysAgo(4),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },
  {
    id: 'bk_rev_j2',
    userId: 'u_client7',
    sessionId: 'cls_dj_past1',
    classId: 'cls_dj',
    teacherId: '22222222-2222-2222-2222-222222222004',
    status: 'confirmed',
    priceTotal: 20,
    commissionAmount: djCommission.commissionAmount,
    teacherAmount: djCommission.proAmount,
    createdAt: daysAgo(2),
    cancelDeadline: daysFromNow(0, 20),
    sessionStartsAt: daysFromNow(2, 20),
    isFree: false,
    questionnaireRequired: false,
    questionnaireCompleted: false,
  },
];

export function getUserBookings(userId: string): Booking[] {
  return mockBookings
    .filter((b) => b.userId === userId)
    .sort((a, b) => a.sessionStartsAt.localeCompare(b.sessionStartsAt));
}

export function getBookingById(id: string): Booking | undefined {
  return mockBookings.find((b) => b.id === id);
}

export function getTeacherBookings(teacherId: string): Booking[] {
  return mockBookings
    .filter((b) => b.teacherId === teacherId)
    .sort((a, b) => a.sessionStartsAt.localeCompare(b.sessionStartsAt));
}
