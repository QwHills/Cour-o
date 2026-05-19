// Payments service — Stripe (real) for PaymentIntents, with legacy mocked
// escrow/disputes/payouts kept until webhooks + Connect wire-up are finished.
//
// Flow (real):
// 1. CheckoutScreen calls paymentsService.createPaymentSheet({ amount, bookingRef })
// 2. We invoke the Supabase Edge Function `create-payment-intent`
// 3. Edge Function uses Stripe secret key server-side to create a PaymentIntent
// 4. Returns { clientSecret, publishableKey } which the app uses with Stripe PaymentSheet
// 5. User completes payment in the sheet → on success, app calls bookingsService.createBooking
//
// Future: release/dispute/payouts handled by Stripe webhooks → Supabase tables

import { supabase } from './supabase/client';
import {
  Payment,
  PaymentStatus,
  EscrowStatus,
  Payout,
  PayoutStatus,
  Dispute,
  DisputeStatus,
} from '../types/domain';
import { calculateCommission } from './commission.service';

// ─────────────────────────────────────────────────────────
// In-memory escrow/payout/dispute state (mocked until webhooks)
// ─────────────────────────────────────────────────────────
const payments: Payment[] = [];
const payouts: Payout[] = [];
const disputes: Dispute[] = [];

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

export interface PaymentSheetParams {
  paymentIntentClientSecret: string;
  publishableKey: string;
  ephemeralKeySecret?: string;
  customerId?: string;
}

export const paymentsService = {
  // ─── Call Supabase Edge Function to create a PaymentIntent server-side ───
  async createPaymentSheet(input: {
    amount: number; // in EUR, decimal (e.g. 15.00)
    currency?: 'eur';
    bookingReference: string;
  }): Promise<PaymentSheetParams> {
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: {
        amount: Math.round(input.amount * 100), // Stripe expects cents
        currency: input.currency ?? 'eur',
        bookingReference: input.bookingReference,
      },
    });
    if (error) {
      // Try to surface the real HTTP status + body for easier debugging.
      // supabase.functions.invoke wraps a FunctionsHttpError whose `context`
      // is the underlying Response; read it to show the real reason.
      let detail = error.message ?? 'Edge Function failed';
      try {
        const ctx: any = (error as any).context;
        if (ctx && typeof ctx.text === 'function') {
          const body = await ctx.text();
          detail = `[${ctx.status}] ${body || error.message}`;
        }
      } catch {
        // swallow — we'll fall back to the generic message
      }
      console.error('[payments] Edge Function error:', detail);
      throw new Error(detail);
    }
    if (!data?.clientSecret) throw new Error('Invalid response from payment service');
    return {
      paymentIntentClientSecret: data.clientSecret,
      publishableKey:
        data.publishableKey ?? process.env.EXPO_PUBLIC_STRIPE_KEY ?? '',
      ephemeralKeySecret: data.ephemeralKey,
      customerId: data.customer,
    };
  },

  // Legacy name kept for backwards compat with bookings.service — acts as a
  // no-op "holder" since the real PaymentSheet is presented by CheckoutScreen
  // before bookingsService.createBooking is ever called.
  async createPaymentIntent(input: {
    amount: number;
    currency: 'EUR';
    bookingReference: string;
  }): Promise<Payment> {
    const payment: Payment = {
      id: `pay_${Date.now()}`,
      bookingId: input.bookingReference,
      amount: input.amount,
      currency: 'EUR',
      stripePaymentIntentId: `pi_local_${Date.now()}`,
      status: 'succeeded' as PaymentStatus,
      escrowStatus: 'held',
      createdAt: new Date().toISOString(),
    };
    payments.push(payment);
    notify();
    return payment;
  },

  // ─── STEP 2: Course ended → start 24h release window ───
  startReleaseWindow(bookingId: string): void {
    const payment = payments.find((p) => p.bookingId === bookingId);
    if (!payment || payment.escrowStatus !== 'held') return;

    const now = new Date().toISOString();
    payment.courseEndedAt = now;
    payment.releaseWindowEndsAt = addHours(now, 24);
    payment.escrowStatus = 'release_pending';
    notify();
  },

  async releaseFunds(bookingId: string, teacherId: string): Promise<Payout | null> {
    const payment = payments.find((p) => p.bookingId === bookingId);
    if (!payment) return null;
    if (payment.escrowStatus !== 'release_pending') return null;

    const commission = calculateCommission(payment.amount);

    payment.escrowStatus = 'released';
    payment.releasedAt = new Date().toISOString();

    const payout: Payout = {
      id: `po_${Date.now()}`,
      teacherId,
      bookingId,
      grossAmount: payment.amount,
      commissionAmount: commission.commissionAmount,
      netAmount: commission.proAmount,
      status: 'completed' as PayoutStatus,
      scheduledAt: payment.releaseWindowEndsAt ?? new Date().toISOString(),
      completedAt: new Date().toISOString(),
      stripeTransferId: `tr_local_${Date.now()}`,
    };
    payouts.push(payout);
    notify();
    return payout;
  },

  async openDispute(input: {
    bookingId: string;
    userId: string;
    teacherId: string;
    reason: string;
    description: string;
  }): Promise<Dispute> {
    const payment = payments.find((p) => p.bookingId === input.bookingId);
    if (payment) payment.escrowStatus = 'disputed';

    const dispute: Dispute = {
      id: `disp_${Date.now()}`,
      bookingId: input.bookingId,
      userId: input.userId,
      teacherId: input.teacherId,
      reason: input.reason,
      description: input.description,
      status: 'open' as DisputeStatus,
      createdAt: new Date().toISOString(),
    };
    disputes.push(dispute);
    notify();
    return dispute;
  },

  async resolveDispute(
    disputeId: string,
    resolution: 'refund' | 'release'
  ): Promise<void> {
    const dispute = disputes.find((d) => d.id === disputeId);
    if (!dispute) return;

    const payment = payments.find((p) => p.bookingId === dispute.bookingId);

    if (resolution === 'refund') {
      dispute.status = 'resolved_refund';
      if (payment) payment.escrowStatus = 'refunded';
    } else {
      dispute.status = 'resolved_release';
      if (payment) payment.escrowStatus = 'released';
    }
    dispute.resolvedAt = new Date().toISOString();
    dispute.resolution =
      resolution === 'refund'
        ? 'Remboursement effectué au participant'
        : 'Fonds libérés au professeur';
    notify();
  },

  async refund(input: { bookingId: string; amount: number }): Promise<Payment> {
    // TODO: call Edge Function /refund-payment-intent once implemented
    const original = payments.find((p) => p.bookingId === input.bookingId);
    if (original) original.escrowStatus = 'refunded';

    const refundPayment: Payment = {
      id: `ref_${Date.now()}`,
      bookingId: input.bookingId,
      amount: -input.amount,
      currency: 'EUR',
      stripePaymentIntentId: `re_local_${Date.now()}`,
      status: 'refunded',
      escrowStatus: 'refunded',
      createdAt: new Date().toISOString(),
    };
    payments.push(refundPayment);
    notify();
    return refundPayment;
  },

  // ─── Queries ───
  getPaymentForBooking(bookingId: string): Payment | undefined {
    return payments.find((p) => p.bookingId === bookingId && p.amount > 0);
  },

  getPayoutsForTeacher(teacherId: string): Payout[] {
    return payouts
      .filter((p) => p.teacherId === teacherId)
      .sort((a, b) => b.completedAt!.localeCompare(a.completedAt!));
  },

  getPendingPayoutsForTeacher(_teacherId: string): Payment[] {
    return payments.filter(
      (p) =>
        p.amount > 0 &&
        (p.escrowStatus === 'held' || p.escrowStatus === 'release_pending')
    );
  },

  getDisputesForBooking(bookingId: string): Dispute[] {
    return disputes.filter((d) => d.bookingId === bookingId);
  },

  getDisputesForTeacher(teacherId: string): Dispute[] {
    return disputes.filter((d) => d.teacherId === teacherId);
  },

  canDispute(payment: Payment): boolean {
    if (payment.escrowStatus !== 'release_pending') return false;
    if (!payment.releaseWindowEndsAt) return false;
    return new Date() < new Date(payment.releaseWindowEndsAt);
  },

  disputeWindowRemaining(payment: Payment): number {
    if (!payment.releaseWindowEndsAt) return 0;
    const remaining = new Date(payment.releaseWindowEndsAt).getTime() - Date.now();
    return Math.max(0, remaining);
  },

  list(): Payment[] {
    return payments;
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
