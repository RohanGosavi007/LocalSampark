import React from 'react';
export default function DashboardTab(props) {
  const { 
    summaryStats, pendingShops, platformShare, franchiseShare, agentShare, miscShare,
    franchisePartners, usersTotal, userSearch, users, usersPage, territorySearch, territoryFilter,
    selectedBulk, territories, properties, revenueChart, newZone, editTerritory, approveShop, rejectShop,
    fetchUsers, setUserSearch, changeUserRole, toggleUserStatus, setUsersPage, bulkToggle, setSelectedBulk
  } = props;

  // Mock components for inline usages
  const StatusBadge = ({status}) => <span className='badge'>{status}</span>;
  const Stat = ({label, value}) => <div className='stat'>{label}: {value}</div>;
  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
  const btnSuccess = { ...btnPrimary, background: '#10b981' };
  const btnDanger = { ...btnPrimary, background: '#ef4444' };
  const btnWarning = { ...btnPrimary, background: '#f97316' };
  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #334155', background: '#0f172a', color: '#fff' };

  return (
    {/* ─── DASHBOARD TAB ────────────────────────────────── */}
        
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              <Stat label="Total Users" value={summaryStats ? summaryStats.totalUsers.toLocaleString() : '...'} diff={summaryStats ? `${summaryStats.activeRegions} active zones` : ''} icon="👤" color="#4f46e5" />
              <Stat label="Verified Shops" value={summaryStats ? summaryStats.totalShops.toLocaleString() : '...'} diff="" icon="🏪" color="#10b981" />
              <Stat label="Franchise Partners" value={summaryStats ? summaryStats.totalFranchises.toLocaleString() : '...'} diff={summaryStats ? `${summaryStats.activeFranchises} active` : ''} icon="🤝" color="#8b5cf6" />
              <Stat label="Zones Active" value={summaryStats ? `${summaryStats.activeRegions} / ${summaryStats.totalRegions}` : '...'} diff={summaryStats ? `${summaryStats.totalRegions - summaryStats.activeRegions} pending` : ''} icon="🗺️" color="#ec4899" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              {/* Pending Shop Approvals */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>🏪 Pending Shop Approvals</h3>
                {pendingShops.length === 0 ? <p style={{ color: '#64748b' }}>No pending approvals.</p> : pendingShops.map(shop => (
                  <div key={shop.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem', background: '#0f172a', borderRadius: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0, fontSize: '0.9rem' }}>{shop.name}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>{shop.category} | {shop.zone}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => approveShop(shop.id)} style={btnSuccess}>Approve</button>
                      <button onClick={() => rejectShop(shop.id)} style={btnDanger}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Revenue Summary */}
              <div style={cardStyle}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem' }}>📊 Revenue Split — This Month</h3>
                {[
                  { label: 'Platform (LocalSampark)', val: `₹${((summaryStats?.totalRevenue || 0) * (platformShare/100)).toLocaleString()}`, pct: platformShare, color: '#4f46e5' },
                  { label: 'Franchise Partners', val: `₹${((summaryStats?.totalRevenue || 0) * (franchiseShare/100)).toLocaleString()}`, pct: franchiseShare, color: '#10b981' },
                  { label: 'Delivery Agents', val: `₹${((summaryStats?.totalRevenue || 0) * (agentShare/100)).toLocaleString()}`, pct: agentShare, color: '#f97316' },
                  { label: 'Misc / Reserve', val: `₹${((summaryStats?.totalRevenue || 0) * (miscShare/100)).toLocaleString()}`, pct: miscShare, color: '#8b5cf6' },
                ].map(r => (
                  <div key={r.label} style={{ marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
                      <span style={{ color: '#94a3b8' }}>{r.label}</span>
                      <span style={{ fontWeight: 700 }}>{r.val} ({r.pct}%)</span>
                    </div>
                    <div style={{ height: '8px', background: '#334155', borderRadius: '50px', overflow: 'hidden' }}>
                      <div style={{ width: `${r.pct}%`, height: '100%', background: r.color, borderRadius: '50px' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Franchise Performance — Live */}
            <div style={cardStyle}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem' }}>🤝 Franchise Partner Performance</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #334155' }}>
                      {['Partner', 'Territory', 'Commission Rate', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {franchisePartners.length === 0 ? (
                      <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>No franchise partners registered yet.</td></tr>
                    ) : franchisePartners.map(f => (
                      <tr key={f.id} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{f.partner_name}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{f.territory_name || 'Unassigned'}</td>
                        <td style={{ padding: '0.85rem 1rem', color: '#f97316', fontWeight: 700 }}>{f.commission_rate || 30}%</td>
                        <td style={{ padding: '0.85rem 1rem' }}><StatusBadge status={f.status === 'active' ? 'Active' : f.status === 'pending' ? 'Pending' : f.status} /></td>
                        <td style={{ padding: '0.85rem 1rem' }}>
                          <div style={{ display: 'flex', gap: '0.4rem' }}>
                            <button onClick={() => { const newStatus = f.status === 'active' ? 'suspended' : 'active'; fetch(`${API_BASE}/admin/franchise-partners/${f.id}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: newStatus }) }).then(() => fetchFranchisePartners()); }} style={f.status === 'active' ? btnDanger : btnSuccess}>{f.status === 'active' ? 'Suspend' : 'Activate'}</button>
                          </div>
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
