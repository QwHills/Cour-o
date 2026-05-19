// Referral code capture — reads `?ref=SOMECODE` from the URL (web) or a
// deep-link equivalent, and stashes it in storage so it's available when the
// user eventually signs up.
//
// Usage:
//   - captureReferralFromUrl() is called once on app boot (App.tsx).
//   - readCapturedReferral() is called during signUp to attach the code.
//
// Codes are scoped per-device / browser. Cleared after successful signup.

const KEY = 'koureo_referral_code';
// Legacy key from when the brand was "Couréo". Kept for one-shot migration so
// users who captured a referral pre-rename don't lose it. Safe to delete after
// a few weeks of release.
const LEGACY_KEY = 'coureo_referral_code';

// Best-effort storage: prefer localStorage on web, fall back to in-memory.
let memoryStore: string | null = null;

function storage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  return null;
}

// Move a value stored under LEGACY_KEY → KEY (one-shot, idempotent).
function migrateLegacyKey(): void {
  const s = storage();
  if (!s) return;
  try {
    if (s.getItem(KEY)) return; // new key already populated, nothing to do
    const legacy = s.getItem(LEGACY_KEY);
    if (legacy) {
      s.setItem(KEY, legacy);
      s.removeItem(LEGACY_KEY);
    }
  } catch {
    // no-op
  }
}

export function captureReferralFromUrl(): void {
  if (typeof window === 'undefined' || !window.location) return;
  migrateLegacyKey();
  try {
    const url = new URL(window.location.href);
    const ref = url.searchParams.get('ref');
    if (!ref) return;
    const s = storage();
    if (s) s.setItem(KEY, ref);
    else memoryStore = ref;
    // Clean the URL so refreshing doesn't re-capture a different one
    url.searchParams.delete('ref');
    window.history.replaceState({}, '', url.toString());
  } catch {
    // no-op
  }
}

export function readCapturedReferral(): string | null {
  migrateLegacyKey();
  const s = storage();
  if (s) return s.getItem(KEY);
  return memoryStore;
}

export function clearCapturedReferral(): void {
  const s = storage();
  if (s) {
    s.removeItem(KEY);
    s.removeItem(LEGACY_KEY); // belt-and-suspenders cleanup
  }
  memoryStore = null;
}
