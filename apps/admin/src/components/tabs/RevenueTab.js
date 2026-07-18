import React, { useState, useEffect, useCallback } from 'react';

export default function RevenueTab({ 
  API_BASE, authHeaders, 
  platformShare, setPlatformShare, 
  franchiseShare, setFranchiseShare, 
  agentShare, setAgentShare, 
  miscShare, setMiscShare,
  revenueChart, setRevenueChart 
}) {
  const totalShare = +platformShare + +franchiseShare + +agentShare + +miscShare;
  
  const fetchRevenueChart = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/revenue/chart`, { headers: authHeaders() });
      const data = await res.json();
      if (data) setRevenueChart(data);
    } catch(e) { console.error(e); }
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    fetchRevenueChart();
  }, [fetchRevenueChart]);

  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Escrow and Convenience Fee Stats Banner */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        {[
          { label: 'Total Escrow Balances', val: '₹14,820', sub: 'In-app wallets float', color: '#818cf8', icon: '🔒' },
          { label: 'Convenience Fees Generated', val: '₹2,450', sub: 'From utility bill checkouts', color: '#34d399', icon: '🎟️' },
          { label: 'Pending Payouts', val: '₹8,350', sub: 'To local shop merchants', color: '#fb923c', icon: '📤' },
        ].map(stat => (
          <div key={stat.label} style={{ ...cardStyle, borderLeft: `4px solid ${stat.color}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0, fontWeight: 'bold' }}>{stat.label}</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.2rem 0' }}>{stat.val}</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.72rem', margin: 0 }}>{stat.sub}</p>
            </div>
            <span style={{ fontSize: '1.8rem' }}>{stat.icon}</span>
          </div>
        ))}
      </div>

      {/* Commission Editor */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: '0.5rem', fontSize: '1.1rem' }}>💰 Global Commission Split Editor</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.75rem' }}>Adjust the revenue split percentages. Total must equal 100%.</p>
        {[
          { label: 'Platform Share (LocalSampark)', val: platformShare, setter: setPlatformShare, color: '#4f46e5' },
          { label: 'Franchise Partner Share', val: franchiseShare, setter: setFranchiseShare, color: '#10b981' },
          { label: 'Delivery Agent Share', val: agentShare, setter: setAgentShare, color: '#f97316' },
          { label: 'Misc / Reserve Fund', val: miscShare, setter: setMiscShare, color: '#8b5cf6' },
        ].map(item => (
          <div key={item.label} style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              <span style={{ color: '#94a3b8' }}>{item.label}</span>
              <strong style={{ color: item.color }}>{item.val}%</strong>
            </div>
            <input type="range" min={0} max={100} value={item.val}
              onChange={e => item.setter(+e.target.value)}
              style={{ width: '100%', accentColor: item.color }} />
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
          <span style={{ color: totalShare === 100 ? '#4ade80' : '#ef4444', fontWeight: 700 }}>
            Total: {totalShare}% {totalShare !== 100 ? '⚠️ Must equal 100%' : '✓ Valid'}
          </span>
          <button
            disabled={totalShare !== 100}
            onClick={() => {
              fetch(`${API_BASE}/admin/config/global_commission_split`, {
                method: 'PUT', headers: authHeaders(),
                body: JSON.stringify({ value: { platformShare, franchiseShare, agentShare, miscShare }, category: 'revenue' })
              }).then(res => res.json()).then(data => {
                if (!data.error) alert('✅ Commission split saved globally!');
                else alert(data.error);
              }).catch(console.error);
            }}
            style={{ ...btnPrimary, opacity: totalShare !== 100 ? 0.5 : 1, cursor: totalShare !== 100 ? 'not-allowed' : 'pointer' }}
          >
            Save Commission Split
          </button>
        </div>
      </div>

      {/* Revenue Table */}
      <div style={cardStyle}>
        <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>📊 Revenue Breakdown</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155' }}>
                {['Period', 'Gross Revenue', `Platform (${platformShare}%)`, `Franchise (${franchiseShare}%)`, `Agents (${agentShare}%)`, `Misc (${miscShare}%)`].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(revenueChart?.data || []).map(r => {
                const gross = (r.platform || 0) + (r.franchise || 0); // Simplified gross
                const p = (gross * platformShare) / 100;
                const f = (gross * franchiseShare) / 100;
                const a = (gross * agentShare) / 100;
                const m = (gross * miscShare) / 100;
                return (
                  <tr key={r.name} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#4ade80', fontWeight: 700 }}>₹{gross.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#818cf8' }}>₹{p.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#34d399' }}>₹{f.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#fb923c' }}>₹{a.toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#c084fc' }}>₹{m.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
