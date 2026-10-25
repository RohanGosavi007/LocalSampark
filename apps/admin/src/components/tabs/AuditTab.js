import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import Pagination from '../Pagination';
import { fetchJson, toList } from '../../lib/api';

const PAGE_SIZE = 50;

// Admin audit trail: loads on open (it used to wait for a "Load Audit Logs" click, and the
// click was the only thing that ever showed an error), pages through the whole history, and
// filters by action text.
export default function AuditTab({ API_BASE, authHeaders }) {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) qs.set('q', query);
      const data = await fetchJson(`${API_BASE}/admin/audit?${qs}`, { headers: authHeaders() });
      setLogs(toList(data));
      setTotal((data && data.total) || 0);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders, page, query]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setQuery(search.trim()); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const field = { background: 'var(--ground)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '0.5rem', padding: '0.4rem 0.8rem' };
  const td = { padding: '0.85rem 1rem', borderBottom: '1px solid var(--line)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={load} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>📋 Admin Audit Trail</h3>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by action…" aria-label="Filter audit log by action" style={field} />
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Admin', 'Action', 'Target', 'IP Address', 'Timestamp'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>Loading…</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>{error ? 'The audit log could not be loaded.' : 'No audit entries match.'}</td></tr>
              ) : logs.map((log, i) => (
                <tr key={log.id || i}>
                  <td style={{ ...td, fontWeight: 700 }}>{log.admin_name || log.admin_id || '—'}</td>
                  <td style={{ ...td, color: 'var(--success)' }}>{log.action}</td>
                  <td style={{ ...td, color: 'var(--ink-muted)' }}>{log.target_type}{log.target_id ? `: ${String(log.target_id).slice(0, 16)}` : ''}</td>
                  <td style={{ ...td, color: 'var(--ink-subtle)', fontSize: '0.8rem' }}>{log.ip_address || '—'}</td>
                  <td style={{ ...td, color: 'var(--ink-subtle)', fontSize: '0.8rem' }}>{log.created_at ? new Date(log.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPage={setPage} disabled={loading} />
      </div>
    </div>
  );
}
