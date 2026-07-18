import React from 'react';
export default function ShopsTab(props) {
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
    {/* ─── SHOPS TAB ────────────────────────────────────── */}
        
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {shops.map(s => (
              <div key={s.id} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr auto', gap: '2rem', alignItems: 'center' }}>
                <div>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h3 style={{ fontSize: '1rem', margin: 0 }}>{s.name}</h3>
                    <StatusBadge status={s.status} />
                  </div>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                    Owner: <strong style={{ color: '#f8fafc' }}>{s.owner}</strong> | Category: {s.category} | Zone: {s.zone} | Pincode: {s.pincode}
                  </p>
                  <p style={{ color: '#64748b', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                    Orders: {s.orders} | Revenue: <span style={{ color: '#4ade80' }}>{s.revenue}</span>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {s.status === 'Pending' ? (
                    <>
                      <button onClick={() => approveShop(s.id)} style={btnSuccess}>✓ Approve</button>
                      <button onClick={() => rejectShop(s.id)} style={btnDanger}>✗ Reject</button>
                    </>
                  ) : (
                    <button onClick={() => alert(`Shop "${s.name}" flagged for review`)} style={btnWarning}>Flag</button>
                  )}
                  <button onClick={() => alert(`Viewing full details for ${s.name}`)} style={{ ...btnPrimary, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8' }}>Details</button>
                </div>
              </div>
            ))}
          </div>
  );
}
