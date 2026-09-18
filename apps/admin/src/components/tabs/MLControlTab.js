'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

/**
 * ML Control Center.
 *
 * Every weight, threshold and switch the ranking engine reads is an
 * admin_config row, and this is the surface that edits them. Nothing in the
 * scoring path uses a hardcoded constant, so there is no ML behaviour that is
 * not reachable from this panel.
 *
 * It deliberately does NOT fabricate numbers when a fetch fails. The two tabs
 * this sits beside both used to render invented figures on error — ₹79,500 of
 * GMV, three CRM leads with phone numbers — styled identically to real data. A
 * made-up CTR is worse than a missing one: it is the input to a decision about
 * whether the recommender is working.
 */

const card = {
  background: 'var(--surface-1)',
  padding: '1.5rem',
  borderRadius: '1rem',
  border: '1px solid var(--line)',
};

const btnPrimary = {
  padding: '0.6rem 1.2rem',
  background: 'var(--accent)',
  border: 'none',
  color: 'var(--on-solid)',
  borderRadius: '0.5rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.85rem',
};

const btnDanger = { ...btnPrimary, background: 'var(--danger)' };
const btnGhost = {
  ...btnPrimary,
  background: 'transparent',
  border: '1px solid var(--line-strong)',
  color: 'var(--ink)',
};

const label = { color: 'var(--ink-muted)', fontSize: '0.8rem', fontWeight: 600 };
const mono = { fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' };

const WEIGHT_LABELS = {
  ml_w_dist: 'Proximity',
  ml_w_sim: 'Content similarity',
  ml_w_pop: 'Rating (Wilson bound)',
  ml_w_rec: 'Listing freshness',
  ml_w_ctx: 'Time of day',
  ml_w_cf: 'Collaborative',
};

const SURFACES = [
  ['ml_enabled_shops', 'Shops'],
  ['ml_enabled_services', 'Services'],
  ['ml_enabled_jobs', 'Jobs'],
  ['ml_enabled_marketplace', 'Marketplace'],
];

/** Renders a rate as a percentage, or an explicit dash when there is no data. */
function rate(value) {
  if (value === null || value === undefined) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function Stat({ title, value, caption, color }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ ...mono, fontSize: '1.8rem', fontWeight: 800, color, marginTop: '0.5rem' }}>{value}</div>
      {caption ? <div style={{ color: 'var(--ink-subtle)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{caption}</div> : null}
    </div>
  );
}

export default function MLControlTab({ API_BASE, authHeaders }) {
  const [config, setConfig] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState('');
  const [draft, setDraft] = useState({});
  const [overrides, setOverrides] = useState([]);
  const [curateForm, setCurateForm] = useState({
    item_id: '', override_type: 'pin', pinned_position: 0, boost_factor: 1.5, reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, met, rdy, ovr] = await Promise.all([
        fetchJson(`${API_BASE}/ml/admin/config`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/metrics?hours=24`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/readiness`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/overrides?surface=shops_home`, { headers: authHeaders() }),
      ]);
      setConfig(cfg);
      setDraft(cfg.values || {});
      setMetrics(met.metrics || null);
      setReadiness(rdy.readiness || null);
      setOverrides(ovr.overrides || []);
    } catch (e) {
      setError(e);
      setConfig(null);
      setMetrics(null);
      setReadiness(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (key, value) => {
    setSaving(key);
    setNotice('');
    try {
      await fetchJson(`${API_BASE}/ml/admin/config`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setNotice(`Saved ${key}. Live on every instance now.`);
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(null);
    }
  };

  const kill = async () => {
    const reason = window.prompt('Why are you disabling ML ranking? (recorded in the audit log)');
    if (reason === null) return;
    setSaving('kill');
    try {
      await fetchJson(`${API_BASE}/ml/admin/kill`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || 'No reason given' }),
      });
      setNotice('ML ranking disabled. Every surface is serving the distance-and-popularity baseline.');
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(null);
    }
  };

  const resetAll = async () => {
    if (!window.confirm('Reset every ML weight and threshold to its committed default?')) return;
    setSaving('reset');
    try {
      await fetchJson(`${API_BASE}/ml/admin/config/reset`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      setNotice('All values restored to defaults.');
      await load();
    } catch (e) {
      setError(e);
    } finally {
      setSaving(null);
    }
  };

  const saveOverride = async (e) => {
    e.preventDefault();
    setSaving('curate');
    setNotice('');
    try {
      const payload = {
        surface: 'shops_home',
        item_id: curateForm.item_id.trim(),
        override_type: curateForm.override_type,
        reason: curateForm.reason.trim(),
      };
      if (curateForm.override_type === 'pin') payload.pinned_position = Number(curateForm.pinned_position);
      if (curateForm.override_type === 'boost') payload.boost_factor = Number(curateForm.boost_factor);

      await fetchJson(`${API_BASE}/ml/admin/overrides`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setNotice(`${curateForm.override_type} applied to ${payload.item_id}.`);
      setCurateForm((f) => ({ ...f, item_id: '', reason: '' }));
      await load();
    } catch (e2) {
      setError(e2);
    } finally {
      setSaving(null);
    }
  };

  const removeOverride = async (itemId) => {
    setSaving(`rm-${itemId}`);
    try {
      await fetchJson(`${API_BASE}/ml/admin/overrides`, {
        method: 'DELETE',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ surface: 'shops_home', item_id: itemId }),
      });
      setNotice('Override removed.');
      await load();
    } catch (e2) {
      setError(e2);
    } finally {
      setSaving(null);
    }
  };

  const values = config?.values || {};
  const normalized = config?.normalized_weights || {};
  const bounds = config?.bounds || {};
  const mlOn = Boolean(values.ml_enabled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={load} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0', color: 'var(--ink)' }}>🧠 ML Control Center</h3>
          <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>
            Ranking weights, kill switches and live performance. Changes apply without a restart.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button type="button" onClick={load} disabled={loading} style={btnGhost}>
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          <button type="button" onClick={resetAll} disabled={saving === 'reset'} style={btnGhost}>
            Reset to defaults
          </button>
          <button type="button" onClick={kill} disabled={saving === 'kill' || !mlOn} style={btnDanger}>
            {mlOn ? 'Disable ML ranking' : 'ML ranking is off'}
          </button>
        </div>
      </div>

      {notice ? (
        <div style={{ ...card, borderColor: 'var(--success)', background: 'var(--success-quiet)', color: 'var(--success)', fontSize: '0.85rem', padding: '0.85rem 1.25rem' }}>
          {notice}
        </div>
      ) : null}

      {!config && !error ? (
        <div style={{ ...card, color: 'var(--ink-muted)', fontSize: '0.9rem' }}>Loading ML configuration…</div>
      ) : null}

      {config ? (
        <>
          {/* Readiness — states plainly what the engine is actually doing. */}
          {readiness && !readiness.cf_ready ? (
            <div style={{ ...card, borderLeft: '3px solid var(--warning)' }}>
              <div style={{ color: 'var(--warning)', fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>
                Running on heuristics, not a trained model
              </div>
              <p style={{ color: 'var(--ink)', fontSize: '0.85rem', margin: 0, lineHeight: 1.6 }}>
                Collaborative filtering needs interaction history the platform has only just started
                recording. The collaborative weight stays at zero until it has support, so today's
                ranking is proximity, content similarity, rating and freshness.
                <br />
                <span style={{ ...mono, color: 'var(--ink-muted)' }}>
                  {Number(readiness.weighted_events).toLocaleString('en-IN')} / {Number(readiness.target_events).toLocaleString('en-IN')} weighted events
                  {' · '}
                  {Number(readiness.active_users).toLocaleString('en-IN')} / {Number(readiness.target_users).toLocaleString('en-IN')} active users
                </span>
              </p>
            </div>
          ) : null}

          {/* Master switch + per-surface */}
          <div style={card}>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 1rem 0', fontSize: '1rem' }}>Switches</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '0.9rem', borderBottom: '1px solid var(--line)' }}>
              <div>
                <div style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.9rem' }}>ML ranking</div>
                <div style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem' }}>
                  When off, every surface serves the deterministic distance-and-popularity baseline.
                </div>
              </div>
              <button
                type="button"
                onClick={() => save('ml_enabled', !mlOn)}
                disabled={saving === 'ml_enabled'}
                style={{ ...btnPrimary, background: mlOn ? '#16a34a' : 'var(--surface-2)', minWidth: '90px' }}
              >
                {mlOn ? 'ON' : 'OFF'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginTop: '1rem' }}>
              {SURFACES.map(([key, name]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span style={{ color: mlOn ? 'var(--ink)' : 'var(--ink-subtle)', fontSize: '0.85rem', fontWeight: 600 }}>{name}</span>
                  <button
                    type="button"
                    onClick={() => save(key, !values[key])}
                    disabled={saving === key}
                    style={{
                      ...btnPrimary,
                      padding: '0.35rem 0.8rem',
                      fontSize: '0.75rem',
                      background: values[key] ? '#0e7490' : 'var(--surface-2)',
                      opacity: mlOn ? 1 : 0.5,
                    }}
                  >
                    {values[key] ? 'on' : 'off'}
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Weights */}
          <div style={card}>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 0.3rem 0', fontSize: '1rem' }}>Scoring weights</h4>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.8rem', margin: '0 0 1.2rem 0' }}>
              Raw values are what you set. Applied values are renormalised to sum to 1, which is what
              lets a term sit at zero without rescaling the others.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {Object.entries(WEIGHT_LABELS).map(([key, name]) => {
                const [min, max] = bounds[key] || [0, 1];
                const applied = normalized[key];
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                      <span style={{ color: 'var(--ink)', fontSize: '0.87rem', fontWeight: 600 }}>
                        {name}
                        {key === 'ml_w_cf' && Number(values[key]) === 0 ? (
                          <span style={{ color: 'var(--warning)', fontSize: '0.72rem', marginLeft: '0.5rem', fontWeight: 700 }}>
                            AWAITING DATA
                          </span>
                        ) : null}
                      </span>
                      <span style={{ ...mono, color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                        raw {Number(draft[key] ?? 0).toFixed(2)} · applied {applied != null ? applied.toFixed(3) : '—'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        id={`weight-${key}`}
                        type="range"
                        min={min}
                        max={max}
                        step="0.01"
                        value={draft[key] ?? 0}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                        style={{ flex: 1, accentColor: '#4f46e5' }}
                      />
                      <button
                        type="button"
                        onClick={() => save(key, draft[key])}
                        disabled={saving === key || Number(draft[key]) === Number(values[key])}
                        style={{
                          ...btnPrimary,
                          padding: '0.35rem 0.8rem',
                          fontSize: '0.75rem',
                          opacity: Number(draft[key]) === Number(values[key]) ? 0.4 : 1,
                        }}
                      >
                        {saving === key ? 'Saving…' : 'Apply'}
                      </button>
                    </div>
                  </div>
                );
              })}

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.3rem' }}>
                  <span style={{ color: 'var(--ink)', fontSize: '0.87rem', fontWeight: 600 }}>Exploration rate (ε)</span>
                  <span style={{ ...mono, color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                    {(Number(draft.ml_epsilon ?? 0) * 100).toFixed(0)}% of slots
                  </span>
                </div>
                <p style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', margin: '0 0 0.5rem 0' }}>
                  Slots given to lower-scoring, rarely-shown merchants. Without it the ranking
                  converges on the same dozen shops and the rest never gather the data to compete.
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <input
                    id="weight-ml_epsilon"
                    type="range"
                    min={(bounds.ml_epsilon || [0, 0.5])[0]}
                    max={(bounds.ml_epsilon || [0, 0.5])[1]}
                    step="0.01"
                    value={draft.ml_epsilon ?? 0}
                    onChange={(e) => setDraft((d) => ({ ...d, ml_epsilon: Number(e.target.value) }))}
                    style={{ flex: 1, accentColor: '#4f46e5' }}
                  />
                  <button
                    type="button"
                    onClick={() => save('ml_epsilon', draft.ml_epsilon)}
                    disabled={saving === 'ml_epsilon' || Number(draft.ml_epsilon) === Number(values.ml_epsilon)}
                    style={{ ...btnPrimary, padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Curation */}
          <div style={card}>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 0.3rem 0', fontSize: '1rem' }}>Curation</h4>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.8rem', margin: '0 0 1.2rem 0' }}>
              Pin a merchant to a fixed slot, multiply its score, or remove it from
              recommendations. A weight changes how a signal is valued for everyone; an override is
              a statement about one merchant, so every change needs a reason and is written to the
              audit log. Pinned merchants are labelled as promoted to users.
            </p>

            <form onSubmit={saveOverride} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem', alignItems: 'end' }}>
              <div>
                <label htmlFor="curate-item" style={{ ...label, display: 'block', marginBottom: '0.3rem' }}>Shop ID</label>
                <input
                  id="curate-item"
                  value={curateForm.item_id}
                  onChange={(e) => setCurateForm((f) => ({ ...f, item_id: e.target.value }))}
                  placeholder="uuid"
                  required
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.4rem', border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label htmlFor="curate-type" style={{ ...label, display: 'block', marginBottom: '0.3rem' }}>Action</label>
                <select
                  id="curate-type"
                  value={curateForm.override_type}
                  onChange={(e) => setCurateForm((f) => ({ ...f, override_type: e.target.value }))}
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.4rem', border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', fontSize: '0.82rem' }}
                >
                  <option value="pin">Pin to slot</option>
                  <option value="boost">Boost score</option>
                  <option value="block">Block</option>
                </select>
              </div>

              {curateForm.override_type === 'pin' ? (
                <div>
                  <label htmlFor="curate-pos" style={{ ...label, display: 'block', marginBottom: '0.3rem' }}>Slot (0 = first)</label>
                  <input
                    id="curate-pos" type="number" min="0" max="99"
                    value={curateForm.pinned_position}
                    onChange={(e) => setCurateForm((f) => ({ ...f, pinned_position: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.4rem', border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', fontSize: '0.82rem' }}
                  />
                </div>
              ) : null}

              {curateForm.override_type === 'boost' ? (
                <div>
                  <label htmlFor="curate-boost" style={{ ...label, display: 'block', marginBottom: '0.3rem' }}>Multiplier (max 5)</label>
                  <input
                    id="curate-boost" type="number" min="0.1" max="5" step="0.1"
                    value={curateForm.boost_factor}
                    onChange={(e) => setCurateForm((f) => ({ ...f, boost_factor: e.target.value }))}
                    style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.4rem', border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', fontSize: '0.82rem' }}
                  />
                </div>
              ) : null}

              <div style={{ gridColumn: '1 / -1' }}>
                <label htmlFor="curate-reason" style={{ ...label, display: 'block', marginBottom: '0.3rem' }}>Reason (required, recorded)</label>
                <input
                  id="curate-reason"
                  value={curateForm.reason}
                  onChange={(e) => setCurateForm((f) => ({ ...f, reason: e.target.value }))}
                  placeholder="Why is this merchant being promoted or removed?"
                  required minLength={3}
                  style={{ width: '100%', padding: '0.5rem 0.7rem', borderRadius: '0.4rem', border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <button type="submit" disabled={saving === 'curate'} style={btnPrimary}>
                  {saving === 'curate' ? 'Applying…' : 'Apply override'}
                </button>
              </div>
            </form>

            <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
              {overrides.length === 0 ? (
                <div style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem' }}>
                  No overrides. The feed is ranked purely by score.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {overrides.map((o) => (
                    <div key={o.item_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.86rem' }}>
                          {o.item_name || o.item_id}
                          <span style={{
                            marginLeft: '0.6rem', fontSize: '0.68rem', fontWeight: 700,
                            padding: '0.15rem 0.45rem', borderRadius: '0.25rem',
                            background: o.override_type === 'block' ? 'var(--danger-quiet)' : '#082f49',
                            color: o.override_type === 'block' ? 'var(--danger)' : '#7dd3fc',
                            textTransform: 'uppercase', letterSpacing: '0.05em',
                          }}>
                            {o.override_type}
                            {o.override_type === 'pin' ? ` @${o.pinned_position}` : ''}
                            {o.override_type === 'boost' ? ` ×${o.boost_factor}` : ''}
                          </span>
                        </div>
                        <div style={{ color: 'var(--ink-subtle)', fontSize: '0.76rem' }}>{o.reason || 'No reason recorded'}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeOverride(o.item_id)}
                        disabled={saving === `rm-${o.item_id}`}
                        style={{ ...btnGhost, padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Metrics */}
          <div>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Last 24 hours</h4>
            {metrics ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <Stat
                  title="CLICK-THROUGH RATE"
                  value={rate(metrics.ctr)}
                  caption={`${Number(metrics.clicks).toLocaleString('en-IN')} clicks / ${Number(metrics.impressions).toLocaleString('en-IN')} impressions`}
                  color="#818cf8"
                />
                <Stat
                  title="CATALOGUE COVERAGE"
                  value={rate(metrics.coverage)}
                  caption={`${metrics.items_shown} of ${metrics.catalogue_size} merchants shown at all`}
                  color={metrics.coverage != null && metrics.coverage < 0.3 ? '#f87171' : '#4ade80'}
                />
                <Stat
                  title="EXPLORATION CTR"
                  value={rate(metrics.exploration_ctr)}
                  caption="Compare against the headline CTR"
                  color="#f59e0b"
                />
                <Stat
                  title="VENDOR CALLS"
                  value={Number(metrics.calls).toLocaleString('en-IN')}
                  caption={`${Number(metrics.detail_views).toLocaleString('en-IN')} detail views`}
                  color="#38bdf8"
                />
              </div>
            ) : (
              <div style={{ ...card, color: 'var(--ink-muted)', fontSize: '0.88rem' }}>
                No interaction data in this window yet.
              </div>
            )}
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', marginTop: '0.75rem', maxWidth: '70ch', lineHeight: 1.6 }}>
              Coverage is the guardrail. Click-through rate rises happily while the feed shows the
              same fifteen merchants to everyone — in a marketplace where every merchant pays, that
              is a commercial problem before it is a modelling one.
            </p>
          </div>
        </>
      ) : null}
    </div>
  );
}
