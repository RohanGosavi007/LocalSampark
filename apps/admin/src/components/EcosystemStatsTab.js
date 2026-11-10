import React, { useState, useEffect, useCallback } from 'react';
import TabError from './TabError';
import { fetchJson } from '../lib/api';

/**
 * Overview table for a secondary ecosystem module, read from
 * `url` (GET /admin/<module>/stats -> { stats: [{ id, module, count, status }] }), where every
 * count is a real COUNT over the module's tables.
 *
 * The seven tabs built on this (Animal welfare, Charity, Civic, Environment,
 * Krishi, Mobility, Rewards) previously set hard-coded rows in a useEffect and
 * never called the API, so the console showed invented metrics. Their
 * "Manage" / "Dispatch" buttons did nothing and are not carried over.
 */
export default function EcosystemStatsTab({ url, authHeaders, title, subtitle }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(url, { headers: authHeaders });
      setRows(Array.isArray(data && data.stats) ? data.stats : []);
    } catch (err) {
      setRows([]);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [url, authHeaders]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };
  const statusColor = (s) => (s === 'Active' ? 'var(--success)' : s === 'Pending review' ? 'var(--warning)' : 'var(--ink-muted)');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={fetchData} />
      <div style={cardStyle}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>{title}</h3>
          {subtitle && <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>{subtitle}</p>}
        </div>

        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }} aria-busy="true">Loading…</p>
        ) : !error && rows.length === 0 ? (
          <p style={{ color: 'var(--ink-muted)' }}>No data recorded for this module yet.</p>
        ) : rows.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sub-Module</th>
                  <th style={thStyle}>Count</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr key={d.id}>
                    <td style={{ ...tdStyle, fontWeight: 700 }}>{d.module}</td>
                    <td style={tdStyle}>{Number(d.count || 0).toLocaleString('en-IN')}</td>
                    <td style={tdStyle}>
                      <span style={{ color: statusColor(d.status), fontWeight: 700 }}>{d.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </div>
  );
}
