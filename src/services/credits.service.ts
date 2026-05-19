// Credits service — one wallet per (user, owner). Grants & consumes credits
// atomically via the wallet_apply_delta Postgres function so concurrent
// bookings never overspend a wallet.

import { supabase } from './supabase/client';
import {
  CreditTransaction,
  CreditTransactionReason,
  CreditWallet,
  OwnerRef,
  OwnerType,
  StudentPurchase,
} from '../types/domain';

type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

const walletCache = new Map<string, CreditWallet>();
const txCache = new Map<string, CreditTransaction>();
const purchaseCache = new Map<string, StudentPurchase>();

function rowToWallet(r: any): CreditWallet {
  return {
    id: r.id,
    userId: r.user_id,
    ownerType: r.owner_type as OwnerType,
    ownerId: r.owner_id,
    balance: r.balance ?? 0,
    updatedAt: r.updated_at,
  };
}

function rowToTx(r: any): CreditTransaction {
  return {
    id: r.id,
    walletId: r.wallet_id,
    delta: r.delta,
    reason: r.reason as CreditTransactionReason,
    referenceId: r.reference_id ?? undefined,
    createdAt: r.created_at,
  };
}

function rowToPurchase(r: any): StudentPurchase {
  return {
    id: r.id,
    userId: r.user_id,
    productId: r.product_id,
    ownerType: r.owner_type as OwnerType,
    ownerId: r.owner_id,
    amountPaid: Number(r.amount_paid ?? 0),
    stripePaymentId: r.stripe_payment_id ?? undefined,
    purchasedAt: r.purchased_at,
    expiresAt: r.expires_at ?? undefined,
    autoRenew: !!r.auto_renew,
  };
}

export const creditsService = {
  // Load wallets, recent transactions and purchases for the current user.
  // RLS filters: the vendor side sees its counterparty wallets via its own
  // call path (useful later for back-office).
  async load(userId: string): Promise<void> {
    const [{ data: wallets, error: we }, { data: purchases, error: pe }] = await Promise.all([
      supabase.from('credit_wallets').select('*').eq('user_id', userId),
      supabase.from('student_purchases').select('*').eq('user_id', userId),
    ]);
    if (we) { console.warn('load wallets:', we.message); return; }
    if (pe) { console.warn('load purchases:', pe.message); return; }
    walletCache.clear();
    purchaseCache.clear();
    (wallets ?? []).forEach((r: any) => walletCache.set(r.id, rowToWallet(r)));
    (purchases ?? []).forEach((r: any) => purchaseCache.set(r.id, rowToPurchase(r)));

    // Load tx history only for the wallets we just fetched — avoids exposing
    // unrelated wallets and keeps the payload small.
    const walletIds = (wallets ?? []).map((w: any) => w.id);
    if (walletIds.length > 0) {
      const { data: txs } = await supabase
        .from('credit_transactions')
        .select('*')
        .in('wallet_id', walletIds);
      txCache.clear();
      (txs ?? []).forEach((r: any) => txCache.set(r.id, rowToTx(r)));
    }

    notify();
  },

  // Wallet & balance lookups -----------------------------------------------

  getWallet(userId: string, owner: OwnerRef): CreditWallet | undefined {
    return Array.from(walletCache.values()).find(
      (w) => w.userId === userId && w.ownerType === owner.type && w.ownerId === owner.id,
    );
  },

  getBalance(userId: string, owner: OwnerRef): number {
    return this.getWallet(userId, owner)?.balance ?? 0;
  },

  // Lists every wallet a given student owns (one per vendor they bought at).
  listWalletsForUser(userId: string): CreditWallet[] {
    return Array.from(walletCache.values())
      .filter((w) => w.userId === userId && w.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  },

  listTransactionsForWallet(walletId: string): CreditTransaction[] {
    return Array.from(txCache.values())
      .filter((t) => t.walletId === walletId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  // Core mutation: applies a delta atomically via the DB function.
  // Positive delta = grant (purchase, refund). Negative delta = consume
  // (booking, expiry). Throws if the wallet would go negative.
  async applyDelta(input: {
    userId: string;
    owner: OwnerRef;
    delta: number;
    reason: CreditTransactionReason;
    referenceId?: string;
  }): Promise<CreditWallet> {
    const { data, error } = await supabase.rpc('wallet_apply_delta', {
      p_user_id: input.userId,
      p_owner_type: input.owner.type,
      p_owner_id: input.owner.id,
      p_delta: input.delta,
      p_reason: input.reason,
      p_reference_id: input.referenceId ?? null,
    });
    if (error || !data) throw new Error(error?.message ?? 'Opération crédits échouée');

    // Supabase RPC returns an object OR an array depending on runtime quirks.
    const row = Array.isArray(data) ? data[0] : data;
    const wallet = rowToWallet(row);
    walletCache.set(wallet.id, wallet);
    notify();
    return wallet;
  },

  // High-level helpers (thin wrappers around applyDelta) -------------------

  async grantFromPurchase(input: {
    userId: string;
    owner: OwnerRef;
    credits: number;
    purchaseId: string;
  }): Promise<CreditWallet> {
    return this.applyDelta({
      userId: input.userId,
      owner: input.owner,
      delta: input.credits,
      reason: 'purchase',
      referenceId: input.purchaseId,
    });
  },

  async consumeForBooking(input: {
    userId: string;
    owner: OwnerRef;
    bookingId: string;
  }): Promise<CreditWallet> {
    return this.applyDelta({
      userId: input.userId,
      owner: input.owner,
      delta: -1,
      reason: 'booking',
      referenceId: input.bookingId,
    });
  },

  async refundBooking(input: {
    userId: string;
    owner: OwnerRef;
    bookingId: string;
  }): Promise<CreditWallet> {
    return this.applyDelta({
      userId: input.userId,
      owner: input.owner,
      delta: 1,
      reason: 'refund',
      referenceId: input.bookingId,
    });
  },

  // Purchases --------------------------------------------------------------

  listPurchasesForUser(userId: string): StudentPurchase[] {
    return Array.from(purchaseCache.values())
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.purchasedAt.localeCompare(a.purchasedAt));
  },

  async recordPurchase(input: {
    userId: string;
    productId: string;
    owner: OwnerRef;
    amountPaid: number;
    stripePaymentId?: string;
    validityDays?: number;
    autoRenew?: boolean;
  }): Promise<StudentPurchase> {
    const expiresAt = input.validityDays
      ? new Date(Date.now() + input.validityDays * 86_400_000).toISOString()
      : null;

    const { data, error } = await supabase
      .from('student_purchases')
      .insert({
        user_id: input.userId,
        product_id: input.productId,
        owner_type: input.owner.type,
        owner_id: input.owner.id,
        amount_paid: input.amountPaid,
        stripe_payment_id: input.stripePaymentId ?? null,
        expires_at: expiresAt,
        auto_renew: input.autoRenew ?? false,
      })
      .select()
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Enregistrement achat échoué');

    const purchase = rowToPurchase(data);
    purchaseCache.set(purchase.id, purchase);
    notify();
    return purchase;
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
