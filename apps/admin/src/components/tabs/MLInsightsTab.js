'use client';

import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

/**
 * ML Insights — the phase-2 subsystems.
 *
 * MLControlTab holds the ranking weights and kill switches; MLGovernanceTab
 * holds experiments, drift and moderation. This is the layer above both: the
 * graph, the sequence model, causal uplift, exposure fairness, cold start, the
 * vector index and the feature store.
 *
 * Two rules carried over from the tab beside this one, both of which matter
 * more here than there:
 *
 *  1. **Nothing is fabricated.** Every number renders as an em dash when the
 *     server did not send it. These panels are read to decide whether to switch
 *     a model on for every user of the platform, and an invented AUUC or NDCG
 *     loss is worse than a blank.
 *
 *  2. **A cost is shown wherever there is one.** The fairness panel does not
 *     show a strength slider on its own — it shows what each strength costs in
 *     relevance, simulated against the real deficits, before anything is
 *     enabled. A control an operator can only evaluate by shipping it is not a
 *     control.
 */

const card = {
  background: '#1e293b',
  padding: '1.5rem',
  borderRadius: '1rem',
  border: '1px solid #334155',
};

const btn = {
  padding: '0.6rem 1.2rem',
  background: '#4f46e5',
  border: 'none',
  color: '#fff',
  borderRadius: '0.5rem',
  fontWeight: 700,
  cursor: 'pointer',
  fontSize: '0.85rem',
};
const btnGhost = { ...btn, background: 'transparent', border: '1px solid #475569', color: '#cbd5e1' };

const label = { color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 };
const mono = { fontFamily: 'ui-monospace, monospace', fontVariantNumeric: 'tabular-nums' };
const muted = { color: '#64748b', fontSize: '0.75rem' };

const VIEWS = [
  ['overview', 'Overview'],
  ['graph', 'Society Graph'],
  ['intent', 'Sequence & Intent'],
  ['uplift', 'Causal Uplift'],
  ['fairness', 'Exposure Fairness'],
  ['coldstart', 'Cold Start'],
  ['infra', 'Index & Features'],
];

/** Em dash for anything the server did not send. Never a zero, never a guess. */
function num(value, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(digits);
}

function pct(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(digits)}%`;
}

function int(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return Number(value).toLocaleString();
}

function ago(timestamp) {
  if (!timestamp) return 'never';
  const t = new Date(String(timestamp).replace(' ', 'T')).getTime();
  if (!Number.isFinite(t)) return '—';
  const hours = (Date.now() - t) / 3600000;
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function Stat({ title, value, caption, color }) {
  return (
    <div style={card}>
      <div style={label}>{title}</div>
      <div style={{ ...mono, fontSize: '1.6rem', fontWeight: 800, color: color || '#e2e8f0', marginTop: '0.4rem' }}>
        {value}
      </div>
      {caption ? <div style={{ ...muted, marginTop: '0.2rem' }}>{caption}</div> : null}
    </div>
  );
}

function Grid({ children, min = '220px' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}, 1fr))`, gap: '1rem' }}>
      {children}
    </div>
  );
}

/**
 * "Off" versus "on but with nothing to serve" are different states.
 *
 * A subsystem that is enabled with an empty artefact looks identical to a
 * working one from the config alone, and that is exactly the failure an
 * operator needs to catch — they flipped the switch a week ago and the nightly
 * job has been failing since.
 */
function Status({ enabled, built, emptyLabel = 'no data yet' }) {
  if (!enabled) {
    return <span style={{ color: '#64748b', fontWeight: 700, fontSize: '0.8rem' }}>● disabled</span>;
  }
  if (!built) {
    return <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>● enabled, {emptyLabel}</span>;
  }
  return <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '0.8rem' }}>● active</span>;
}

/**
 * A minimal inline chart, drawn as SVG.
 *
 * No charting dependency: one polyline over a normalised series is all these
 * panels need, and the Qini curve in particular is read for its *shape* against
 * the random-targeting diagonal, which is one extra line rather than a library.
 */
function Curve({ points, diagonal = false, height = 160, color = '#4f46e5' }) {
  if (!Array.isArray(points) || points.length < 2) {
    return <div style={muted}>Not enough data to plot.</div>;
  }

  const xs = points.map((p) => Number(p.x));
  const ys = points.map((p) => Number(p.y));
  const maxX = Math.max(...xs, 1e-9);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1e-9);
  const spanY = maxY - minY || 1;

  const W = 100;
  const H = 100;
  const path = points
    .map((p, i) => {
      const x = (Number(p.x) / maxX) * W;
      const y = H - ((Number(p.y) - minY) / spanY) * H;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const lastY = H - ((ys[ys.length - 1] - minY) / spanY) * H;
  const zeroY = H - ((0 - minY) / spanY) * H;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }}>
      <rect x="0" y="0" width={W} height={H} fill="#0f172a" />
      {diagonal ? (
        <line x1="0" y1={zeroY} x2={W} y2={lastY} stroke="#475569" strokeWidth="0.6" strokeDasharray="2 2" />
      ) : null}
      <path d={path} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function MLInsightsTab({ API_BASE, authHeaders }) {
  const [view, setView] = useState('overview');
  const [status, setStatus] = useState(null);
  const [simulation, setSimulation] = useState(null);
  const [inspect, setInspect] = useState(null);
  const [inspectId, setInspectId] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/ml/phase2/admin/status`, { headers: authHeaders() });
      setStatus(data);
    } catch (err) {
      setStatus(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const loadSimulation = useCallback(async () => {
    try {
      const data = await fetchJson(
        `${API_BASE}/ml/phase2/admin/fairness/simulate?max_ndcg_loss=0.05`,
        { headers: authHeaders() }
      );
      setSimulation(data);
    } catch (err) {
      setError(err);
    }
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    if (view === 'fairness' && !simulation) loadSimulation();
  }, [view, simulation, loadSimulation]);

  /**
   * Fires a rebuild or training run.
   *
   * These answer 202 and run detached, so the confirmation says the job
   * started, not that it succeeded. Claiming success for work that has not
   * happened is how an operator concludes a feature is broken when it is
   * merely still running.
   */
  const run = async (key, path, description) => {
    setBusy(key);
    setNotice(null);
    try {
      const data = await fetchJson(`${API_BASE}${path}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({}),
      });
      setNotice(data.message || `${description} started.`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(null);
    }
  };

  const cfg = (status && status.config) || {};
  const on = (key) => cfg[key] === true || cfg[key] === 'true';

  if (loading && !status) {
    return <div style={{ padding: '2rem', color: '#94a3b8' }}>Loading ML insights…</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <TabError error={error} onRetry={load} />

      {notice ? (
        <div style={{
          ...card,
          borderColor: '#4f46e5',
          background: '#1e1b4b',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
        >
          <span style={{ color: '#c7d2fe', fontSize: '0.85rem' }}>{notice}</span>
          <button type="button" style={btnGhost} onClick={() => { setNotice(null); load(); }}>
            Refresh status
          </button>
        </div>
      ) : null}

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {VIEWS.map(([id, text]) => (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            style={view === id ? btn : btnGhost}
          >
            {text}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button type="button" style={btnGhost} onClick={load}>Reload</button>
      </div>

      {view === 'overview' ? (
        <>
          <Grid>
            <Stat
              title="Society graph"
              value={int(status?.graph?.total_nodes)}
              caption={`nodes · built ${ago(status?.graph?.built_at)}`}
              color="#38bdf8"
            />
            <Stat
              title="Sequence model"
              value={status?.sequence?.active ? `v${status.sequence.version}` : '—'}
              caption={status?.sequence?.active
                ? `${pct(status.sequence.metrics?.held_out_accuracy)} held-out vs ${pct(status.sequence.metrics?.baseline_accuracy)} baseline`
                : 'not trained'}
              color="#a78bfa"
            />
            <Stat
              title="Uplift AUUC"
              value={num(status?.uplift?.metrics?.auuc, 3)}
              caption="area over random targeting"
              color={Number(status?.uplift?.metrics?.auuc) > 0 ? '#22c55e' : '#f59e0b'}
            />
            <Stat
              title="Exposure Gini"
              value={num(status?.fairness?.gini, 3)}
              caption={`${int(status?.fairness?.merchants)} merchants · ${int(status?.fairness?.merchants_owed)} owed`}
              color={Number(status?.fairness?.gini) > 0.6 ? '#ef4444' : '#22c55e'}
            />
            <Stat
              title="Vector index"
              value={int(status?.vector_index?.items)}
              caption={`${int(status?.vector_index?.shards?.length)} shards · ${ago(status?.vector_index?.builtAt)}`}
              color="#38bdf8"
            />
            <Stat
              title="New merchants converting"
              value={pct(status?.coldstart?.cohorts?.rate_within_30)}
              caption="first booking within 30 days"
              color="#f59e0b"
            />
          </Grid>

          <div style={card}>
            <div style={{ ...label, marginBottom: '0.75rem' }}>Subsystem status</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <tbody>
                {[
                  ['Society graph (LightGCN)', 'ml_graph_enabled', Boolean(status?.graph?.built), 'graph not built'],
                  ['Sequence intent model', 'ml_sequence_enabled', Boolean(status?.sequence?.active), 'no active model'],
                  ['Causal uplift', 'ml_uplift_enabled', Boolean(status?.uplift?.active), 'no fitted model'],
                  ['Exposure fairness', 'ml_fairness_enabled', Number(status?.fairness?.merchants) > 0, 'ledger empty'],
                  ['Cold start', 'ml_coldstart_enabled', Number(status?.coldstart?.priors?.pincodes) > 0, 'no priors'],
                  ['Vector index (HNSW)', 'ml_ann_enabled', Boolean(status?.vector_index?.built), 'index not built'],
                  ['Visual search', 'ml_visual_enabled', Number(status?.visual_search?.indexed) > 0, 'nothing indexed'],
                  ['Narrative badges', 'ml_narratives_enabled', true, ''],
                  ['Feature store', 'ml_featurestore_enabled', true, ''],
                ].map(([name, key, built, emptyLabel]) => (
                  <tr key={key} style={{ borderTop: '1px solid #334155' }}>
                    <td style={{ padding: '0.6rem 0', color: '#e2e8f0' }}>{name}</td>
                    <td style={{ padding: '0.6rem 0', ...mono, ...muted }}>{key}</td>
                    <td style={{ padding: '0.6rem 0', textAlign: 'right' }}>
                      <Status enabled={on(key)} built={built} emptyLabel={emptyLabel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ ...muted, marginTop: '0.75rem' }}>
              Amber means the switch is on but the subsystem has nothing to serve — usually a job that has
              not run yet, or one that has been failing. Enable switches in ML Control Center.
            </div>
          </div>
        </>
      ) : null}

      {view === 'graph' ? (
        <>
          <Grid>
            <Stat title="Total nodes" value={int(status?.graph?.total_nodes)} />
            <Stat title="Dimension" value={int(status?.graph?.dimension)} caption="embedding width" />
            <Stat title="Layers" value={int(status?.graph?.layers)} caption="propagation rounds" />
            <Stat title="Last built" value={ago(status?.graph?.built_at)} />
          </Grid>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={label}>Nodes by type</div>
              <button
                type="button"
                style={btn}
                disabled={busy === 'graph'}
                onClick={() => run('graph', '/ml/phase2/admin/graph/rebuild', 'Graph rebuild')}
              >
                {busy === 'graph' ? 'Starting…' : 'Rebuild graph'}
              </button>
            </div>
            <Grid min="160px">
              {Object.entries(status?.graph?.by_type || {}).map(([type, data]) => (
                <Stat
                  key={type}
                  title={type}
                  value={int(data.nodes)}
                  caption={`avg degree ${num(data.avg_degree, 1)}`}
                />
              ))}
            </Grid>
            {!status?.graph?.built ? (
              <div style={{ ...muted, marginTop: '1rem' }}>
                No embeddings stored. The graph needs interaction events and society memberships to have
                any edges; before that it correctly produces nothing.
              </div>
            ) : null}
          </div>

          <div style={card}>
            <div style={{ ...label, marginBottom: '0.75rem' }}>Inspect a node</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <input
                value={inspectId}
                onChange={(e) => setInspectId(e.target.value)}
                placeholder="merchant id"
                style={{
                  flex: 1,
                  minWidth: '220px',
                  padding: '0.6rem',
                  background: '#0f172a',
                  border: '1px solid #334155',
                  borderRadius: '0.5rem',
                  color: '#e2e8f0',
                  ...mono,
                }}
              />
              <button
                type="button"
                style={btn}
                onClick={async () => {
                  if (!inspectId.trim()) return;
                  try {
                    const data = await fetchJson(
                      `${API_BASE}/ml/phase2/admin/graph/inspect?node_type=merchant&node_id=${encodeURIComponent(inspectId.trim())}`,
                      { headers: authHeaders() }
                    );
                    setInspect(data);
                  } catch (err) {
                    setError(err);
                  }
                }}
              >
                Inspect
              </button>
            </div>

            {inspect && !inspect.found ? (
              <div style={{ ...muted, marginTop: '0.75rem' }}>{inspect.message}</div>
            ) : null}

            {inspect && inspect.found ? (
              <div style={{ marginTop: '1rem' }}>
                <div style={muted}>
                  Degree {int(inspect.degree)} · dimension {int(inspect.dimension)}
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                      <th style={{ padding: '0.4rem 0' }}>Nearest node</th>
                      <th style={{ padding: '0.4rem 0' }}>Similarity</th>
                      <th style={{ padding: '0.4rem 0' }}>Degree</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inspect.nearest || []).map((row) => (
                      <tr key={row.node} style={{ borderTop: '1px solid #334155' }}>
                        <td style={{ padding: '0.4rem 0', ...mono, color: '#e2e8f0' }}>{row.node}</td>
                        <td style={{ padding: '0.4rem 0', ...mono, color: '#38bdf8' }}>{num(row.similarity, 3)}</td>
                        <td style={{ padding: '0.4rem 0', ...mono, ...muted }}>{int(row.degree)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ ...muted, marginTop: '0.75rem' }}>
                  This is the answer to &quot;why does this merchant rank in this society&quot; — the nodes
                  the propagation placed it closest to.
                </div>
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      {view === 'intent' ? (
        <>
          <Grid>
            <Stat
              title="Active version"
              value={status?.sequence?.active ? `v${status.sequence.version}` : '—'}
            />
            <Stat title="Parameters" value={int(status?.sequence?.parameters)} />
            <Stat
              title="Held-out accuracy"
              value={pct(status?.sequence?.metrics?.held_out_accuracy)}
              color="#a78bfa"
            />
            <Stat
              title="Popularity baseline"
              value={pct(status?.sequence?.metrics?.baseline_accuracy)}
              caption="what &quot;always guess the most common&quot; scores"
            />
          </Grid>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={label}>Sequence model</div>
              <button
                type="button"
                style={btn}
                disabled={busy === 'sequence'}
                onClick={() => run('sequence', '/ml/phase2/admin/sequence/train', 'Training')}
              >
                {busy === 'sequence' ? 'Starting…' : 'Train now'}
              </button>
            </div>

            {status?.sequence?.active ? (
              <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.85rem', color: '#cbd5e1' }}>
                <div>Architecture: d_model {int(status.sequence.d_model)}, {int(status.sequence.n_heads)} heads, window {int(status.sequence.max_len)}</div>
                <div>Vocabulary: {int(status.sequence.vocabulary)} categories</div>
                <div>Trained on {int(status.sequence.metrics?.train_examples)} examples from {int(status.sequence.metrics?.sequences)} sessions</div>
              </div>
            ) : (
              <div style={muted}>
                No active model. Training only activates a model that beats the popularity baseline on a
                chronologically held-out split, so an early run reporting no activation is the safeguard
                working rather than a failure.
              </div>
            )}
          </div>
        </>
      ) : null}

      {view === 'uplift' ? (
        <>
          <Grid>
            <Stat title="AUUC" value={num(status?.uplift?.metrics?.auuc, 3)} caption="above random targeting" />
            <Stat title="Treated units" value={int(status?.uplift?.metrics?.n_treated)} />
            <Stat title="Control units" value={int(status?.uplift?.metrics?.n_control)} />
            <Stat
              title="Naive ATE"
              value={pct(status?.uplift?.metrics?.naive_ate)}
              caption="raw difference in means"
            />
          </Grid>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={label}>Qini curve</div>
              <button
                type="button"
                style={btn}
                disabled={busy === 'uplift'}
                onClick={() => run('uplift', '/ml/phase2/admin/uplift/train', 'Uplift fit')}
              >
                {busy === 'uplift' ? 'Starting…' : 'Refit'}
              </button>
            </div>

            <Curve
              points={(status?.uplift?.metrics?.qini || []).map((p) => ({ x: p.fraction, y: p.incremental }))}
              diagonal
              color="#22c55e"
            />
            <div style={{ ...muted, marginTop: '0.75rem' }}>
              Cumulative incremental conversions as the promotion budget is spent from the highest predicted
              uplift downward. The dashed line is what random targeting would achieve. A curve that hugs the
              diagonal means the model carries no information about who is persuadable — whatever its
              accuracy at predicting conversion.
            </div>
            <div style={{ ...muted, marginTop: '0.5rem', color: '#f59e0b' }}>
              Treatment here is observational, not randomised. Read the curve before trusting the estimate.
            </div>
          </div>
        </>
      ) : null}

      {view === 'fairness' ? (
        <>
          <Grid>
            <Stat
              title="Gini"
              value={num(status?.fairness?.gini, 3)}
              caption="0 equal, 1 monopoly"
              color={Number(status?.fairness?.gini) > 0.6 ? '#ef4444' : '#22c55e'}
            />
            <Stat
              title="Top decile share"
              value={pct(status?.fairness?.top_decile_share)}
              caption="impressions taken by the top 10%"
            />
            <Stat title="Merchants" value={int(status?.fairness?.merchants)} />
            <Stat title="Currently owed" value={int(status?.fairness?.merchants_owed)} />
          </Grid>

          <div style={card}>
            <div style={{ ...label, marginBottom: '0.5rem' }}>What each fairness strength would cost</div>
            <div style={{ ...muted, marginBottom: '1rem' }}>
              Simulated against the real current deficits. Nothing here changes what any user sees.
            </div>

            {simulation && simulation.simulations ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '0.5rem 0' }}>Requested</th>
                    <th style={{ padding: '0.5rem 0' }}>Applied</th>
                    <th style={{ padding: '0.5rem 0' }}>NDCG loss</th>
                    <th style={{ padding: '0.5rem 0' }}>Moved</th>
                    <th style={{ padding: '0.5rem 0' }}>Worst move</th>
                  </tr>
                </thead>
                <tbody>
                  {simulation.simulations.map((row) => (
                    <tr key={row.requested_strength} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '0.5rem 0', ...mono, color: '#e2e8f0' }}>{num(row.requested_strength, 2)}</td>
                      <td style={{ padding: '0.5rem 0', ...mono, color: '#38bdf8' }}>{num(row.applied_strength, 3)}</td>
                      <td style={{ padding: '0.5rem 0', ...mono, color: row.ndcg_loss > 0.03 ? '#f59e0b' : '#22c55e' }}>
                        {pct(row.ndcg_loss, 2)}
                      </td>
                      <td style={{ padding: '0.5rem 0', ...mono, ...muted }}>{int(row.moved)}</td>
                      <td style={{ padding: '0.5rem 0', ...mono, ...muted }}>{int(row.max_move)} places</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={muted}>Loading simulation…</div>
            )}

            <div style={{ ...muted, marginTop: '1rem' }}>
              &quot;Applied&quot; is lower than &quot;requested&quot; wherever the requested strength would have
              exceeded the relevance budget. The re-ranker searches for the strongest correction that stays
              inside the budget rather than honouring the slider and overspending — so the constraint cannot
              be violated by dragging it to maximum.
            </div>
          </div>
        </>
      ) : null}

      {view === 'coldstart' ? (
        <>
          <Grid>
            <Stat title="Pincodes with priors" value={int(status?.coldstart?.priors?.pincodes)} />
            <Stat
              title="Mean shrinkage"
              value={num(status?.coldstart?.priors?.avg_shrinkage, 3)}
              caption="share of the estimate that is borrowed"
            />
            <Stat
              title="Mostly borrowed"
              value={int(status?.coldstart?.priors?.mostly_borrowed)}
              caption="pincodes leaning on donors"
              color="#f59e0b"
            />
            <Stat title="Last computed" value={ago(status?.coldstart?.priors?.computed_at)} />
          </Grid>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={label}>New merchant conversion, by cohort</div>
              <button
                type="button"
                style={btn}
                disabled={busy === 'coldstart'}
                onClick={() => run('coldstart', '/ml/phase2/admin/coldstart/rebuild', 'Prior rebuild')}
              >
                {busy === 'coldstart' ? 'Starting…' : 'Rebuild priors'}
              </button>
            </div>

            <Grid min="160px">
              <Stat title="Listed in window" value={int(status?.coldstart?.cohorts?.total)} />
              <Stat title="Booked within 7d" value={int(status?.coldstart?.cohorts?.within_7)} color="#22c55e" />
              <Stat title="Within 14d" value={int(status?.coldstart?.cohorts?.within_14)} color="#22c55e" />
              <Stat title="Within 30d" value={int(status?.coldstart?.cohorts?.within_30)} color="#22c55e" />
              <Stat title="Never booked" value={int(status?.coldstart?.cohorts?.never)} color="#ef4444" />
            </Grid>

            <div style={{ ...muted, marginTop: '1rem' }}>
              This is the outcome measure for the whole cold-start subsystem. Everything else on this page is
              a mechanism; the share of new merchants reaching a first booking is whether the mechanism worked.
            </div>
          </div>
        </>
      ) : null}

      {view === 'infra' ? (
        <>
          <Grid>
            <Stat title="Indexed vectors" value={int(status?.vector_index?.items)} />
            <Stat title="Shards" value={int(status?.vector_index?.shards?.length)} />
            <Stat title="Build time" value={`${int(status?.vector_index?.build_ms)} ms`} />
            <Stat title="Visual embeddings" value={int(status?.visual_search?.indexed)} />
          </Grid>

          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={label}>Vector index shards</div>
              <button
                type="button"
                style={btn}
                disabled={busy === 'vector'}
                onClick={() => run('vector', '/ml/phase2/admin/vector/rebuild', 'Index rebuild')}
              >
                {busy === 'vector' ? 'Starting…' : 'Rebuild index'}
              </button>
            </div>

            {Array.isArray(status?.vector_index?.shards) && status.vector_index.shards.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '0.4rem 0' }}>Shard</th>
                    <th style={{ padding: '0.4rem 0' }}>Items</th>
                    <th style={{ padding: '0.4rem 0' }}>Layers</th>
                    <th style={{ padding: '0.4rem 0' }}>Avg degree</th>
                  </tr>
                </thead>
                <tbody>
                  {status.vector_index.shards.map((shard) => (
                    <tr key={shard.shard} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '0.4rem 0', ...mono, color: '#e2e8f0' }}>{shard.shard}</td>
                      <td style={{ padding: '0.4rem 0', ...mono }}>{int(shard.size)}</td>
                      <td style={{ padding: '0.4rem 0', ...mono, ...muted }}>{int(shard.layers)}</td>
                      <td style={{ padding: '0.4rem 0', ...mono, ...muted }}>{num(shard.avg_degree_layer0, 1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={muted}>Index not built.</div>
            )}
          </div>

          <div style={card}>
            <div style={{ ...label, marginBottom: '0.5rem' }}>Feature freshness</div>
            <div style={{ ...muted, marginBottom: '1rem' }}>
              Worst offenders first. A stale feature reports as healthy everywhere else in the system — the
              ranker gets a number, the score is finite, nothing errors.
            </div>

            {Array.isArray(status?.feature_store?.freshness) ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#94a3b8' }}>
                    <th style={{ padding: '0.4rem 0' }}>Feature</th>
                    <th style={{ padding: '0.4rem 0' }}>Rows</th>
                    <th style={{ padding: '0.4rem 0' }}>Age</th>
                    <th style={{ padding: '0.4rem 0' }}>SLA</th>
                    <th style={{ padding: '0.4rem 0' }}>State</th>
                  </tr>
                </thead>
                <tbody>
                  {status.feature_store.freshness.map((row) => (
                    <tr key={row.feature} style={{ borderTop: '1px solid #334155' }}>
                      <td style={{ padding: '0.4rem 0', ...mono, color: '#e2e8f0' }}>{row.feature}</td>
                      <td style={{ padding: '0.4rem 0', ...mono, ...muted }}>{int(row.rows)}</td>
                      <td style={{ padding: '0.4rem 0', ...mono }}>
                        {row.age_ms == null ? '—' : `${Math.round(row.age_ms / 60000)}m`}
                      </td>
                      <td style={{ padding: '0.4rem 0', ...mono, ...muted }}>{Math.round(row.sla_ms / 60000)}m</td>
                      <td style={{ padding: '0.4rem 0', fontWeight: 700 }}>
                        {row.stale === null
                          ? <span style={{ color: '#64748b' }}>never materialised</span>
                          : row.stale
                            ? <span style={{ color: '#ef4444' }}>stale</span>
                            : <span style={{ color: '#22c55e' }}>fresh</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={muted}>Freshness unavailable.</div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
