// Default entry — re-exports based on platform.
// Metro's platform-specific resolution picks:
//   * stripePlatform.native.tsx on iOS/Android
//   * stripePlatform.web.tsx    on web
//
// This file itself is never bundled (the platform-specific one wins), but we
// keep it here so the import path `./stripePlatform` resolves in TypeScript.

export { StripeProvider, useStripe } from './stripePlatform.native';
