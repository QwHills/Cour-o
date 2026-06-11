// Native map implementation (iOS/Android) — wraps react-native-maps.
// Web uses MapViewSection.web.tsx (Leaflet) — resolved automatically by Metro.

import React, { useEffect, useRef } from 'react';
import { Platform, StyleSheet, View, Text } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  label: string;       // the short text shown on the pill (price or "Gratuit")
  title: string;       // tooltip title
  description: string; // tooltip subtitle
  color: string;       // pill background
  icon: string;        // emoji/glyph
}

export interface MapViewSectionProps {
  initialRegion: Region;
  markers: MapMarker[];
  activeMarkerId?: string;
  onMarkerPress?: (id: string) => void;
  /** Fires when the user finishes panning/zooming the map. */
  onRegionChange?: (region: Region) => void;
  /** When set, animate the map to this point. Used to recenter on the active
   *  card when the user swipes the bottom carousel. The parent is responsible
   *  for suppressing the viewport-driven reordering while this animates to
   *  avoid feedback loops. */
  focusLocation?: { latitude: number; longitude: number } | null;
  /** Bumped by the parent every time it wants to re-trigger the fly-to,
   *  even when the destination latitude/longitude is unchanged (e.g. the
   *  user taps the "locate me" FAB twice). Without this the useEffect deps
   *  see identical primitives and skip the animation. */
  focusKey?: number;
  /** When set, render a "blue dot" at the user's current GPS position.
   *  Driven by our own locationService so we get the same dot on iOS and web
   *  without depending on iOS Core Location's `showsUserLocation` quirks. */
  userLocation?: { latitude: number; longitude: number } | null;
}

export default function MapViewSection({
  initialRegion,
  markers,
  activeMarkerId,
  onMarkerPress,
  onRegionChange,
  focusLocation,
  focusKey,
  userLocation,
}: MapViewSectionProps) {
  const mapRef = useRef<MapView>(null);

  // Animate camera when the parent asks us to focus a specific location
  // (e.g. the user just swiped to a new card in the bottom carousel, or
  // tapped the "locate me" FAB). `focusKey` is included in the deps so
  // identical-coord requests still trigger the animation.
  useEffect(() => {
    if (!focusLocation || !mapRef.current) return;
    mapRef.current.animateToRegion(
      {
        latitude: focusLocation.latitude,
        longitude: focusLocation.longitude,
        latitudeDelta: initialRegion.latitudeDelta,
        longitudeDelta: initialRegion.longitudeDelta,
      },
      600,
    );
    // initialRegion deltas are stable; we only react to focusLocation+focusKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLocation?.latitude, focusLocation?.longitude, focusKey]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      // Rendering our own blue dot below — disable the native one to avoid
      // duplicates (the iOS Core Location one was also flaky in simulator).
      showsUserLocation={false}
      showsMyLocationButton={false}
      onRegionChangeComplete={onRegionChange}
    >
      {markers.map((m) => (
        <Marker
          key={m.id}
          coordinate={{ latitude: m.latitude, longitude: m.longitude }}
          // No title/description on purpose: tapping a marker should just
          // scroll the bottom carousel to the matching card, not surface a
          // native callout balloon. The card has all the info we need.
          onPress={() => onMarkerPress?.(m.id)}
        >
          {/* Clean Airbnb-style pill: white background, soft shadow, a small
              colored dot for the category hint, bold dark price label. */}
          <View style={styles.pillWrapper}>
            <View style={styles.pill}>
              <View style={[styles.dot, { backgroundColor: m.color }]} />
              <Text style={styles.label}>{m.label}</Text>
            </View>
            <View style={styles.tip} />
          </View>
        </Marker>
      ))}

      {/* User position — drawn after course markers so it sits on top. */}
      {userLocation && (
        <Marker
          coordinate={userLocation}
          anchor={{ x: 0.5, y: 0.5 }}
          // Cannot be tapped — purely decorative.
          tracksViewChanges={false}
        >
          <View style={styles.userHalo}>
            <View style={styles.userRing}>
              <View style={styles.userDot} />
            </View>
          </View>
        </Marker>
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  pillWrapper: {
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(26,23,20,0.08)',
    shadowColor: '#1A1714',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1714',
    letterSpacing: -0.1,
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#FFFFFF',
    marginTop: -1,
  },

  // User-position marker — Apple-style: blue dot + white ring + soft halo
  userHalo: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 132, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 4,
  },
  userDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0A84FF', // iOS system blue
  },
});
