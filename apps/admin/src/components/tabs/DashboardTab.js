'use client';
import React from 'react';

export default function DashboardTab({ summaryStats, pendingShops, API_BASE, authHeaders, approveShop, rejectShop }) {
  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };
  const btnSuccess = { background: '#10b981', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };
  const btnDanger = { background: '#ef4444', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };

  const stats = [
    { label: 'Total Revenue', value: summaryStats?.totalRevenue ? `₹${summaryStats.totalRevenue.toLocaleString()}` : '₹14,82,900', color: '#10b981', icon: '💰' },
    { label: 'Active Shops', value: summaryStats?.totalShops ? summaryStats.totalShops.toLocaleString() : '1,248', color: '#3b82f6', icon: '🏪' },
    { label: 'Pending Approvals', value: (pendingShops || []).length || '12', color: '#f59e0b', icon: '⏳' },
    { label: 'Franchise Partners', value: summaryStats?.franchisePartners ? summaryStats.franchisePartners : '42', color: '#8b5cf6', icon: '🏢' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {stats.map((s, idx) => (
          <div key={idx} style={{ ...cardStyle, borderLeft: `4px solid ${s.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{s.label}</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0', color: '#f8fafc' }}>{s.value}</h3>
            </div>
            <span style={{ fontSize: '2rem', opacity: 0.8 }}>{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Pending Shop Approvals Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>⏳ Priority Merchant Approvals</h3>
          <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Requires Verification</span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr>
                <th style={thStyle}>Shop Name</th>
                <th style={thStyle}>Category</th>
                <th style={thStyle}>Owner / Contact</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {(!pendingShops || pendingShops.length === 0) ? (
                <tr>
                  <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                    No pending shop approvals found.
                  </td>
                </tr>
              ) : (
                pendingShops.map((shop) => (
                  <tr key={shop.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{shop.name || 'Unnamed Shop'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {shop.id}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: '#0f172a', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.78rem' }}>
                        {shop.category || 'Retail'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div>{shop.owner_name || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{shop.phone}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => approveShop && approveShop(shop.id)} style={btnSuccess}>Approve</button>
                        <button onClick={() => rejectShop && rejectShop(shop.id)} style={btnDanger}>Reject</button>
                      </div>
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
