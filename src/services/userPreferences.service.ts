// Per-user discovery preferences — radius caps for the activities feed, the
// promotions ribbon and the favorites list.
//
// Backed by AsyncStorage for now (one of the snappier UX surfaces, no need to
// round-trip Supabase). When we ship a real `user_preferences` table we can
// swap the persistence layer without changing callers.
//
// Defaults are tuned for a city dweller; rural users typically bump these up
// from the Profil screen.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface DiscoveryRadii {
  activitiesKm: number;
  promotionsKm: number;
  favoritesKm: number;
}

const DEFAULT_RADII: DiscoveryRadii = {
  activitiesKm: 30,
  promotionsKm: 5,
  favoritesKm: 30,
};

const STORAGE_KEY = 'koureo:user-prefs:v1';

// In-memory cache so synchronous getters (used by hot UI paths like MapScreen)
// don't need an await. Hydrated on first call to hydrate().
let cache: DiscoveryRadii = DEFAULT_RADII;
let hydrated = false;
let hydratePromise: Promise<DiscoveryRadii> | null = null;

type Listener = (r: DiscoveryRadii) => void;
const listeners = new Set<Listener>();
function notify() { listeners.forEach((l) => l(cache)); }

// Clamp helpers — keep the persisted value sane even if a future build
// stores a different shape or a stale slider value sneaks through. Values
// keep one decimal of precision so the promos radius can express "500 m"
// (0.5 km) without rounding to 1 km.
function clamp(km: number, min: number, max: number): number {
  if (!Number.isFinite(km)) return min;
  const bounded = Math.max(min, Math.min(max, km));
  return Math.round(bounded * 10) / 10;
}

function sanitize(r: Partial<DiscoveryRadii>): DiscoveryRadii {
  return {
    activitiesKm: clamp(r.activitiesKm ?? DEFAULT_RADII.activitiesKm, 0.5, 200),
    promotionsKm: clamp(r.promotionsKm ?? DEFAULT_RADII.promotionsKm, 0.5, 200),
    favoritesKm: clamp(r.favoritesKm ?? DEFAULT_RADII.favoritesKm, 0.5, 500),
  };
}

export const userPreferencesService = {
  /** Sync read — returns defaults until hydrate() resolves on first launch. */
  get(): DiscoveryRadii {
    return cache;
  },

  /** Load persisted values once. Safe to call multiple times. */
  async hydrate(): Promise<DiscoveryRadii> {
    if (hydrated) return cache;
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) cache = sanitize(JSON.parse(raw));
      } catch {
        // Keep defaults on any error.
      }
      hydrated = true;
      notify();
      return cache;
    })();
    return hydratePromise;
  },

  /** Update one or several radii and persist atomically. */
  async update(patch: Partial<DiscoveryRadii>): Promise<DiscoveryRadii> {
    cache = sanitize({ ...cache, ...patch });
    notify();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (e) {
      console.warn('[prefs] save failed', (e as Error).message);
    }
    return cache;
  },

  /** Reset to the shipping defaults. */
  async reset(): Promise<DiscoveryRadii> {
    return this.update(DEFAULT_RADII);
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

export { DEFAULT_RADII };
