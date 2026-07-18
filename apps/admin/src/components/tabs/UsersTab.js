import React from 'react';
export default function UsersTab(props) {
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
    {/* ─── USERS TAB ────────────────────────────────────── */}
        
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', margin: 0 }}>User Directory — Live Data ({usersTotal} total)</h3>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  value={userSearch}
                  onChange={e => { setUserSearch(e.target.value); }}
                  onKeyDown={e => { if (e.key === 'Enter') fetchUsers(1, userSearch); }}
                  placeholder="Search name, phone, email..."
                  style={{ ...inputStyle, width: '250px' }}
                />
                <button onClick={() => fetchUsers(1, userSearch)} style={btnPrimary}>Search</button>
                {userSearch && <button onClick={() => { setUserSearch(''); fetchUsers(1, ''); }} style={{ ...btnPrimary, background: '#334155' }}>Clear</button>}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155' }}>
                    {['ID', 'Name', 'Phone', 'Email', 'Role', 'Joined', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>No users found. Users will appear here after they register on the platform.</td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '1rem', color: '#64748b', fontSize: '0.75rem' }}>#{typeof u.id === 'string' ? u.id.slice(0,8) : u.id}</td>
                      <td style={{ padding: '1rem', fontWeight: 700 }}>{u.name}</td>
                      <td style={{ padding: '1rem', color: '#94a3b8' }}>{u.phone}</td>
                      <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>{u.email || '—'}</td>
                      <td style={{ padding: '1rem' }}>
                        <select value={u.role} onChange={e => changeUserRole(u.id, e.target.value)} style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '0.35rem', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }}>
                          {['user', 'shop_owner', 'delivery_agent', 'franchise_partner', 'service_provider', 'admin', 'super_admin'].map(r => <option key={r} value={r}>{r.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '1rem', color: '#94a3b8', fontSize: '0.8rem' }}>{u.joined}</td>
                      <td style={{ padding: '1rem' }}><StatusBadge status={u.status} /></td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => toggleUserStatus(u.id)} style={u.status === 'Active' ? btnDanger : btnSuccess}>
                            {u.status === 'Active' ? 'Ban' : 'Unban'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {usersTotal > 50 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button disabled={usersPage <= 1} onClick={() => { setUsersPage(p => p - 1); fetchUsers(usersPage - 1, userSearch); }} style={{ ...btnPrimary, opacity: usersPage <= 1 ? 0.5 : 1 }}>← Prev</button>
                <span style={{ color: '#94a3b8', padding: '0.6rem 1rem', fontSize: '0.85rem' }}>Page {usersPage} of {Math.ceil(usersTotal / 50)}</span>
                <button disabled={usersPage >= Math.ceil(usersTotal / 50)} onClick={() => { setUsersPage(p => p + 1); fetchUsers(usersPage + 1, userSearch); }} style={{ ...btnPrimary, opacity: usersPage >= Math.ceil(usersTotal / 50) ? 0.5 : 1 }}>Next →</button>
              </div>
            )}
          </div>
  );
}
