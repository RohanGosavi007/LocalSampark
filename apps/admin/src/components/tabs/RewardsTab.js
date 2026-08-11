import React, { useState, useEffect } from 'react';

export default function RewardsTab({ API_BASE, authHeaders }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData([
      { id: 'r1', module: 'Active Referral Campaigns', count: 3, status: 'Active' },
      { id: 'r2', module: 'Pending Reward Payouts', count: 412, status: 'Audit Pending' },
      { id: 'r3', module: 'Loyalty Points System', count: 8900, status: 'Active' },
    ]);
    setLoading(false);
  }, []);

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };
  const btnPrimary = { padding: '0.4rem 0.8rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>🎁 Earn & Rewards Systems</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Audit loyalty points, referral campaigns, and bulk payouts.</p>
          </div>
          <button style={btnPrimary}>Configure Conversion Rate</button>
        </div>
        
        {loading ? <p style={{ color: '#94a3b8' }}>Loading rewards metrics...</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Sub-Module</th>
                  <th style={thStyle}>Active Metrics</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.map(d => (
                  <tr key={d.id}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#f8fafc' }}>{d.module}</td>
                    <td style={tdStyle}>{d.count}</td>
                    <td style={tdStyle}>
                      <span style={{ color: d.status === 'Active' ? '#4ade80' : '#fb923c', fontWeight: 700 }}>{d.status}</span>
                    </td>
                    <td style={tdStyle}><button style={{ ...btnPrimary, background: '#334155' }}>Manage</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
