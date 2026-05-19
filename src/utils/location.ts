// Location privacy — mask exact addresses until booking is confirmed
// Similar to Airbnb model: neighborhood shown, exact address after booking

// Rennes neighborhoods — coordinates of their approximate centers
type Neighborhood = { name: string; lat: number; lng: number };

const RENNES_NEIGHBORHOODS: Neighborhood[] = [
  { name: 'Centre-ville',            lat: 48.1113, lng: -1.6800 },
  { name: 'Sainte-Anne',             lat: 48.1143, lng: -1.6807 },
  { name: 'Place des Lices',         lat: 48.1118, lng: -1.6827 },
  { name: 'République',              lat: 48.1099, lng: -1.6786 },
  { name: 'Saint-Georges',           lat: 48.1125, lng: -1.6770 },
  { name: 'Thabor',                  lat: 48.1130, lng: -1.6720 },
  { name: 'Gare',                    lat: 48.1036, lng: -1.6729 },
  { name: 'Colombier',               lat: 48.1055, lng: -1.6770 },
  { name: 'Sud-Gare',                lat: 48.0985, lng: -1.6744 },
  { name: 'Jeanne d\'Arc',           lat: 48.1155, lng: -1.6680 },
  { name: 'Bourg-l\'Évesque',        lat: 48.1150, lng: -1.6920 },
  { name: 'Villejean',               lat: 48.1255, lng: -1.7001 },
  { name: 'Beaulieu',                lat: 48.1186, lng: -1.6370 },
  { name: 'Maurepas',                lat: 48.1280, lng: -1.6591 },
  { name: 'Cleunay',                 lat: 48.0990, lng: -1.7000 },
  { name: 'Sainte-Thérèse',          lat: 48.0975, lng: -1.6760 },
  { name: 'Blosne',                  lat: 48.0875, lng: -1.6655 },
  { name: 'Jardin des Plantes',      lat: 48.1168, lng: -1.6774 },
];

/**
 * Find the closest neighborhood for given coordinates
 */
export function findNeighborhood(lat: number, lng: number): string {
  let closest = RENNES_NEIGHBORHOODS[0]!;
  let minDist = Infinity;
  for (const n of RENNES_NEIGHBORHOODS) {
    const d = Math.pow(n.lat - lat, 2) + Math.pow(n.lng - lng, 2);
    if (d < minDist) {
      minDist = d;
      closest = n;
    }
  }
  return closest.name;
}

/**
 * Returns a fuzzy label like "Quartier Sainte-Anne · Rennes"
 */
export function maskAddress(address: string, lat?: number, lng?: number): string {
  const parts = address.split(',').map((s) => s.trim());
  const city = (parts[parts.length - 1] ?? 'Rennes').replace(/\d{5}\s?/, '').trim() || 'Rennes';

  if (typeof lat === 'number' && typeof lng === 'number') {
    const neighborhood = findNeighborhood(lat, lng);
    return `${neighborhood} · ${city}`;
  }

  return `Centre-ville · ${city}`;
}

/**
 * Add random offset to coordinates (±200m) for privacy
 * Consistent per teacherId so the pin doesn't jump around
 */
export function fuzzyCoordinates(
  lat: number,
  lng: number,
  seed: string
): { latitude: number; longitude: number } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const latOffset = ((hash % 40) - 20) * 0.0001;
  const lngOffset = (((hash >> 8) % 40) - 20) * 0.0001;
  return {
    latitude: lat + latOffset,
    longitude: lng + lngOffset,
  };
}

/**
 * Great-circle distance between two coordinates, in kilometres.
 * Standard haversine formula. Accurate enough for "is this within X km?"
 * UX checks (sub-1% error for distances < 1000 km).
 */
export function distanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6371; // Earth radius (km)
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Is a coordinate inside a viewport defined by {center, deltas} ?
 * Delta values come from react-native-maps' Region object.
 */
export function isInRegion(
  lat: number,
  lng: number,
  region: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number },
): boolean {
  const halfLat = region.latitudeDelta / 2;
  const halfLng = region.longitudeDelta / 2;
  return (
    lat >= region.latitude - halfLat &&
    lat <= region.latitude + halfLat &&
    lng >= region.longitude - halfLng &&
    lng <= region.longitude + halfLng
  );
}

/**
 * Check if user has a confirmed booking for this class/teacher
 */
export function hasConfirmedBooking(
  userId: string,
  teacherId: string,
  bookings: Array<{ userId: string; teacherId: string; status: string }>
): boolean {
  return bookings.some(
    (b) =>
      b.userId === userId &&
      b.teacherId === teacherId &&
      (b.status === 'confirmed' || b.status === 'completed')
  );
}
