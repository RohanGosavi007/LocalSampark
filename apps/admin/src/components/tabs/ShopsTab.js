'use client';
import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import Pagination from '../Pagination';
import { fetchJson } from '../../lib/api';

const PAGE_SIZE = 25;

// Server-paged, searchable shop directory with row and batch approval. It used to load every
// shop in one request (the ?limit it sent was ignored), read a `status` field the shops do not
// have (so every shop showed PENDING and Approve was always offered), and its red "Delete"
// button actually rejected the shop.
export default function ShopsTab({ API_BASE, authHeaders }) {
  const [shops, setShops] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [category, setCategory] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };
  const btnSuccess = { background: 'var(--success)', color: 'var(--on-solid)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: 600 };
  const btnDanger = { ...btnSuccess, background: 'var(--danger)' };
  const field = { background: 'var(--ground)', color: 'var(--ink)', border: '1px solid var(--line)', borderRadius: '0.5rem', padding: '0.4rem 0.8rem' };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) qs.set('search', query);
      if (status !== 'all') qs.set('status', status);
      if (category !== 'all') qs.set('category', category);
      const data = await fetchJson(`${API_BASE}/admin/shops?${qs}`, { headers: authHeaders() });
      setShops(data.shops || []);
      setTotal(data.total || 0);
      setSelected(new Set());
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, authHeaders, page, query, status, category]);

  useEffect(() => { load(); }, [load]);

  // typing in the search box waits for a pause rather than querying on every key
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); setQuery(search.trim()); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const decide = async (ids, decision) => {
    setBusy(true);
    setNotice(null);
    let done = 0;
    const failures = [];
    for (const id of ids) {
      try {
        await fetchJson(`${API_BASE}/admin/approvals/shop/${id}`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: decision }) });
        done += 1;
      } catch (e) {
        failures.push(e.message || 'failed');
      }
    }
    setBusy(false);
    setNotice(`${done} shop${done === 1 ? '' : 's'} ${decision}${failures.length ? `, ${failures.length} failed (${failures[0]})` : ''}.`);
    load();
  };

  const toggle = (id) => setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const allOnPage = shops.length > 0 && shops.every((s) => selected.has(s.id));
  const toggleAll = () => setSelected(allOnPage ? new Set() : new Set(shops.map((s) => s.id)));
  const statusOf = (s) => s.approval_status || 'pending';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={load} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>🏪 Shop Directory Management</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Review, approve, and manage registered local merchants</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search shop or owner…" aria-label="Search shops" style={field} />
            <select value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }} aria-label="Filter by status" style={field}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select value={category} onChange={(e) => { setPage(1); setCategory(e.target.value); }} aria-label="Filter by category" style={field}>
              <option value="all">All Categories</option>
              <option value="grocery">Grocery</option>
              <option value="pharmacy">Pharmacy</option>
              <option value="restaurant">Restaurant</option>
              <option value="electronics">Electronics</option>
            </select>
          </div>
        </div>

        {notice && <p role="status" style={{ color: 'var(--success)', fontWeight: 600 }}>{notice}</p>}

        {selected.size > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
            <strong style={{ color: 'var(--ink)' }}>{selected.size} selected</strong>
            <button disabled={busy} onClick={() => decide([...selected], 'approved')} style={btnSuccess}>Approve selected</button>
            <button disabled={busy} onClick={() => { if (confirm(`Reject ${selected.size} shop(s)?`)) decide([...selected], 'rejected'); }} style={btnDanger}>Reject selected</button>
          </div>
        )}

        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Loading directory...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}><input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Select all on this page" /></th>
                  <th style={thStyle}>Shop & Details</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shops.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ ...tdStyle, textAlign: 'center', color: 'var(--ink-subtle)', padding: '2rem' }}>
                      {error ? 'The directory could not be loaded.' : 'No shops match.'}
                    </td>
                  </tr>
                ) : (
                  shops.map((s) => (
                    <tr key={s.id}>
                      <td style={tdStyle}><input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} aria-label={`Select ${s.name}`} /></td>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>
                          {s.owner_name ? `Owner: ${s.owner_name} · ` : ''}{s.address || 'No address'}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: 'var(--ground)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.78rem' }}>{s.category}</span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: statusOf(s) === 'approved' ? 'rgba(16, 185, 129, 0.2)' : statusOf(s) === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: statusOf(s) === 'approved' ? 'var(--success)' : statusOf(s) === 'rejected' ? 'var(--danger)' : 'var(--warning)',
                          padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          {statusOf(s).toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {statusOf(s) !== 'approved' && <button disabled={busy} onClick={() => decide([s.id], 'approved')} style={btnSuccess}>Approve</button>}
                          {statusOf(s) !== 'rejected' && <button disabled={busy} onClick={() => { if (confirm(`Reject ${s.name}?`)) decide([s.id], 'rejected'); }} style={btnDanger}>Reject</button>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} limit={PAGE_SIZE} total={total} onPage={setPage} disabled={loading} />
      </div>
    </div>
  );
}
