'use client';
import React, { useState, useEffect } from 'react';

export default function ChefTab({ API_BASE, authHeaders }) {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };

  useEffect(() => {
    fetchChefs();
  }, []);

  const fetchChefs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/shops?category=tiffin`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.shops) setChefs(data.shops);
    } catch (error) {
      console.error('Failed to fetch home chefs:', error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>👨‍🍳 Home Chef & Tiffin Services</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>FSSAI compliance, daily meal subscriptions, and kitchen audits.</p>
          </div>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{chefs.length} Registered Chefs</span>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading chef directory...</p>
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
                    <td colSpan="3" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No active home chef accounts registered yet.
                    </td>
                  </tr>
                ) : (
                  chefs.map((c) => (
                    <tr key={c.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{c.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {c.id}</div>
                      </td>
                      <td style={tdStyle}>Tiffin & Home Meals</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
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
