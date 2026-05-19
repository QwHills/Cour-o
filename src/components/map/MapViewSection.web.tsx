// Web map — Leaflet + OpenStreetMap (no API key).
// Loaded lazily so a Leaflet crash doesn't take down the whole screen.

import React, { useEffect, useState } from 'react';
import type { MapViewSectionProps, MapMarker } from './MapViewSection';

// Inject Leaflet's CSS once via <link> — avoids Metro CSS-import issues.
function ensureLeafletCss() {
  if (typeof document === 'undefined') return;
  const id = 'leaflet-css';
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
  link.crossOrigin = '';
  document.head.appendChild(link);
}

export default function MapViewSection(props: MapViewSectionProps) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    ensureLeafletCss();
    setReady(true);
  }, []);

  if (failed) {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#EADFD0',
          color: '#5A4B3A',
          fontFamily: 'system-ui',
          fontSize: 14,
          padding: 24,
          textAlign: 'center',
        }}
      >
        La carte n'est pas disponible sur cette version web.<br />
        Tous les cours restent accessibles dans la liste ci-dessous.
      </div>
    );
  }

  if (!ready) {
    return <div style={{ position: 'absolute', inset: 0, background: '#EADFD0' }} />;
  }

  // Load the actual map component lazily so any import error is caught here
  // instead of crashing the whole app.
  try {
    return <LeafletMap {...props} />;
  } catch (e) {
    console.error('[MapViewSection.web] render failed', e);
    setFailed(true);
    return null;
  }
}

function LeafletMap({
  initialRegion,
  markers,
  activeMarkerId,
  onMarkerPress,
  onRegionChange,
  focusLocation,
}: MapViewSectionProps) {
  // Dynamic requires so SSR/initial-parse doesn't break if the lib isn't ready
  // @ts-ignore
  const RL = require('react-leaflet');
  // @ts-ignore
  const L = require('leaflet');

  const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = RL;

  // Fix default icon URLs (bundlers strip them)
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });

  // Airbnb-style pill: white background, soft shadow, small coloured dot for
  // the category hint, bold dark price text. Reads much cleaner than the
  // previous saturated-colour pill packed with an emoji glyph.
  function buildPillIcon(m: MapMarker) {
    const html = `
      <div style="display:flex;flex-direction:column;align-items:center;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;">
        <div style="display:flex;align-items:center;gap:6px;background:#FFFFFF;padding:6px 10px;border-radius:16px;border:1px solid rgba(26,23,20,0.08);box-shadow:0 4px 12px rgba(26,23,20,0.18),0 1px 2px rgba(26,23,20,0.06);">
          <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${m.color};"></span>
          <span style="font-size:12px;font-weight:700;color:#1A1714;letter-spacing:-0.1px;">${m.label}</span>
        </div>
        <div style="margin-top:-1px;width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid #FFFFFF;filter:drop-shadow(0 2px 1px rgba(26,23,20,0.10));"></div>
      </div>
    `;
    return L.divIcon({ html, className: 'koureo-marker', iconSize: [0, 0], iconAnchor: [30, 24] });
  }

  // Recenter the camera whenever the parent asks us to focus a new location.
  // The parent guards against the feedback loop with the viewport-aware
  // carousel by setting an "is swiping cards" flag that suppresses region
  // updates while this fly-to animation is running.
  function FocusPanner() {
    const map = useMap();
    useEffect(() => {
      if (!focusLocation) return;
      map.flyTo([focusLocation.latitude, focusLocation.longitude], map.getZoom(), {
        duration: 0.6,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [focusLocation?.latitude, focusLocation?.longitude]);
    return null;
  }

  // Reports the current viewport to the parent whenever the user finishes
  // panning or zooming. Converted from Leaflet's LatLngBounds into the
  // {lat, lng, latitudeDelta, longitudeDelta} shape that react-native-maps uses.
  function RegionReporter() {
    useMapEvents({
      moveend: (e: any) => {
        if (!onRegionChange) return;
        const map = e.target;
        const center = map.getCenter();
        const bounds = map.getBounds();
        onRegionChange({
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: bounds.getNorth() - bounds.getSouth(),
          longitudeDelta: bounds.getEast() - bounds.getWest(),
        });
      },
    });
    return null;
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
      <MapContainer
        center={[initialRegion.latitude, initialRegion.longitude]}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          subdomains={['a', 'b', 'c', 'd']}
          maxZoom={19}
          detectRetina
        />
        <RegionReporter />
        <FocusPanner />
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={[m.latitude, m.longitude]}
            icon={buildPillIcon(m)}
            eventHandlers={{ click: () => onMarkerPress?.(m.id) }}
          />
          // No <Popup> on purpose: tapping a marker should just scroll the
          // bottom carousel to the matching card, not surface a leaflet
          // popup over the map.
        ))}
      </MapContainer>
    </div>
  );
}
