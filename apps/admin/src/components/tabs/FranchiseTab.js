'use client';
import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

export default function FranchiseTab({ API_BASE, authHeaders }) {
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/franchises`, {
        headers: authHeaders()
      });
      if (data.franchises) setFranchises(data.franchises);
    } catch (error) {
      console.error('Failed to fetch franchises:', error);
      setError(error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>🏢 Franchise Partner Network</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Territory revenue sharing and partner Pincode assignments.</p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Loading franchise network...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Partner Name</th>
                  <th style={thStyle}>Assigned Pincode</th>
                  <th style={thStyle}>Revenue Share</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {franchises.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--ink-subtle)', padding: '2rem' }}>
                      No franchise partners registered yet.
                    </td>
                  </tr>
                ) : (
                  franchises.map((f) => (
                    <tr key={f.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{f.name || f.partner_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>ID: {f.id}</div>
                      </td>
                      <td style={tdStyle}>{f.pincode || 'Unassigned'}</td>
                      <td style={tdStyle}>{f.revenue_share || '10%'}</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          ACTIVE
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
