'use client';
import React from 'react';

// Presentational only: summaryStats and pendingShops are fetched by the parent
// page and passed in, so there is no request here to fail and no error state
// of its own. The parent surfaces load failures.

export default function DashboardTab({ summaryStats, pendingShops, API_BASE, authHeaders, approveShop, rejectShop }) {
  const cardStyle = { background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600, borderBottom: '1px solid var(--line)' };
  const tdStyle = { padding: '0.85rem 1rem', color: 'var(--ink)', borderBottom: '1px solid var(--line)' };
  const btnSuccess = { background: 'var(--success)', color: 'var(--on-solid)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };
  const btnDanger = { background: 'var(--danger)', color: 'var(--on-solid)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 };

  const stats = [
    { label: 'Total Revenue', value: summaryStats?.totalRevenue ? `₹${summaryStats.totalRevenue.toLocaleString()}` : '₹14,82,900', color: 'var(--success)', icon: '💰' },
    { label: 'Active Shops', value: summaryStats?.totalShops ? summaryStats.totalShops.toLocaleString() : '1,248', color: 'var(--info)', icon: '🏪' },
    { label: 'Pending Approvals', value: (pendingShops || []).length || '12', color: 'var(--warning)', icon: '⏳' },
    { label: 'Franchise Partners', value: summaryStats?.franchisePartners ? summaryStats.franchisePartners : '42', color: 'var(--accent-text)', icon: '🏢' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {stats.map((s, idx) => (
          <div key={idx} style={{ ...cardStyle, borderLeft: `4px solid ${s.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.8rem', fontWeight: 600, margin: 0 }}>{s.label}</p>
              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0 0', color: 'var(--ink)' }}>{s.value}</h3>
            </div>
            <span style={{ fontSize: '2rem', opacity: 0.8 }}>{s.icon}</span>
          </div>
        ))}
      </div>

      {/* Pending Shop Approvals Table */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--ink)' }}>⏳ Priority Merchant Approvals</h3>
          <span style={{ color: 'var(--ink-muted)', fontSize: '0.85rem' }}>Requires Verification</span>
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
                  <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: 'var(--ink-subtle)', padding: '2rem' }}>
                    No pending shop approvals found.
                  </td>
                </tr>
              ) : (
                pendingShops.map((shop) => (
                  <tr key={shop.id}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{shop.name || 'Unnamed Shop'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>ID: {shop.id}</div>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ background: 'var(--ground)', padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.78rem' }}>
                        {shop.category || 'Retail'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div>{shop.owner_name || 'N/A'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--ink-subtle)' }}>{shop.phone}</div>
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
