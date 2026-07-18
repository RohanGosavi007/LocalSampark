import React, { useState, useEffect } from 'react';

export default function ShopCategoriesTab({ API_BASE, authHeaders }) {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    // Mock data for categories until the dedicated endpoint is fully populated
    setCategories([
      { id: 1, name: 'Grocery & Essentials', type: 'Product', count: 120, status: 'Active' },
      { id: 2, name: 'Pharmacy & Medical', type: 'Product', count: 45, status: 'Active' },
      { id: 3, name: 'Plumbing & Repairs', type: 'Service', count: 32, status: 'Active' },
      { id: 4, name: 'Tiffin Services', type: 'Hybrid', count: 18, status: 'Active' },
      { id: 5, name: 'Astrology', type: 'Appointment', count: 5, status: 'Inactive' },
    ]);
  }, []);

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
              {categories.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{c.name}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{c.type}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{c.count}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ color: c.status === 'Active' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <button style={{ ...btnPrimary, background: '#334155', padding: '0.4rem 0.8rem' }}>Edit</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
