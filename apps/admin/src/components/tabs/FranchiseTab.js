import React from 'react';
export default function FranchiseTab(props) {
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
    {/* ─── FRANCHISE TAB ────────────────────────────────── */}
        
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem' }}>🤝 Franchise Partners ({franchisePartners.length})</h3>
            </div>
            {franchisePartners.length === 0 ? (
              <div style={cardStyle}>
                <p style={{ color: '#64748b', textAlign: 'center', padding: '3rem 0' }}>No franchise partners have registered yet. Partners can register through the mobile app or website.</p>
              </div>
            ) : franchisePartners.map(f => (
              <div key={f.id} style={{ ...cardStyle, borderLeft: `4px solid ${f.status === 'active' ? '#4f46e5' : f.status === 'pending' ? '#f97316' : '#ef4444'}` }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <h3 style={{ margin: 0, fontSize: '1.15rem' }}>{f.partner_name}</h3>
                      <StatusBadge status={f.status === 'active' ? 'Active' : f.status === 'pending' ? 'Pending' : f.status === 'suspended' ? 'Suspended' : f.status} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: '2rem' }}>
                      {[
                        { l: 'Territory', v: f.territory_name || 'Unassigned' },
                        { l: 'Pincode', v: f.territory_pincode || '—' },
                        { l: 'Phone', v: f.partner_phone || '—' },
                        { l: 'Shops Onboarded', v: f.merchants_onboarded || 0 },
                      ].map(item => (
                        <div key={item.l}>
                          <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>{item.l}</p>
                          <p style={{ fontWeight: 700, margin: 0 }}>{item.v}</p>
                        </div>
                      ))}
                    </div>
                    <div style={{ marginTop: '1rem', padding: '1rem', background: '#0f172a', borderRadius: '0.75rem', display: 'flex', gap: '3rem' }}>
                      <div>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>Commission Rate</p>
                        <p style={{ color: '#4ade80', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>{f.commission_rate || 30}%</p>
                      </div>
                      <div>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>Total Earnings</p>
                        <p style={{ color: '#f97316', fontWeight: 800, fontSize: '1.25rem', margin: 0 }}>₹{(f.total_earnings || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <p style={{ color: '#64748b', fontSize: '0.8rem', margin: 0 }}>Joined</p>
                        <p style={{ color: '#94a3b8', fontWeight: 600, fontSize: '0.9rem', margin: 0 }}>{f.created_at ? new Date(f.created_at).toLocaleDateString() : '—'}</p>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <button onClick={() => { setUserFilterZone(f.territory_name || 'All'); setActiveTab('users'); }} style={btnPrimary}>View Agents in Territory</button>
                    <button onClick={() => { const code = prompt('Enter Region ID or Pincode to assign:'); if(code) { fetch(`${API_BASE}/admin/franchise-partners/${f.id}/assign`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ region: code }) }).then(() => { fetchFranchisePartners(); fetchTerritories(); }); } }} style={btnPrimary}>Assign to Territory</button>
                    <button onClick={() => { const s = f.status === 'active' ? 'suspended' : 'active'; fetch(`${API_BASE}/admin/franchise-partners/${f.id}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: s }) }).then(() => fetchFranchisePartners()); }} style={f.status === 'active' ? btnDanger : btnSuccess}>{f.status === 'active' ? 'Suspend' : 'Activate'}</button>
                    <button onClick={() => { const newRate = prompt('Enter new commission rate (%)', f.commission_rate || 30); if (newRate) { fetch(`${API_BASE}/admin/franchises/${f.id}/split`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ splitPercentage: Number(newRate) }) }).then(() => fetchFranchisePartners()); }}} style={btnWarning}>Edit Commission</button>
                    <button onClick={() => { if (f.status === 'pending') { fetch(`${API_BASE}/admin/franchise-partners/${f.id}/status`, { method: 'PUT', headers: authHeaders(), body: JSON.stringify({ status: 'terminated' }) }).then(() => fetchFranchisePartners()); } else { alert(`Partner: ${f.partner_name}\nTerritory: ${f.territory_name}\nPhone: ${f.partner_phone}\nEmail: ${f.partner_email}\nRate: ${f.commission_rate}%\nEarnings: ₹${f.total_earnings}`); }}} style={{ ...btnPrimary, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>{f.status === 'pending' ? 'Terminate' : 'Full Report'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
  );
}
