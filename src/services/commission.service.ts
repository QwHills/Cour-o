// Commission service — reads the active platform commission from the
// `commissions` Supabase table (single source of truth), with a hardcoded
// fallback so the app keeps working before the first network round-trip.
//
// Lifecycle :
//   1. Module load → `COMMISSION_CONFIG` defaults to 12% (fallback)
//   2. `loadActiveCommission()` called at app boot → overrides the export
//      with the active row from DB and notifies listeners
//   3. Screens that display the commission can subscribe via `useCommission()`
//      to re-render when the load completes
//
// Why `export let` + listeners instead of just a getter ?
//   - ESM gives live bindings, so existing call sites (`COMMISSION_CONFIG`)
//     pick up the new value automatically once it's reassigned.
//   - The listeners only matter for already-rendered React components that
//     need to refresh visually after the async load.

import { CommissionConfig } from '../types/domain';
import { supabase } from './supabase/client';

// ────────────────────────────────────────────────────────────────────────────
// Fallback used until the DB load resolves. Matches the seed-default row in
// public.commissions so a brand-new install behaves identically.
// ────────────────────────────────────────────────────────────────────────────
const FALLBACK_CONFIG: CommissionConfig = {
  type: 'percent',
  percent: 12,
};

// Mutable export — the active commission. Anyone importing this gets a live
// binding (ESM behaviour), so when we reassign below, every reader sees the
// fresh value on their next access without needing to re-import.
export let COMMISSION_CONFIG: CommissionConfig = { ...FALLBACK_CONFIG };

// ────────────────────────────────────────────────────────────────────────────
// Listeners (for React components that need to re-render after the load)
// ────────────────────────────────────────────────────────────────────────────
type Listener = () => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l()); }

export function onCommissionChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ────────────────────────────────────────────────────────────────────────────
// Loader — call once at app boot. Safe to re-run; the latest active row
// always wins.
// ────────────────────────────────────────────────────────────────────────────
let loadPromise: Promise<void> | null = null;

export function loadActiveCommission(): Promise<void> {
  if (loadPromise) return loadPromise; // de-dupe concurrent calls
  loadPromise = (async () => {
    const { data, error } = await supabase
      .from('commissions')
      .select('type, percent, fixed_amount, valid_to')
      .eq('active', true)
      .order('valid_from', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('[commission] load failed, keeping fallback:', error.message);
      return;
    }
    if (!data) {
      console.warn('[commission] no active row found, keeping fallback 12%');
      return;
    }

    // Honour valid_to if set — skip rows that have expired.
    if (data.valid_to && new Date(data.valid_to).getTime() < Date.now()) {
      console.warn('[commission] active row expired, keeping fallback');
      return;
    }

    const next: CommissionConfig = {
      type: data.type,
      percent: data.percent != null ? Number(data.percent) : undefined,
      fixedAmount: data.fixed_amount != null ? Number(data.fixed_amount) : undefined,
    };
    COMMISSION_CONFIG = next;
    notify();
  })().catch((e) => {
    console.warn('[commission] unexpected loader error:', (e as Error).message);
  });
  return loadPromise;
}

/** Force a reload (e.g. after an admin updates the rate). */
export function refreshActiveCommission(): Promise<void> {
  loadPromise = null;
  return loadActiveCommission();
}

// ────────────────────────────────────────────────────────────────────────────
// Pure helpers — unchanged API, just always reads the live binding by default.
// ────────────────────────────────────────────────────────────────────────────

export interface CommissionBreakdown {
  total: number;
  commissionAmount: number;
  proAmount: number;
  config: CommissionConfig;
}

export function calculateCommission(
  price: number,
  config: CommissionConfig = COMMISSION_CONFIG,
): CommissionBreakdown {
  // Free classes: no commission, no payment
  if (price <= 0) {
    return { total: 0, commissionAmount: 0, proAmount: 0, config };
  }

  let commissionAmount = 0;

  if (config.type === 'fixed' && config.fixedAmount) {
    commissionAmount = config.fixedAmount;
  } else if (config.type === 'percent' && config.percent) {
    commissionAmount = (price * config.percent) / 100;
  } else if (config.type === 'both') {
    commissionAmount =
      (config.fixedAmount ?? 0) + (price * (config.percent ?? 0)) / 100;
  }

  commissionAmount = Math.round(commissionAmount * 100) / 100;
  const proAmount = Math.round((price - commissionAmount) * 100) / 100;

  return {
    total: price,
    commissionAmount,
    proAmount,
    config,
  };
}

export function formatCommissionLabel(
  config: CommissionConfig = COMMISSION_CONFIG,
): string {
  if (config.type === 'percent') return `${config.percent}%`;
  if (config.type === 'fixed') return `${config.fixedAmount?.toFixed(2)}€`;
  return `${config.fixedAmount?.toFixed(2)}€ + ${config.percent}%`;
}
