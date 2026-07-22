'use client';
import React, { useState, useEffect } from 'react';

export default function FranchiseTab({ API_BASE, authHeaders }) {
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };

  useEffect(() => {
    fetchFranchises();
  }, []);

  const fetchFranchises = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/franchises`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.franchises) setFranchises(data.franchises);
    } catch (error) {
      console.error('Failed to fetch franchises:', error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>🏢 Franchise Partner Network</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Territory revenue sharing and partner Pincode assignments.</p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading franchise network...</p>
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
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No franchise partners registered yet.
                    </td>
                  </tr>
                ) : (
                  franchises.map((f) => (
                    <tr key={f.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{f.name || f.partner_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {f.id}</div>
                      </td>
                      <td style={tdStyle}>{f.pincode || 'Unassigned'}</td>
                      <td style={tdStyle}>{f.revenue_share || '10%'}</td>
                      <td style={tdStyle}>
                        <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600 }}>
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
