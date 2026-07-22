'use client';
import React, { useState, useEffect } from 'react';

export default function TerritoryTab({ API_BASE, authHeaders }) {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };

  useEffect(() => {
    fetchTerritories();
  }, []);

  const fetchTerritories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/territories`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.territories) setTerritories(data.territories);
    } catch (error) {
      console.error('Failed to fetch territories:', error);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>🗺️ Geographic Territory & Zone Management</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Configure service zones, delivery radiuses, and regional boundaries.</p>
          </div>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading territories...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Zone Name</th>
                  <th style={thStyle}>Pincode Range</th>
                  <th style={thStyle}>Active Merchants</th>
                </tr>
              </thead>
              <tbody>
                {territories.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No custom geographic zones configured yet. Defaulting to Haversine GPS radius.
                    </td>
                  </tr>
                ) : (
                  territories.map((t) => (
                    <tr key={t.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{t.zone_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {t.id}</div>
                      </td>
                      <td style={tdStyle}>{t.pincode}</td>
                      <td style={tdStyle}>{t.shop_count || 0}</td>
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
