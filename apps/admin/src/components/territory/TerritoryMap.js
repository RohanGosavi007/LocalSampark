'use client';

import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Tooltip, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * The territory map.
 *
 * Leaflet over OpenStreetMap tiles, which is what apps/web already uses and
 * needs no API key — the repository has a Google Maps key in the backend
 * environment, but spending a keyed, billed provider on an internal admin map
 * buys nothing here and adds a secret to the browser bundle.
 *
 * ── Drawing without leaflet-draw ───────────────────────────────────────────
 *
 * Polygon editing is implemented from map click events rather than by adding
 * leaflet-draw. The plugin is a further dependency, it has its own React
 * wrapper compatibility story with react-leaflet v5, and what is needed here is
 * modest: click to place vertices, undo the last one, close the ring. Building
 * that from `useMapEvents` is about thirty lines and has no upgrade surface.
 *
 * ── Colour carries meaning, and never colour alone ─────────────────────────
 *
 * Red is a boundary that conflicts with another territory. Amber is a boundary
 * that exists but is unverified — the quarantined state, which is every
 * territory in the database today. Green is verified and permitted to attribute
 * revenue. Because roughly one man in twelve cannot reliably separate red from
 * green, each state also differs in stroke weight and dash pattern, and the
 * list beside the map states the status in words.
 */

/** Pune, matching the fallback the recommendations service uses. */
const DEFAULT_CENTER = [18.5913, 73.8987];

const STYLES = {
  verified: { color: 'var(--success)', weight: 2, fillOpacity: 0.12, dashArray: null },
  unverified: { color: 'var(--warning)', weight: 2, fillOpacity: 0.08, dashArray: '6 4' },
  conflict: { color: 'var(--danger)', weight: 3, fillOpacity: 0.28, dashArray: null },
  selected: { color: 'var(--info)', weight: 4, fillOpacity: 0.2, dashArray: null },
  drawing: { color: '#a78bfa', weight: 3, fillOpacity: 0.2, dashArray: '4 4' },
};

/**
 * GeoJSON rings to Leaflet positions.
 *
 * GeoJSON is [lng, lat] and Leaflet is [lat, lng]. Getting this backwards does
 * not throw — it silently draws the polygon somewhere in the ocean off Somalia,
 * which is the single most common bug in this entire domain and the reason the
 * conversion lives in exactly one function.
 */
function toLeafletPositions(geojson) {
  if (!geojson) return [];
  let geometry = geojson;
  if (typeof geometry === 'string') {
    try {
      geometry = JSON.parse(geometry);
    } catch {
      return [];
    }
  }
  if (geometry.type === 'Feature') geometry = geometry.geometry;
  if (!geometry || !geometry.coordinates) return [];

  const ringToPositions = (ring) => ring.map(([lng, lat]) => [lat, lng]);

  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.map((polygon) => polygon.map(ringToPositions));
  }
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.map(ringToPositions);
  }
  return [];
}

/** Leaflet positions back to a GeoJSON Polygon, closing the ring. */
export function toGeoJsonPolygon(positions) {
  if (!Array.isArray(positions) || positions.length < 3) return null;
  const ring = positions.map(([lat, lng]) => [lng, lat]);
  const [firstLng, firstLat] = ring[0];
  const [lastLng, lastLat] = ring[ring.length - 1];
  // GeoJSON requires the ring to be explicitly closed. Omitting this produces
  // a polygon most libraries accept and turf.area computes as zero.
  if (firstLng !== lastLng || firstLat !== lastLat) ring.push([firstLng, firstLat]);
  return { type: 'Polygon', coordinates: [ring] };
}

/** Captures clicks while drawing is active. */
function DrawCapture({ active, onPoint }) {
  useMapEvents({
    click(event) {
      if (!active) return;
      onPoint([event.latlng.lat, event.latlng.lng]);
    },
  });
  return null;
}

export default function TerritoryMap({
  territories = [],
  selectedId = null,
  conflictIds = [],
  drawing = false,
  drawPoints = [],
  onDrawPoint = () => {},
  onSelect = () => {},
  center = null,
  height = 520,
}) {
  const conflictSet = useMemo(() => new Set(conflictIds.map(String)), [conflictIds]);

  const shapes = useMemo(() => territories
    .map((territory) => {
      const positions = toLeafletPositions(territory.boundary_geojson);
      if (!positions || positions.length === 0) return null;

      const isConflict = conflictSet.has(String(territory.id));
      const isSelected = String(territory.id) === String(selectedId);
      const verified = territory.boundary_verified === 1 || territory.boundary_verified === true;

      let style = verified ? STYLES.verified : STYLES.unverified;
      if (isConflict) style = STYLES.conflict;
      if (isSelected) style = STYLES.selected;

      return { territory, positions, style, verified, isConflict };
    })
    .filter(Boolean), [territories, conflictSet, selectedId]);

  const mapCenter = center
    || (shapes.length > 0 && shapes[0].positions[0] && shapes[0].positions[0][0])
    || DEFAULT_CENTER;

  return (
    <div style={{ position: 'relative', height, borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid var(--line)' }}>
      <MapContainer
        center={mapCenter}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <DrawCapture active={drawing} onPoint={onDrawPoint} />

        {shapes.map(({ territory, positions, style, verified, isConflict }) => (
          <Polygon
            key={territory.id}
            positions={positions}
            pathOptions={style}
            eventHandlers={{ click: () => { if (!drawing) onSelect(territory); } }}
          >
            <Tooltip sticky>
              <div style={{ fontSize: '0.8rem' }}>
                <strong>{territory.name}</strong>
                <br />
                {territory.pincode}
                <br />
                {isConflict
                  ? 'Conflicts with the boundary being drawn'
                  : verified
                    ? 'Verified — used for GPS attribution'
                    : 'Unverified — not used for attribution'}
                {territory.franchise_name ? <><br />{`Held by ${territory.franchise_name}`}</> : null}
              </div>
            </Tooltip>
          </Polygon>
        ))}

        {drawPoints.length >= 3 ? (
          <Polygon positions={drawPoints} pathOptions={STYLES.drawing} />
        ) : null}

        {drawPoints.map((point, i) => (
          // Vertices are rendered as markers so a half-finished shape with
          // fewer than three points is still visible; a two-point polygon draws
          // nothing at all and looks like the clicks were not registered.
          <Marker key={`${point[0]}-${point[1]}-${i}`} position={point} />
        ))}
      </MapContainer>

      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          zIndex: 1000,
          background: 'rgba(15, 23, 42, 0.92)',
          border: '1px solid var(--line)',
          borderRadius: '0.5rem',
          padding: '0.6rem 0.75rem',
          fontSize: '0.72rem',
          color: 'var(--ink)',
          lineHeight: 1.7,
        }}
      >
        <div><span style={{ color: STYLES.verified.color }}>━</span> Verified — attributes revenue</div>
        <div><span style={{ color: STYLES.unverified.color }}>╍</span> Unverified — quarantined</div>
        <div><span style={{ color: STYLES.conflict.color }}>━</span> Conflicts with your drawing</div>
      </div>
    </div>
  );
}
