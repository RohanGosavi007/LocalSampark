'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';
import {
  validateBoundary,
  snapPoint,
  closeRing,
} from '@localsampark/shared/territoryTopology';

/**
 * Territory management.
 *
 * Replaces a read-only list that called `/admin/territories` and rendered a
 * table. This is the working surface: a map, boundary drawing with live
 * conflict detection, exclusive franchise assignment, bulk pincode assignment,
 * and the coverage-gap list that says where to sell the next franchise.
 *
 * ── The banner at the top is the most important thing on this screen ────────
 *
 * Every territory boundary in the database is a 5 km circle generated around a
 * fabricated centroid — territories sharing a pincode prefix are scattered over
 * ~900 km. Boundaries are therefore quarantined: they are drawn, they are
 * edited, they are validated for overlap, and they do not attribute revenue
 * until a super admin verifies them.
 *
 * An operator looking at a map full of polygons will reasonably assume those
 * polygons are deciding who gets paid. They are not, and the banner says so
 * with the actual count, because a UI that looks functional while a core
 * mechanism is switched off is how a silent misconfiguration survives for
 * months.
 */

// Leaflet touches `window` at import time, so it cannot render on the server.
const TerritoryMap = dynamic(() => import('../territory/TerritoryMap'), {
  ssr: false,
  loading: () => (
    <div style={{ height: 520, display: 'grid', placeItems: 'center', color: '#64748b', border: '1px solid #334155', borderRadius: '0.75rem' }}>
      Loading map…
    </div>
  ),
});

const card = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
const btn = {
  padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff',
  borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
};
const btnGhost = { ...btn, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1' };
const btnDanger = { ...btn, background: '#dc2626' };
const label = { color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 };
const mono = { fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' };
const muted = { color: '#64748b', fontSize: '0.75rem' };
const input = {
  padding: '0.6rem', background: '#0f172a', border: '1px solid #334155',
  borderRadius: '0.5rem', color: '#e2e8f0', width: '100%',
};

const VIEWS = [
  ['map', 'Map & Boundaries'],
  ['assign', 'Franchise Assignment'],
  ['gaps', 'Coverage Gaps'],
];

function int(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function pct(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function Stat({ title, value, caption, color }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ ...mono, fontSize: '1.6rem', fontWeight: 800, color: color || '#e2e8f0', marginTop: '0.4rem' }}>{value}</div>
      {caption ? <div style={{ ...muted, marginTop: '0.2rem' }}>{caption}</div> : null}
    </div>
  );
}

export default function TerritoryTab({ API_BASE, authHeaders }) {
  const [view, setView] = useState('map');
  const [territories, setTerritories] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [gaps, setGaps] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [onlyUnassigned, setOnlyUnassigned] = useState(false);

  const [drawing, setDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [validation, setValidation] = useState(null);

  const [bulkPartner, setBulkPartner] = useState('');
  const [bulkPincodes, setBulkPincodes] = useState('');
  const [bulkResult, setBulkResult] = useState(null);

  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: '300', include_boundary: 'true' });
      if (search.trim()) params.set('q', search.trim());
      if (onlyUnassigned) params.set('unassigned', 'true');

      const [list, cov] = await Promise.all([
        fetchJson(`${API_BASE}/territories/admin/list?${params}`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/territories/admin/coverage`, { headers: authHeaders() }),
      ]);
      setTerritories(list.territories || []);
      setCoverage(cov);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders, search, onlyUnassigned]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (view !== 'gaps') return;
    fetchJson(`${API_BASE}/territories/admin/gaps?limit=100`, { headers: authHeaders() })
      .then((data) => setGaps(data.gaps || []))
      .catch(setError);
  }, [view, API_BASE, authHeaders]);

  useEffect(() => {
    if (view !== 'assign') return;
    fetchJson(`${API_BASE}/franchise/all`, { headers: authHeaders() })
      .then((data) => setPartners(data.partners || data.data || (Array.isArray(data) ? data : [])))
      .catch(() => setPartners([]));
  }, [view, API_BASE, authHeaders]);

  /**
   * Validates the drawing as it is made.
   *
   * Debounced and fired on every vertex from the third onward, so a collision
   * shows up while the operator is still drawing rather than as a rejection
   * after they press save. The server re-validates on save regardless — this is
   * feedback, not enforcement.
   */
  /**
   * The territories the validator checks against and the snapper snaps to.
   *
   * Only active ones with a boundary: an inactive territory is not competing
   * for the ground, and snapping to a retired boundary would align the new one
   * to geometry nobody is using.
   */
  const neighbours = useMemo(
    () => (territories || [])
      .filter((t) => t.is_active && (t.boundary_geojson || t.geojson))
      .map((t) => ({
        id: t.id,
        name: t.name,
        pincode: t.pincode,
        geojson: t.boundary_geojson || t.geojson,
      })),
    [territories]
  );

  useEffect(() => {
    if (!drawing || drawPoints.length < 3) {
      setValidation(null);
      return;
    }

    // Validated in the browser, synchronously, with the same module the server
    // runs on save. This used to POST to /validate-boundary on every vertex
    // from the third onward — one request per click, each carrying the whole
    // polygon, to answer a question the browser can answer itself. The server
    // still re-validates on save, because a browser is not an authority; this
    // is feedback, and feedback should not cost a round trip.
    const ring = closeRing(drawPoints.map((p) => [p.lng, p.lat]));
    const result = validateBoundary(
      { type: 'Polygon', coordinates: [ring] },
      neighbours,
      { excludeId: selected?.id || null }
    );

    setValidation({
      valid: result.valid,
      errors: result.errors,
      conflicts: result.conflicts,
      area_km2: result.areaKm2,
    });
  }, [drawing, drawPoints, selected, neighbours]);

  const conflictIds = useMemo(
    () => (validation?.conflicts || []).map((c) => c.territory_id),
    [validation]
  );

  const saveBoundary = async (verified) => {
    if (!selected) return;
    setBusy('boundary');
    setNotice(null);
    try {
      const { toGeoJsonPolygon } = await import('../territory/TerritoryMap');
      const geojson = toGeoJsonPolygon(drawPoints);
      if (!geojson) {
        setNotice('A boundary needs at least three points.');
        return;
      }
      const result = await fetchJson(`${API_BASE}/territories/admin/${selected.id}/boundary`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ geojson, verified, source: 'admin_drawn' }),
      });
      setNotice(result.message);
      setDrawing(false);
      setDrawPoints([]);
      setValidation(null);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const runBulkAssign = async () => {
    setBusy('bulk');
    setBulkResult(null);
    try {
      const pincodes = bulkPincodes.split(/[\s,;\n]+/).filter(Boolean);
      const result = await fetchJson(`${API_BASE}/territories/admin/assign-bulk`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ franchise_partner_id: bulkPartner, pincodes }),
      });
      setBulkResult(result);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const releaseTerritory = async (territoryId) => {
    setBusy('release');
    try {
      await fetchJson(`${API_BASE}/territories/admin/${territoryId}/assignment`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ reason: 'released from admin console' }),
      });
      setNotice('Territory released back to the platform pool.');
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const quarantined = coverage ? coverage.territories - coverage.boundaries_verified : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <TabError error={error} onRetry={load} />

      {coverage && quarantined > 0 ? (
        <div style={{ ...card, borderColor: '#f59e0b', background: '#251a05' }}>
          <div style={{ color: '#fbbf24', fontWeight: 800, marginBottom: '0.4rem' }}>
            {int(quarantined)} of {int(coverage.territories)} boundaries are unverified and do not attribute revenue
          </div>
          <div style={{ color: '#fcd34d', fontSize: '0.82rem', lineHeight: 1.6 }}>
            The stored boundaries are 5&nbsp;km circles generated around centroids that are uniform random
            noise — territories sharing a pincode prefix sit ~900&nbsp;km apart where reality is under 60&nbsp;km.
            GPS attribution is switched off for them, and franchise revenue is attributed by <strong>pincode</strong>,
            which is genuine data here. Draw or import a real boundary and have a super admin verify it to
            turn GPS attribution on for that territory.
          </div>
        </div>
      ) : null}

      {notice ? (
        <div style={{ ...card, borderColor: '#4f46e5', background: '#1e1b4b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ color: '#c7d2fe', fontSize: '0.85rem' }}>{notice}</span>
          <button type="button" style={btnGhost} onClick={() => setNotice(null)}>Dismiss</button>
        </div>
      ) : null}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <Stat title="Territories" value={int(coverage?.territories)} />
        <Stat title="Assigned" value={int(coverage?.assigned)} caption="held by a franchise" color="#22c55e" />
        <Stat title="Unassigned" value={int(coverage?.unassigned)} caption="platform pool" color="#f59e0b" />
        <Stat
          title="Verified boundaries"
          value={pct(coverage?.boundary_coverage)}
          caption="share that can attribute by GPS"
          color={coverage?.boundaries_verified > 0 ? '#22c55e' : '#ef4444'}
        />
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {VIEWS.map(([id, text]) => (
          <button key={id} type="button" style={view === id ? btn : btnGhost} onClick={() => setView(id)}>
            {text}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" style={btnGhost} onClick={load}>Reload</button>
      </div>

      {view === 'map' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '1rem' }}>
          <div>
            <TerritoryMap
              territories={territories}
              selectedId={selected?.id}
              conflictIds={conflictIds}
              drawing={drawing}
              drawPoints={drawPoints}
              onDrawPoint={(point) => {
                // Snap as the point is placed, so the operator sees where it
                // actually landed and can undo it. Drawing a boundary beside an
                // existing one by eye leaves either a sliver of overlap or — far
                // worse — a sliver of gap: a black hole with no franchise
                // assigned, where orders resolve to nothing and nothing errors.
                const snapped = snapPoint(point, neighbours, { excludeId: selected?.id || null });
                setDrawPoints((points) => [...points, { lng: snapped.lng, lat: snapped.lat }]);
                if (snapped.snapped) {
                  setNotice(`Snapped to an existing ${snapped.to.kind} (${Math.round(snapped.distanceMetres)} m away).`);
                }
              }}
              onSelect={(territory) => { setSelected(territory); setDrawPoints([]); setDrawing(false); }}
            />

            {drawing ? (
              <div style={{ ...card, marginTop: '0.75rem', borderColor: '#a78bfa' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ color: '#ddd6fe', fontSize: '0.85rem' }}>
                    Click the map to place points. {drawPoints.length} placed
                    {drawPoints.length < 3 ? ' (at least 3 needed)' : ''}.
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button type="button" style={btnGhost} onClick={() => setDrawPoints((p) => p.slice(0, -1))}>
                      Undo point
                    </button>
                    <button type="button" style={btnGhost} onClick={() => { setDrawing(false); setDrawPoints([]); setValidation(null); }}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      style={btn}
                      disabled={busy === 'boundary' || drawPoints.length < 3 || validation?.valid === false}
                      onClick={() => saveBoundary(false)}
                    >
                      Save unverified
                    </button>
                    <button
                      type="button"
                      style={{ ...btn, background: '#16a34a' }}
                      disabled={busy === 'boundary' || drawPoints.length < 3 || validation?.valid === false}
                      onClick={() => saveBoundary(true)}
                    >
                      Save &amp; verify
                    </button>
                  </div>
                </div>

                {validation ? (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.82rem' }}>
                    {validation.valid ? (
                      <span style={{ color: '#22c55e' }}>
                        No conflicts. Area {Number(validation.area_km2 || 0).toFixed(2)} km².
                      </span>
                    ) : (
                      <div style={{ color: '#fca5a5' }}>
                        {/* Shape problems first: an operator whose outline crosses
                            itself does not also need to hear about overlaps. */}
                        {(validation.errors || []).map((e) => (
                          <div key={e.code}><strong>{e.message}</strong></div>
                        ))}

                        {(validation.conflicts || []).length > 0 ? (
                          <strong>
                            {`Overlaps ${validation.conflicts.length} existing territor${validation.conflicts.length === 1 ? 'y' : 'ies'}`}
                          </strong>
                        ) : null}

                        {(validation.conflicts || []).slice(0, 5).map((c) => (
                          <div key={c.territory_id} style={{ ...muted, color: '#fca5a5' }}>
                            {c.name} ({c.pincode}) —{' '}
                            {c.code === 'overlap'
                              ? `${c.overlap_km2} km² of shared ground`
                              : 'this territory’s boundary could not be read, so an overlap cannot be ruled out'}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={card}>
              <div style={{ ...label, marginBottom: '0.5rem' }}>Find a territory</div>
              <input
                style={input}
                value={search}
                placeholder="name or pincode"
                onChange={(e) => setSearch(e.target.value)}
              />
              <label style={{ ...muted, display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.6rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={onlyUnassigned}
                  onChange={(e) => setOnlyUnassigned(e.target.checked)}
                />
                Unassigned only
              </label>
            </div>

            {selected ? (
              <div style={card}>
                <div style={{ color: '#e2e8f0', fontWeight: 800 }}>{selected.name}</div>
                <div style={{ ...mono, ...muted, marginTop: '0.2rem' }}>{selected.pincode}</div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: 1.8 }}>
                  <div>
                    Boundary:{' '}
                    {selected.boundary_verified
                      ? <span style={{ color: '#22c55e', fontWeight: 700 }}>verified</span>
                      : <span style={{ color: '#f59e0b', fontWeight: 700 }}>unverified — not attributing</span>}
                  </div>
                  <div>
                    Franchise:{' '}
                    {selected.franchise_name
                      ? <span style={{ color: '#e2e8f0' }}>{selected.franchise_name}</span>
                      : <span style={muted}>unassigned</span>}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button type="button" style={btn} onClick={() => { setDrawing(true); setDrawPoints([]); }}>
                    Redraw boundary
                  </button>
                  {selected.franchise_partner_id ? (
                    <button
                      type="button"
                      style={btnDanger}
                      disabled={busy === 'release'}
                      onClick={() => releaseTerritory(selected.id)}
                    >
                      Release
                    </button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div style={{ ...card, ...muted }}>
                Select a territory on the map to edit its boundary or assignment.
              </div>
            )}

            <div style={{ ...card, maxHeight: 260, overflowY: 'auto' }}>
              <div style={{ ...label, marginBottom: '0.5rem' }}>
                {loading ? 'Loading…' : `${territories.length} shown`}
              </div>
              {territories.slice(0, 100).map((territory) => (
                <button
                  key={territory.id}
                  type="button"
                  onClick={() => { setSelected(territory); setDrawing(false); setDrawPoints([]); }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', background: 'transparent',
                    border: 'none', borderBottom: '1px solid #1e293b', padding: '0.5rem 0',
                    color: String(territory.id) === String(selected?.id) ? '#38bdf8' : '#cbd5e1',
                    cursor: 'pointer', fontSize: '0.82rem',
                  }}
                >
                  <span style={mono}>{territory.pincode}</span> {territory.name}
                  {territory.franchise_partner_id ? null : <span style={{ ...muted, marginLeft: '0.4rem' }}>· unassigned</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === 'assign' ? (
        <div style={card}>
          <div style={{ ...label, marginBottom: '0.5rem' }}>Bulk assign pincodes to a franchise</div>
          <div style={{ ...muted, marginBottom: '1rem' }}>
            Territories are exclusive: a pincode already held by another active franchise is reported
            rather than reassigned. Release or transfer it first.
          </div>

          <div style={{ display: 'grid', gap: '0.75rem', maxWidth: 620 }}>
            <select style={input} value={bulkPartner} onChange={(e) => setBulkPartner(e.target.value)}>
              <option value="">Select a franchise partner…</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.territory_name || partner.id} ({partner.status})
                </option>
              ))}
            </select>

            <textarea
              style={{ ...input, minHeight: 120, ...mono }}
              value={bulkPincodes}
              placeholder={'411001\n411002 411003\n411004, 411005'}
              onChange={(e) => setBulkPincodes(e.target.value)}
            />

            <button
              type="button"
              style={btn}
              disabled={!bulkPartner || !bulkPincodes.trim() || busy === 'bulk'}
              onClick={runBulkAssign}
            >
              {busy === 'bulk' ? 'Assigning…' : 'Assign'}
            </button>
          </div>

          {bulkResult ? (
            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ color: '#22c55e', fontWeight: 700 }}>
                {bulkResult.assigned_count} assigned
              </div>
              {bulkResult.failed_count > 0 ? (
                <>
                  <div style={{ color: '#fca5a5', fontWeight: 700, marginTop: '0.5rem' }}>
                    {bulkResult.failed_count} not assigned
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: '0.4rem' }}>
                    <tbody>
                      {bulkResult.failed.map((row, i) => (
                        <tr key={`${row.pincode}-${i}`} style={{ borderTop: '1px solid #334155' }}>
                          <td style={{ padding: '0.35rem 0', ...mono, color: '#e2e8f0', width: 120 }}>{String(row.pincode)}</td>
                          <td style={{ padding: '0.35rem 0', color: '#94a3b8' }}>{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {view === 'gaps' ? (
        <div style={card}>
          <div style={{ ...label, marginBottom: '0.5rem' }}>Areas the platform was asked for and cannot serve</div>
          <div style={{ ...muted, marginBottom: '1rem' }}>
            Sorted by demand, weighting a partner enquiry as five requests. This is the order in which
            franchises are worth selling.
          </div>

          {gaps.length === 0 ? (
            <div style={muted}>No coverage gaps recorded yet.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                  <th style={{ padding: '0.5rem 0' }}>Pincode</th>
                  <th style={{ padding: '0.5rem 0' }}>Territory</th>
                  <th style={{ padding: '0.5rem 0' }}>Requests</th>
                  <th style={{ padding: '0.5rem 0' }}>Partner enquiries</th>
                  <th style={{ padding: '0.5rem 0' }}>Last asked</th>
                </tr>
              </thead>
              <tbody>
                {gaps.map((gap) => (
                  <tr key={gap.id} style={{ borderTop: '1px solid #334155' }}>
                    <td style={{ padding: '0.5rem 0', ...mono, color: '#e2e8f0' }}>{gap.pincode}</td>
                    <td style={{ padding: '0.5rem 0', color: '#cbd5e1' }}>{gap.territory_name || <span style={muted}>no territory</span>}</td>
                    <td style={{ padding: '0.5rem 0', ...mono }}>{int(gap.request_count)}</td>
                    <td style={{ padding: '0.5rem 0', ...mono, color: Number(gap.interest_count) > 0 ? '#22c55e' : undefined }}>
                      {int(gap.interest_count)}
                    </td>
                    <td style={{ padding: '0.5rem 0', ...muted }}>{gap.last_requested_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
