import React, { useState, useEffect } from 'react';

export default function ShopCategoriesTab({ API_BASE, authHeaders }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/shop-categories`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (error) {
      console.error('Failed to fetch shop categories:', error);
    }
    setLoading(false);
  };

  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0 }}>🏪 Shop Categories Manager</h3>
          <button style={btnPrimary}>+ Add New Category</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Category Name', 'Business Type', 'Registered Shops', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Loading categories...</td></tr>
              ) : categories.length === 0 ? (
                <tr><td colSpan="5" style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>No categories configured.</td></tr>
              ) : (
                categories.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{c.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{c.business_model || 'Standard'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{c.commission_percent ? `${c.commission_percent}%` : 'N/A'}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ color: c.is_active ? '#4ade80' : '#f87171', fontWeight: 700 }}>{c.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <button style={{ ...btnPrimary, background: '#334155', padding: '0.4rem 0.8rem' }}>Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
