'use client';
import React, { useState, useEffect, useCallback } from 'react';
import TabError from '../TabError';
import Pagination from '../Pagination';
import { fetchJson } from '../../lib/api';

const PAGE_SIZE = 25;

// Server-paged, server-searched user directory. It used to fetch the first 50 users and then
// filter only those in the browser (so a user beyond the 50th could never be found), and the
// API answered with a shape this tab did not read, so the list was empty.
export default function UsersTab({ API_BASE, authHeaders }) {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (query) qs.set('search', query);
      const data = await fetchJson(`${API_BASE}/admin/users?${qs}`, { headers: authHeaders() });
      setUsers(data.users || []);
      setTotal(data.total || 0);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={load} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>👥 Platform User Directory</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Search by name, phone or email across every registered account.</p>
          </div>
          <input
            type="text"
            placeholder="Search users..."
            aria-label="Search users"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: 'var(--ground)', border: '1px solid var(--line)', color: 'var(--ink)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem' }}
          />
        </div>

        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Loading users...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>User Name</th>
                  <th style={thStyle}>Contact Details</th>
                  <th style={thStyle}>Role</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--ink-subtle)', padding: '2rem' }}>
                      {error ? 'The directory could not be loaded.' : 'No users match.'}
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.full_name || 'Anonymous User'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>ID: {u.id}</div>
                      </td>
                      <td style={tdStyle}>
                        <div>{u.email || 'No email registered'}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>{u.phone_number || '—'}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          {(u.role || 'user').toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ color: u.is_banned ? 'var(--danger)' : 'var(--success)', fontWeight: 600, fontSize: '0.8rem' }}>
                          {u.is_banned ? 'Suspended' : 'Active'}
                        </span>
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
