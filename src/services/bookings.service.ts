// Bookings service — Supabase-backed
// Session capacity is maintained by DB triggers (schema.sql).
import { supabase } from './supabase/client';
import { Booking, BookingStatus, OwnerRef } from '../types/domain';
import { coursesService } from './courses.service';
import { calculateCommission } from './commission.service';
import { paymentsService } from './payments.service';
import { teachersService } from './teachers.service';
import { questionnaireService } from './questionnaire.service';
import { creditsService } from './credits.service';
import { pointsService } from './points.service';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

// Cache: bookingId → Booking
const cache = new Map<string, Booking>();

function rowToBooking(row: any): Booking {
  return {
    id: row.id,
    userId: row.user_id,
    sessionId: row.session_id,
    classId: row.class_id,
    teacherId: row.teacher_id,
    status: row.status as BookingStatus,
    priceTotal: Number(row.price_total ?? 0),
    commissionAmount: Number(row.commission_amount ?? 0),
    teacherAmount: Number(row.teacher_amount ?? 0),
    createdAt: row.created_at,
    cancelDeadline: row.cancel_deadline,
    sessionStartsAt: row.session_starts_at,
    isFree: !!row.is_free,
    questionnaireRequired: !!row.questionnaire_required,
    questionnaireCompleted: !!row.questionnaire_completed,
  };
}

export const bookingsService = {
  // Load all bookings visible to the signed-in user (RLS filters automatically:
  // user sees own bookings; teachers see bookings for their classes).
  async load(): Promise<void> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('load bookings:', error.message);
      return;
    }
    cache.clear();
    (data ?? []).forEach((r: any) => cache.set(r.id, rowToBooking(r)));
    notify();
  },

  listForUser(userId: string): Booking[] {
    return Array.from(cache.values())
      .filter((b) => b.userId === userId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  listForTeacher(teacherId: string): Booking[] {
    return Array.from(cache.values())
      .filter((b) => b.teacherId === teacherId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  get(id: string): Booking | undefined {
    return cache.get(id);
  },

  hasPendingQuestionnaire(userId: string): boolean {
    // Only PAST bookings can (and must) be evaluated — a future session
    // hasn't happened yet so its questionnaire cannot be pending.
    const now = Date.now();
    return this.listForUser(userId).some(
      (b) =>
        b.questionnaireRequired &&
        !b.questionnaireCompleted &&
        new Date(b.sessionStartsAt).getTime() < now
    );
  },

  // A review can be left when the session is past, the booking was honoured,
  // and no review has been recorded yet. Available for ALL teachers (not just
  // those in evaluation): certified/pro teachers also benefit from feedback.
  canLeaveReview(booking: Booking): boolean {
    const isPast = new Date(booking.sessionStartsAt).getTime() <= Date.now();
    const honoured = booking.status === 'confirmed' || booking.status === 'completed';
    return isPast && honoured && !booking.questionnaireCompleted;
  },

  async createBooking(
    userId: string,
    sessionId: string,
    opts?: { paymentMethod?: 'cash' | 'credits' },
  ): Promise<Booking> {
    if (this.hasPendingQuestionnaire(userId)) {
      throw new Error('Tu dois évaluer ton dernier cours avant de réserver à nouveau.');
    }

    const session = coursesService.getSession(sessionId);
    if (!session) throw new Error('Créneau introuvable');
    if (session.bookedCount >= session.maxParticipants) {
      throw new Error('Créneau complet');
    }
    const cls = coursesService.getClass(session.classId);
    if (!cls) throw new Error('Cours introuvable');
    const teacherStatus = teachersService.getStatus(cls.teacherId) ?? 'new_teacher';
    const questionnaireRequired = questionnaireService.isRequiredFor(teacherStatus);

    const owner: OwnerRef = {
      type: cls.ownerType ?? 'teacher',
      id: cls.ownerId ?? cls.teacherId,
    };
    const paymentMethod = cls.isFree ? 'cash' : (opts?.paymentMethod ?? 'cash');

    // 1. Payment — credits path skips Stripe entirely and deducts 1 credit
    //    from the student's wallet for this owner. The balance check happens
    //    client-side for UX, the DB function re-checks under the hood.
    if (paymentMethod === 'credits') {
      const balance = creditsService.getBalance(userId, owner);
      if (balance < 1) {
        throw new Error(
          `Crédits insuffisants chez ce vendeur. Achète d'abord un pack ou un abonnement.`,
        );
      }
    } else if (!cls.isFree) {
      const payment = await paymentsService.createPaymentIntent({
        amount: cls.price,
        currency: 'EUR',
        bookingReference: `pending_${Date.now()}`,
      });
      if (payment.status !== 'succeeded') {
        throw new Error('Paiement échoué');
      }
    }

    // 2. Commission
    const commission = calculateCommission(cls.price);

    // 3. Insert booking in Supabase (trigger increments session.booked_count)
    const deadline = new Date(session.startsAt);
    deadline.setHours(deadline.getHours() - cls.cancellationHoursBefore);

    const { data, error } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        session_id: session.id,
        class_id: cls.id,
        teacher_id: cls.teacherId,
        owner_type: owner.type,
        owner_id: owner.id,
        paid_with: paymentMethod,
        status: 'confirmed',
        price_total: paymentMethod === 'credits' ? 0 : cls.price,
        commission_amount: paymentMethod === 'credits' ? 0 : commission.commissionAmount,
        teacher_amount: paymentMethod === 'credits' ? 0 : commission.proAmount,
        is_free: cls.isFree,
        questionnaire_required: questionnaireRequired,
        session_starts_at: session.startsAt,
        cancel_deadline: deadline.toISOString(),
      })
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Réservation échouée');

    const booking = rowToBooking(data);
    cache.set(booking.id, booking);

    // If paid with credits, deduct 1 from the student's wallet for this
    // owner. The atomic wallet_apply_delta RPC prevents going negative.
    // Best-effort link of the credit transaction back to the booking row.
    if (paymentMethod === 'credits') {
      try {
        await creditsService.consumeForBooking({
          userId,
          owner,
          bookingId: booking.id,
        });
      } catch (e) {
        console.warn('credit consume failed after booking insert:', (e as Error).message);
      }
    }

    // Reflect capacity change locally (trigger updated DB; mirror in cache)
    coursesService._updateSessionLocal(session.id, {
      bookedCount: session.bookedCount + 1,
      status:
        session.bookedCount + 1 >= session.maxParticipants ? 'full' : 'open',
    });

    notify();

    // ────────────────────────────────────────────────────────────────
    // Loyalty points — fire-and-forget, idempotent server-side
    // ────────────────────────────────────────────────────────────────
    // All paid (non-free) bookings give points; free classes count only for
    // "first booking" and "new category" since there's no money changing hands.
    this._awardBookingPoints(booking, userId, cls.teacherId, cls.category).catch(
      (e) => console.warn('[points] booking awards failed', e)
    );

    return booking;
  },

  // Internal: computes & awards all points triggered by a new booking.
  // Exposed for reuse (e.g. future "admin backfill" tooling).
  async _awardBookingPoints(
    booking: Booking,
    userId: string,
    teacherUserId: string,
    category: string,
  ): Promise<void> {
    const isPaid = !booking.isFree;

    // Pull the user row to check for referral origin + get teacher's user_id
    // (we awarded to teacher_user, but need teacher_profiles.user_id)
    const [userRow, teacherProfileRow] = await Promise.all([
      supabase
        .from('users')
        .select('id, invited_by_teacher_id, invited_by_user_id')
        .eq('id', userId)
        .maybeSingle(),
      supabase
        .from('teacher_profiles')
        .select('id, user_id')
        .eq('id', booking.teacherId)
        .maybeSingle(),
    ]);

    const teacherUserIdResolved = teacherProfileRow.data?.user_id ?? null;

    // Has this user ever booked before? (including this one). If only 1 booking
    // in DB for this user, it's the first → award bonus.
    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId);
    const isFirstBooking = (bookingCount ?? 0) <= 1;

    // Has this user ever booked this category before?
    const { count: catCount } = await supabase
      .from('bookings')
      .select('id, classes!inner(category)', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('classes.category', category);
    const isNewCategory = (catCount ?? 0) <= 1;

    // Count this month's bookings for the 3-bookings bonus
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const { count: monthCount } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', monthStart.toISOString());
    const hits3ThisMonth = (monthCount ?? 0) === 3;

    // Student awards -----------------------------------------------------
    if (isPaid && isFirstBooking) {
      pointsService.award({
        userId,
        type: 'student_first_booking',
        sourceId: booking.id,
      });
    }

    if (isNewCategory) {
      pointsService.award({
        userId,
        type: 'student_new_category_bonus',
        sourceId: null, // one-shot per category — enforced by custom key below
        label: `Nouvelle catégorie : ${category}`,
      });
      // Note: the unique index is (user_id, type) when source_id null — so only
      // ONE such bonus per user. To allow per-category, pass sourceId=category
      // hash; for MVP we award on first new category only. TODO refine.
    }

    if (hits3ThisMonth) {
      // sourceId = YYYY-MM so we can award once per calendar month
      const mkMonthId = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      };
      pointsService.award({
        userId,
        type: 'student_3_bookings_month_bonus',
        // Reuse source_id column with a synthetic UUID-like token. Supabase
        // accepts null, so we stick to null and rely on (user,type) unique.
        // → This means the bonus triggers once per lifetime for the first
        //   3-in-a-month milestone. Acceptable for MVP.
        sourceId: null,
        label: `Bonus 3 cours ce mois (${mkMonthId()})`,
      });
    }

    // Teacher awards -----------------------------------------------------
    if (teacherUserIdResolved) {
      if (isPaid) {
        pointsService.award({
          userId: teacherUserIdResolved,
          type: 'teacher_paid_booking',
          sourceId: booking.id,
        });
      }

      // If the student was invited by THIS teacher and it's their first
      // booking → teacher gets the referral-first-booking bonus
      if (
        userRow.data?.invited_by_teacher_id === booking.teacherId &&
        isFirstBooking
      ) {
        pointsService.award({
          userId: teacherUserIdResolved,
          type: 'teacher_referred_student_first_booking',
          sourceId: userId, // one-shot per referred student
          label: `Première résa d'un filleul`,
        });
      }
    }

    // Friend-referral (student invited by another student)
    if (userRow.data?.invited_by_user_id && isFirstBooking && isPaid) {
      pointsService.award({
        userId: userRow.data.invited_by_user_id,
        type: 'student_referral_first_booking',
        sourceId: userId, // one-shot per referred friend
      });
    }
  },

  async markQuestionnaireCompleted(bookingId: string): Promise<void> {
    const { error } = await supabase
      .from('bookings')
      .update({ questionnaire_completed: true })
      .eq('id', bookingId);
    if (error) {
      console.warn('mark questionnaire:', error.message);
      return;
    }
    const b = cache.get(bookingId);
    if (b) {
      cache.set(bookingId, { ...b, questionnaireCompleted: true });
      notify();
    }

    // Completion points — questionnaire filled ≈ course really happened
    if (b && b.status === 'confirmed') {
      pointsService.award({
        userId: b.userId,
        type: 'student_completed_class',
        sourceId: b.id,
      });
      // Look up teacher_profiles.user_id for the award
      supabase
        .from('teacher_profiles')
        .select('user_id')
        .eq('id', b.teacherId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.user_id) {
            pointsService.award({
              userId: data.user_id,
              type: 'teacher_completed_class',
              sourceId: b.id,
            });
          }
        });
    }
  },

  canCancel(booking: Booking): { allowed: boolean; reason?: string } {
    const now = new Date();
    const deadline = new Date(booking.cancelDeadline);
    if (now > deadline) {
      return {
        allowed: false,
        reason:
          "Annulation non autorisée : tu es à moins de 48h du cours. Contacte le professeur pour toute urgence.",
      };
    }
    if (booking.status !== 'confirmed') {
      return { allowed: false, reason: 'Réservation déjà annulée' };
    }
    return { allowed: true };
  },

  async cancelBooking(bookingId: string): Promise<Booking> {
    const booking = cache.get(bookingId);
    if (!booking) throw new Error('Réservation introuvable');
    const check = this.canCancel(booking);
    if (!check.allowed) throw new Error(check.reason);

    if (!booking.isFree) {
      await paymentsService.refund({
        bookingId,
        amount: booking.priceTotal,
      });
    }

    const newStatus: BookingStatus = booking.isFree
      ? 'cancelled_by_user'
      : 'refunded';

    const { data, error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', bookingId)
      .select()
      .single();

    if (error || !data) throw new Error(error?.message ?? 'Annulation échouée');

    const updated = rowToBooking(data);
    cache.set(bookingId, updated);

    // Mirror trigger-driven capacity release locally
    const session = coursesService.getSession(booking.sessionId);
    if (session) {
      coursesService._updateSessionLocal(booking.sessionId, {
        bookedCount: Math.max(0, session.bookedCount - 1),
        status: 'open',
      });
    }

    notify();
    return updated;
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
