// Crash & error monitoring — Sentry wrapper.
//
// Behaviour :
//   • If `EXPO_PUBLIC_SENTRY_DSN` is empty (dev / preview), Sentry is a no-op
//     and `captureException` / `captureMessage` just log to the console. This
//     lets us call them everywhere without env-checks in the call sites.
//   • If the DSN is set, Sentry init at app boot. Errors caught by the
//     ErrorBoundary or thrown unhandled get shipped to the Sentry dashboard.
//
// To enable in production :
//   1. Create a project on https://sentry.io (Platform: React Native).
//   2. Copy the DSN.
//   3. Add `EXPO_PUBLIC_SENTRY_DSN=https://...@sentry.io/...` to .env
//      and to your Vercel environment variables.
//   4. Re-build / re-deploy.

import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const ENV = process.env.EXPO_PUBLIC_ENV ?? 'development';

let initialized = false;

export function initMonitoring(): void {
  if (initialized) return;
  initialized = true;

  if (!DSN) {
    // Dev mode: Sentry stays inert. Nothing to do.
    return;
  }

  try {
    Sentry.init({
      dsn: DSN,
      environment: ENV,
      // 10% sample rate for transaction traces in prod — keeps the free
      // plan quota reasonable while still surfacing perf regressions.
      tracesSampleRate: ENV === 'production' ? 0.1 : 1.0,
      // Don't bother Sentry with the dev playground.
      enabled: ENV !== 'development',
      // Send default PII (user IP + name when set via `setUser`).
      // Required for the user-impact graph in the Sentry UI.
      sendDefaultPii: true,
    });
  } catch (e) {
    // If Sentry init itself fails, log but don't crash the app.
    // eslint-disable-next-line no-console
    console.warn('[monitoring] Sentry init failed:', (e as Error).message);
  }
}

/**
 * Send an exception to Sentry (or log to console if no DSN).
 * Usage:
 *   try { ... } catch (e) { captureException(e, { tag: 'value' }); }
 */
export function captureException(
  err: unknown,
  context?: Record<string, string | number | boolean>,
): void {
  if (!DSN) {
    // eslint-disable-next-line no-console
    console.warn('[monitoring] captureException', err, context);
    return;
  }
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([k, v]) => scope.setTag(k, String(v)));
    }
    Sentry.captureException(err);
  });
}

/** Send a non-error message (info/warning) to Sentry. */
export function captureMessage(
  msg: string,
  level: 'info' | 'warning' | 'error' = 'info',
): void {
  if (!DSN) {
    // eslint-disable-next-line no-console
    console.warn(`[monitoring] ${level}: ${msg}`);
    return;
  }
  Sentry.captureMessage(msg, level);
}

/** Identify the current user in Sentry so errors group per-user. */
export function identifyUser(user: { id: string; email?: string; role?: string }): void {
  if (!DSN) return;
  Sentry.setUser({ id: user.id, email: user.email, segment: user.role });
}

/** Clear the user (called on sign-out). */
export function clearUser(): void {
  if (!DSN) return;
  Sentry.setUser(null);
}

// Re-export the React error boundary helper for screens that want their own
// localised boundary in addition to the global one.
export { ErrorBoundary as SentryErrorBoundary } from '@sentry/react-native';
