'use client';
import React, { useState, useEffect } from 'react';

export default function ShopsTab({ API_BASE, authHeaders, approveShop, rejectShop }) {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };
  const btnSuccess = { background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };
  const btnDanger = { background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/shops?limit=50`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.shops) setShops(data.shops);
    } catch (error) {
      console.error('Failed to fetch shops:', error);
    }
    setLoading(false);
  };

  const filteredShops = filterCategory === 'all' 
    ? shops 
    : shops.filter(s => s.category?.toLowerCase() === filterCategory.toLowerCase());

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>🏪 Shop Directory Management</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>Review, approve, and manage registered local merchants.</p>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '0.5rem', padding: '0.4rem 0.8rem' }}
          >
            <option value="all">All Categories</option>
            <option value="grocery">Grocery</option>
            <option value="pharmacy">Pharmacy</option>
            <option value="restaurant">Restaurant</option>
            <option value="electronics">Electronics</option>
          </select>
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading directory...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Shop & Details</th>
                  <th style={thStyle}>Category</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredShops.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No shops found in database.
                    </td>
                  </tr>
                ) : (
                  filteredShops.map((s) => (
                    <tr key={s.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{s.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Address: {s.address || 'Local'}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ background: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.78rem' }}>
                          {s.category}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: s.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                          color: s.status === 'approved' ? '#34d399' : '#fbbf24',
                          padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600
                        }}>
                          {(s.status || 'pending').toUpperCase()}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {s.status !== 'approved' && (
                            <button onClick={() => approveShop && approveShop(s.id)} style={btnSuccess}>Approve</button>
                          )}
                          <button onClick={() => rejectShop && rejectShop(s.id)} style={btnDanger}>Delete</button>
                        </div>
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
