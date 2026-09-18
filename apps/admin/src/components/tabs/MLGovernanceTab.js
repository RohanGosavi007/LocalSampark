'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

/**
 * ML Governance & Experimentation Center.
 *
 * Four sub-views over the advanced subsystems: MMoE model configuration, the
 * A/B cockpit, data drift, and the AI moderation queue. The plain ranking
 * controls — weights, kill switches, curation — stay in MLControlTab; this is
 * the governance layer above them.
 *
 * Nothing here fabricates a number. The two tabs beside this one used to render
 * invented figures on a failed fetch, and a made-up CTR or PSI is worse than a
 * missing one: these panels exist to decide whether to keep a model serving
 * traffic.
 */

const card = {
  background: 'var(--surface-1)',
  padding: '1.5rem',
  borderRadius: '1rem',
  border: '1px solid var(--line)',
};

const btn = {
  padding: '0.6rem 1.2rem',
  background: 'var(--accent)',
  border: 'none',
  color: 'var(--on-solid)',
  borderRadius: '0.5rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.85rem',
};
const btnGhost = { ...btn, background: 'transparent', border: '1px solid var(--line-strong)', color: 'var(--ink)' };
const btnDanger = { ...btn, background: 'var(--danger)' };

const label = { color: 'var(--ink-muted)', fontSize: '0.8rem', fontWeight: 600 };
const mono = { fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' };

const VIEWS = [
  ['model', 'Model Configuration'],
  ['experiments', 'A/B Cockpit'],
  ['drift', 'Drift & Health'],
  ['moderation', 'Moderation Queue'],
];

/** Exponents, with what raising each one actually does to the feed. */
const EXPONENTS = [
  ['ml_mmoe_alpha', 'α — click probability', 'Raise to favour listings people tap.'],
  ['ml_mmoe_beta', 'β — conversion probability', 'Raise to favour listings people call or book.'],
  ['ml_mmoe_gamma', 'γ — quality', 'Raise to favour well-rated, responsive merchants.'],
  ['ml_mmoe_lambda', 'λ — distance decay (per km)', 'Raise to tighten the radius that ranks well.'],
];

function pct(value) {
  if (value === null || value === undefined) return '—';
  return `${(Number(value) * 100).toFixed(1)}%`;
}

function Stat({ title, value, caption, color }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ ...mono, fontSize: '1.6rem', fontWeight: 800, color, marginTop: '0.4rem' }}>{value}</div>
      {caption ? <div style={{ color: 'var(--ink-subtle)', fontSize: '0.75rem', marginTop: '0.2rem' }}>{caption}</div> : null}
    </div>
  );
}

export default function MLGovernanceTab({ API_BASE, authHeaders }) {
  const [view, setView] = useState('model');
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState({});
  const [experiments, setExperiments] = useState([]);
  const [results, setResults] = useState(null);
  const [driftReport, setDriftReport] = useState(null);
  const [queue, setQueue] = useState([]);
  const [banditArms, setBanditArms] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(null);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cfg, exps, drift, mod, arms] = await Promise.all([
        fetchJson(`${API_BASE}/ml/admin/config`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/experiments`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/drift`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/moderation?status=pending&limit=50`, { headers: authHeaders() }),
        fetchJson(`${API_BASE}/ml/admin/bandit`, { headers: authHeaders() }),
      ]);
      setConfig(cfg);
      setDraft(cfg.values || {});
      setExperiments(exps.experiments || []);
      setDriftReport(drift.drift || null);
      setQueue(mod.items || []);
      setBanditArms(arms.arms || []);
    } catch (e) {
      setError(e);
      setConfig(null);
      setDriftReport(null);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders]);

  useEffect(() => { load(); }, [load]);

  const save = async (key, value) => {
    setSaving(key);
    setNotice('');
    try {
      await fetchJson(`${API_BASE}/ml/admin/config`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      setNotice(`${key} saved. Live on every instance.`);
      await load();
    } catch (e) { setError(e); } finally { setSaving(null); }
  };

  const loadResults = async (key) => {
    setSaving(`results-${key}`);
    try {
      const data = await fetchJson(`${API_BASE}/ml/admin/experiments/${encodeURIComponent(key)}/results`, { headers: authHeaders() });
      setResults(data.results || null);
    } catch (e) { setError(e); } finally { setSaving(null); }
  };

  const runScan = async () => {
    setSaving('scan');
    try {
      const data = await fetchJson(`${API_BASE}/ml/admin/moderation/scan`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: '{}',
      });
      setNotice(`Scan complete: ${data.summary?.total_flags ?? 0} listing(s) flagged.`);
      await load();
    } catch (e) { setError(e); } finally { setSaving(null); }
  };

  const decide = async (id, status) => {
    const note = window.prompt(`Why are you marking this ${status}? (recorded)`);
    if (note === null) return;
    setSaving(`mod-${id}`);
    try {
      await fetchJson(`${API_BASE}/ml/admin/moderation/${id}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, note }),
      });
      await load();
    } catch (e) { setError(e); } finally { setSaving(null); }
  };

  const resetBandit = async () => {
    if (!window.confirm('Discard everything the layout policy has learned?')) return;
    setSaving('bandit-reset');
    try {
      await fetchJson(`${API_BASE}/ml/admin/bandit/reset`, {
        method: 'POST', headers: { ...authHeaders(), 'Content-Type': 'application/json' }, body: '{}',
      });
      setNotice('Layout policy reset. It will explore from scratch.');
      await load();
    } catch (e) { setError(e); } finally { setSaving(null); }
  };

  const values = config?.values || {};
  const bounds = config?.bounds || {};
  const mmoeOn = Boolean(values.ml_mmoe_enabled);
  const banditOn = Boolean(values.ml_bandit_enabled);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={load} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.4rem 0', color: 'var(--ink)' }}>⚖️ ML Governance &amp; Experimentation</h3>
          <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>
            Multi-objective model configuration, canary experiments, drift monitoring and the AI risk queue.
          </p>
        </div>
        <button type="button" onClick={load} disabled={loading} style={btnGhost}>
          {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', borderBottom: '1px solid var(--line)', paddingBottom: '0.75rem' }}>
        {VIEWS.map(([id, name]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            style={{
              ...btn,
              background: view === id ? 'var(--accent)' : 'transparent',
              border: view === id ? 'none' : '1px solid var(--line)',
              color: view === id ? 'var(--on-solid)' : 'var(--ink-muted)',
            }}
          >
            {name}
            {id === 'moderation' && queue.length > 0 ? (
              <span style={{ marginLeft: '0.5rem', background: 'var(--danger)', borderRadius: '999px', padding: '0.05rem 0.4rem', fontSize: '0.7rem' }}>
                {queue.length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {notice ? (
        <div style={{ ...card, borderColor: 'var(--success)', background: 'var(--success-quiet)', color: 'var(--success)', fontSize: '0.85rem', padding: '0.85rem 1.25rem' }}>
          {notice}
        </div>
      ) : null}

      {!config && !error ? (
        <div style={{ ...card, color: 'var(--ink-muted)', fontSize: '0.9rem' }}>Loading governance data…</div>
      ) : null}

      {/* ── MODEL CONFIGURATION ───────────────────────────────── */}
      {config && view === 'model' ? (
        <>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.95rem' }}>Multi-task ranking (MMoE)</div>
                <div style={{ color: 'var(--ink-subtle)', fontSize: '0.8rem', maxWidth: '62ch', lineHeight: 1.55 }}>
                  Scores each listing on click probability, conversion probability and quality, then
                  multiplies them. A product rather than a sum, so a listing cannot compensate for
                  being unclickable by being close. Off means the weighted-sum ranker serves.
                </div>
              </div>
              <button
                type="button"
                onClick={() => save('ml_mmoe_enabled', !mmoeOn)}
                disabled={saving === 'ml_mmoe_enabled'}
                style={{ ...btn, background: mmoeOn ? '#16a34a' : 'var(--surface-2)', minWidth: '90px' }}
              >
                {mmoeOn ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          <div style={card}>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 1rem 0', fontSize: '1rem' }}>Objective exponents</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {EXPONENTS.map(([key, name, hint]) => {
                const [min, max] = bounds[key] || [0, 5];
                return (
                  <div key={key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.25rem' }}>
                      <span style={{ color: 'var(--ink)', fontSize: '0.87rem', fontWeight: 600 }}>{name}</span>
                      <span style={{ ...mono, color: 'var(--ink-muted)', fontSize: '0.8rem' }}>
                        {Number(draft[key] ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <div style={{ color: 'var(--ink-subtle)', fontSize: '0.76rem', marginBottom: '0.4rem' }}>{hint}</div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input
                        id={`exp-${key}`}
                        type="range" min={min} max={max} step="0.05"
                        value={draft[key] ?? 0}
                        onChange={(e) => setDraft((d) => ({ ...d, [key]: Number(e.target.value) }))}
                        style={{ flex: 1, accentColor: '#4f46e5' }}
                      />
                      <button
                        type="button"
                        onClick={() => save(key, draft[key])}
                        disabled={saving === key || Number(draft[key]) === Number(values[key])}
                        style={{ ...btn, padding: '0.35rem 0.8rem', fontSize: '0.75rem',
                          opacity: Number(draft[key]) === Number(values[key]) ? 0.4 : 1 }}
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', marginTop: '1rem', maxWidth: '70ch', lineHeight: 1.6 }}>
              An exponent of 0 switches its objective off entirely — x⁰ is 1 — which is a legitimate
              way to isolate the others while tuning.
            </p>
          </div>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <div>
                <div style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.95rem' }}>Home layout bandit</div>
                <div style={{ color: 'var(--ink-subtle)', fontSize: '0.8rem' }}>
                  LinUCB orders the home modules per user. Explores where it is uncertain, not at random.
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" onClick={resetBandit} disabled={saving === 'bandit-reset'} style={btnGhost}>
                  Reset learning
                </button>
                <button
                  type="button"
                  onClick={() => save('ml_bandit_enabled', !banditOn)}
                  disabled={saving === 'ml_bandit_enabled'}
                  style={{ ...btn, background: banditOn ? '#16a34a' : 'var(--surface-2)', minWidth: '90px' }}
                >
                  {banditOn ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '420px' }}>
                <thead>
                  <tr style={{ color: 'var(--ink-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Module</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Times shown</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Mean reward</th>
                  </tr>
                </thead>
                <tbody>
                  {banditArms.map((arm) => (
                    <tr key={arm.arm} style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{arm.arm}</td>
                      <td style={{ ...mono, padding: '0.55rem 0.75rem' }}>{Number(arm.pulls).toLocaleString('en-IN')}</td>
                      <td style={{ ...mono, padding: '0.55rem 0.75rem', color: arm.mean_reward == null ? 'var(--ink-subtle)' : 'var(--success)' }}>
                        {arm.mean_reward == null ? 'never shown' : arm.mean_reward.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* ── A/B COCKPIT ───────────────────────────────────────── */}
      {config && view === 'experiments' ? (
        <>
          <div style={card}>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 0.75rem 0', fontSize: '1rem' }}>Experiments</h4>
            {experiments.length === 0 ? (
              <div style={{ color: 'var(--ink-subtle)', fontSize: '0.88rem' }}>
                No experiments defined. All traffic sees production behaviour.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {experiments.map((exp) => (
                  <div key={exp.key} style={{ borderTop: '1px solid var(--line)', paddingTop: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.9rem' }}>{exp.key}</span>
                        <span style={{
                          marginLeft: '0.6rem', fontSize: '0.68rem', fontWeight: 700, padding: '0.15rem 0.45rem',
                          borderRadius: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                          background: exp.is_active ? 'var(--success-quiet)' : 'var(--surface-1)',
                          color: exp.is_active ? 'var(--success)' : 'var(--ink-subtle)',
                        }}>
                          {exp.is_active ? 'running' : 'stopped'}
                        </span>
                        <div style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', marginTop: '0.2rem' }}>
                          {exp.traffic_pct}% of traffic ·{' '}
                          {(exp.variants || []).map((v) => `${v.name} ${v.weight}`).join(' / ')}
                        </div>
                      </div>
                      <button type="button" onClick={() => loadResults(exp.key)} disabled={saving === `results-${exp.key}`} style={btnGhost}>
                        {saving === `results-${exp.key}` ? 'Loading…' : 'View results'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {results ? (
            <div style={card}>
              <h4 style={{ color: 'var(--ink)', margin: '0 0 0.25rem 0', fontSize: '1rem' }}>
                {results.experiment}
              </h4>
              <div style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', marginBottom: '1rem' }}>
                Last {results.window_hours} hours. Variants are recomputed with the same function that
                served them, so this cannot disagree with what users actually saw.
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '600px' }}>
                  <thead>
                    <tr style={{ color: 'var(--ink-subtle)', textAlign: 'left' }}>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Variant</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Users</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Impressions</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>CTR</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Conversion</th>
                      <th style={{ padding: '0.5rem 0.75rem' }}>Verdict</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(results.variants || []).map((v, i) => {
                      const sig = (results.significance || []).find((s) => s.variant === v.variant);
                      return (
                        <tr key={v.variant} style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>
                          <td style={{ padding: '0.55rem 0.75rem', fontWeight: 700 }}>
                            {v.variant}{i === 0 ? <span style={{ color: 'var(--ink-subtle)', fontWeight: 400 }}> (control)</span> : null}
                          </td>
                          <td style={{ ...mono, padding: '0.55rem 0.75rem' }}>{v.subjects}</td>
                          <td style={{ ...mono, padding: '0.55rem 0.75rem' }}>{v.impressions}</td>
                          <td style={{ ...mono, padding: '0.55rem 0.75rem' }}>{pct(v.ctr)}</td>
                          <td style={{ ...mono, padding: '0.55rem 0.75rem' }}>{pct(v.cvr)}</td>
                          <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700,
                            color: !sig ? 'var(--ink-subtle)'
                              : sig.verdict === 'better' ? '#4ade80'
                              : sig.verdict === 'worse' ? '#f87171' : '#94a3b8' }}>
                            {sig ? sig.verdict.replace(/_/g, ' ') : '—'}
                            {sig && sig.z != null ? <span style={{ ...mono, color: 'var(--ink-subtle)', fontWeight: 400 }}> z={sig.z}</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', marginTop: '0.9rem', maxWidth: '70ch', lineHeight: 1.6 }}>
                A verdict of &ldquo;insufficient data&rdquo; means fewer than 30 clicks in an arm, where the
                normal approximation behind the z-test is not trustworthy regardless of how large the
                difference looks.
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {/* ── DRIFT ─────────────────────────────────────────────── */}
      {config && view === 'drift' ? (
        <>
          {driftReport?.alert ? (
            <div style={{ ...card, borderLeft: '3px solid var(--danger)' }}>
              <div style={{ color: 'var(--danger)', fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.3rem' }}>
                {driftReport.drifted_features.length} feature(s) have drifted significantly
              </div>
              <div style={{ color: 'var(--ink)', fontSize: '0.85rem' }}>
                {driftReport.drifted_features.join(', ')} — PSI above {driftReport.thresholds.alert}. The
                ranker keeps serving; its inputs no longer resemble the period it was tuned against.
              </div>
            </div>
          ) : null}

          <div style={card}>
            <h4 style={{ color: 'var(--ink)', margin: '0 0 0.25rem 0', fontSize: '1rem' }}>Population Stability Index</h4>
            <div style={{ color: 'var(--ink-subtle)', fontSize: '0.78rem', marginBottom: '1rem', maxWidth: '72ch', lineHeight: 1.6 }}>
              Last {driftReport?.window_days ?? 7} days against the {driftReport?.window_days ?? 7} before.
              Below {driftReport?.thresholds?.warn ?? 0.1} is stable, above {driftReport?.thresholds?.alert ?? 0.25} is
              a significant shift. Nothing fails when a feature drifts — that is why it is measured.
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', minWidth: '520px' }}>
                <thead>
                  <tr style={{ color: 'var(--ink-subtle)', textAlign: 'left' }}>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Feature</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>PSI</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Status</th>
                    <th style={{ padding: '0.5rem 0.75rem' }}>Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {(driftReport?.features || []).map((f) => (
                    <tr key={f.feature} style={{ borderTop: '1px solid var(--line)', color: 'var(--ink)' }}>
                      <td style={{ padding: '0.55rem 0.75rem', fontWeight: 600 }}>{f.feature}</td>
                      <td style={{ ...mono, padding: '0.55rem 0.75rem' }}>{f.psi == null ? '—' : f.psi.toFixed(4)}</td>
                      <td style={{ padding: '0.55rem 0.75rem', fontSize: '0.78rem', fontWeight: 700,
                        color: f.status === 'drifted' ? 'var(--danger)'
                          : f.status === 'shifting' ? '#fbbf24'
                          : f.status === 'stable' ? '#4ade80' : '#64748b' }}>
                        {f.status.replace(/_/g, ' ')}
                      </td>
                      <td style={{ ...mono, padding: '0.55rem 0.75rem', color: 'var(--ink-muted)' }}>
                        {f.recent_samples ?? 0} / {f.reference_samples ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}

      {/* ── MODERATION ────────────────────────────────────────── */}
      {config && view === 'moderation' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', maxWidth: '68ch', lineHeight: 1.6 }}>
              Statistical outliers, not rule hits. These are listings far from what the population
              looks like, which is how unfamiliar abuse gets caught — and also why every item needs a
              human decision rather than an automatic block.
            </div>
            <button type="button" onClick={runScan} disabled={saving === 'scan'} style={btn}>
              {saving === 'scan' ? 'Scanning…' : 'Run detectors now'}
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <Stat title="PENDING" value={queue.length} caption="awaiting a decision" color="#fbbf24" />
            <Stat
              title="HIGHEST RISK"
              value={queue.length ? Math.round(queue[0].risk_score) : '—'}
              caption={queue.length ? queue[0].detector.replace(/_/g, ' ') : 'nothing queued'}
              color="#f87171"
            />
            <Stat
              title="DETECTORS"
              value={new Set(queue.map((q) => q.detector)).size}
              caption="firing in this queue"
              color="#818cf8"
            />
          </div>

          <div style={card}>
            {queue.length === 0 ? (
              <div style={{ color: 'var(--ink-subtle)', fontSize: '0.88rem' }}>
                Nothing flagged. Either the catalogue looks normal or there is not yet enough of it to
                establish what normal is.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {queue.map((item) => (
                  <div key={item.id} style={{ borderTop: '1px solid var(--line)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                          <span style={{
                            ...mono, fontWeight: 800, fontSize: '1rem',
                            color: item.risk_score >= 70 ? 'var(--danger)' : item.risk_score >= 40 ? 'var(--warning)' : 'var(--ink-muted)',
                          }}>
                            {Math.round(item.risk_score)}
                          </span>
                          <span style={{ color: 'var(--ink)', fontWeight: 700, fontSize: '0.88rem' }}>
                            {item.detector.replace(/_/g, ' ')}
                          </span>
                          <span style={{ ...mono, color: 'var(--ink-subtle)', fontSize: '0.74rem' }}>
                            {item.entity_type}:{String(item.entity_id).slice(0, 8)}…
                          </span>
                        </div>
                        <pre style={{
                          ...mono, color: 'var(--ink-muted)', fontSize: '0.74rem', margin: '0.5rem 0 0',
                          whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '70ch',
                        }}>
                          {typeof item.evidence === 'object' ? JSON.stringify(item.evidence) : String(item.evidence || '')}
                        </pre>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                        <button type="button" onClick={() => decide(item.id, 'dismissed')} disabled={saving === `mod-${item.id}`} style={{ ...btnGhost, padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}>
                          Dismiss
                        </button>
                        <button type="button" onClick={() => decide(item.id, 'actioned')} disabled={saving === `mod-${item.id}`} style={{ ...btnDanger, padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}>
                          Action
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
