// Single source of truth for the user's current geo position.
//
// Behaviour:
//   - On boot (call `hydrate()`), ask the OS for permission once. If granted,
//     fetch the device position with a low-power accuracy and cache it.
//   - If the user denies permission OR the request fails, fall back to the
//     default Rennes coordinates so distance/sorting still produces something
//     reasonable instead of NaNs.
//   - `getCurrent()` is a sync read of the cache — callers that need to
//     react to changes subscribe via `onChange()`.
//
// On web, `expo-location` proxies to the browser Geolocation API which
// prompts the user inline. Same fallback path on denial.

import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface Coords {
  latitude: number;
  longitude: number;
  // `true` only when the value came from the OS — `false` while we're still
  // using the Rennes fallback. Lets the UI hide a "centered on you" badge
  // until the real position is in.
  resolved: boolean;
}

// Rennes — keep as the fallback so nothing breaks if permission is denied or
// the device has no GPS (simulator without simulated location, web on a
// desktop without geolocation, etc.).
const FALLBACK: Coords = {
  latitude: 48.1113,
  longitude: -1.68,
  resolved: false,
};

let current: Coords = FALLBACK;
let hydratePromise: Promise<Coords> | null = null;

type Listener = (c: Coords) => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l(current)); }

export const locationService = {
  /** Read the cached coords. Defaults to Rennes until `hydrate()` resolves. */
  getCurrent(): Coords {
    return current;
  },

  /**
   * Request permission + fetch position. Cheap to call multiple times — the
   * first call kicks off the OS prompt, subsequent calls reuse the result.
   * Always resolves (never throws) so callers can `await hydrate()` without
   * try/catch.
   */
  async hydrate(): Promise<Coords> {
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          return current;
        }
        // `Balanced` is plenty for "within ~50m" distance ranking. Avoid
        // `BestForNavigation` — it spins the GPS chip and drains battery.
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        current = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          resolved: true,
        };
        notify();
        return current;
      } catch (e) {
        // Simulators with no simulated location throw a Code 5 error here.
        // Keep the fallback silently so distance computations keep working.
        if (Platform.OS !== 'web') {
          console.warn('[location] hydrate failed:', (e as Error).message);
        }
        return current;
      }
    })();
    return hydratePromise;
  },

  /** Force a re-fetch (e.g. user tapped a "Re-center on me" button). */
  async refresh(): Promise<Coords> {
    hydratePromise = null;
    return this.hydrate();
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};
