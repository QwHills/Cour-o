// Lightweight geocoder backed by OpenStreetMap Nominatim — no API key, free
// for low-volume use. We only call it once per teacher signup (and any time
// the prof edits their address on the web admin), well below the 1 req/s
// rate limit. If the network or the service flakes we fall back to a sane
// default (Rennes) so the user can still finish signup; they can correct the
// position later from the web admin.

import { Platform } from 'react-native';

export interface GeocodedAddress {
  latitude: number;
  longitude: number;
  /** Whether the position was resolved by Nominatim. `false` = fallback. */
  resolved: boolean;
  /** Best human-readable label Nominatim returned (for confirmation UI). */
  displayName?: string;
}

const FALLBACK: GeocodedAddress = {
  latitude: 48.1113,
  longitude: -1.68,
  resolved: false,
};

export async function geocodeAddress(address: string): Promise<GeocodedAddress> {
  const query = address.trim();
  if (!query) return FALLBACK;

  try {
    const url =
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=` +
      encodeURIComponent(query);
    const res = await fetch(url, {
      headers: {
        // Nominatim asks for a descriptive User-Agent. Best-effort — browsers
        // ignore custom User-Agent headers, but it doesn't break the call.
        'User-Agent': `koureo-app/${Platform.OS}`,
        'Accept': 'application/json',
      },
    });
    if (!res.ok) return FALLBACK;
    const json = (await res.json()) as Array<{ lat: string; lon: string; display_name?: string }>;
    if (!Array.isArray(json) || json.length === 0) return FALLBACK;
    const [first] = json;
    const latitude = parseFloat(first.lat);
    const longitude = parseFloat(first.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return FALLBACK;
    return {
      latitude,
      longitude,
      resolved: true,
      displayName: first.display_name,
    };
  } catch {
    return FALLBACK;
  }
}
