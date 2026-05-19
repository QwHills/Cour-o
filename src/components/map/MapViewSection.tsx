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
}

export default function MapViewSection({
  initialRegion,
  markers,
  activeMarkerId,
  onMarkerPress,
  onRegionChange,
  focusLocation,
}: MapViewSectionProps) {
  const mapRef = useRef<MapView>(null);

  // Animate camera when the parent asks us to focus a specific location
  // (e.g. the user just swiped to a new card in the bottom carousel).
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
    // initialRegion deltas are stable; we only react to focusLocation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusLocation?.latitude, focusLocation?.longitude]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={initialRegion}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
      showsUserLocation
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
});
