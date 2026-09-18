'use client';
import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

export default function ChefTab({ API_BASE, authHeaders }) {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };

  useEffect(() => {
    fetchChefs();
  }, []);

  const fetchChefs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/shops?category=tiffin`, {
        headers: authHeaders()
      });
      if (data.shops) setChefs(data.shops);
    } catch (error) {
      console.error('Failed to fetch home chefs:', error);
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
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>👨‍🍳 Home Chef & Tiffin Services</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>FSSAI compliance, daily meal subscriptions, and kitchen audits.</p>
          </div>
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>{chefs.length} Registered Chefs</span>
        </div>

        {loading ? (
          <p style={{ color: 'var(--ink-muted)' }}>Loading chef directory...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Kitchen / Chef Name</th>
                  <th style={thStyle}>Specialty</th>
                  <th style={thStyle}>Status</th>
                </tr>
              </thead>
              <tbody>
                {chefs.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ ...tdStyle, textAlign: 'center', color: 'var(--ink-subtle)', padding: '2rem' }}>
                      No active home chef accounts registered yet.
                    </td>
                  </tr>
                ) : (
                  chefs.map((c) => (
                    <tr key={c.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>ID: {c.id}</div>
                      </td>
                      <td style={tdStyle}>Tiffin & Home Meals</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: 'var(--success)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
                          VERIFIED
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
