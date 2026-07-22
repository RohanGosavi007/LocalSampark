import React, { useState, useEffect } from 'react';

const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
const statCardStyle = { ...cardStyle, flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnWarning = { ...btnPrimary, background: '#f59e0b' };

export default function SubscriptionsTab({ API_BASE, authHeaders }) {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ mrr: 0, active: 0, churned: 0 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/subscriptions/all`, { headers: authHeaders() });
      if (res.ok) {
        const data = await res.json();
        const subs = data.data || [];
        setSubscriptions(subs);
        
        let mrr = 0, active = 0, churned = 0;
        subs.forEach(s => {
          if (s.status === 'active') {
            active++;
            mrr += parseFloat(s.price_monthly || 0);
          } else if (s.status === 'cancelled') {
            churned++;
          }
        });
        setStats({ mrr, active, churned });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem' }}>💼 Vendor CRM SaaS Management</h2>
          <p style={{ color: '#94a3b8', margin: 0 }}>Monitor multi-tenant subscription revenue and handle grace periods.</p>
        </div>
        <button onClick={fetchData} style={btnPrimary}>{loading ? 'Refreshing...' : 'Refresh Metrics'}</button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={statCardStyle}>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Monthly Recurring Revenue (MRR)</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#4ade80' }}>₹{stats.mrr.toLocaleString()}</span>
        </div>
        <div style={statCardStyle}>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Active Vendors</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#f8fafc' }}>{stats.active}</span>
        </div>
        <div style={statCardStyle}>
          <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase' }}>Churned Subscriptions</span>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>{stats.churned}</span>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.1rem' }}>Active & Past Vendor Subscriptions</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Shop Name</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Plan Tier</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Status</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Period Ends</th>
                <th style={{ textAlign: 'left', padding: '1rem', color: '#94a3b8', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {subscriptions.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No SaaS subscriptions found.</td></tr>
              ) : subscriptions.map((item, i) => (
                <tr key={item.id || i} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '1rem', fontWeight: 700, color: '#f8fafc' }}>{item.shop_name || '—'}</td>
                  <td style={{ padding: '1rem', color: '#94a3b8' }}>
                    {item.plan_name} <br/>
                    <small style={{ color: '#64748b' }}>₹{item.price_monthly}/mo</small>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ 
                      background: item.status === 'active' ? '#052e16' : item.status === 'pending' ? '#422006' : '#450a0a', 
                      color: item.status === 'active' ? '#4ade80' : item.status === 'pending' ? '#facc15' : '#f87171', 
                      padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700 
                    }}>
                      {(item.status || 'Unknown').toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', color: '#cbd5e1' }}>
                    {item.current_period_end ? new Date(item.current_period_end).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {item.status !== 'active' && (
                      <button style={{ ...btnWarning, padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>Grant Grace Period</button>
                    )}
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
