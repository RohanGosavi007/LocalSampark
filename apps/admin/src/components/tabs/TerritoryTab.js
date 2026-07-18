import React from 'react';
export default function TerritoryTab(props) {
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
    {/* ─── TERRITORY TAB ────────────────────────────────── */}
        
          <div>
            {/* Search & Filter Bar */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={territorySearch} onChange={e => setTerritorySearch(e.target.value)} placeholder="Search by name, pincode, or district..." style={{ ...inputStyle, flex: 1, minWidth: '250px' }} />
              <select value={territoryFilter} onChange={e => setTerritoryFilter(e.target.value)} style={{ ...inputStyle, width: '180px' }}>
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
              {selectedBulk.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{selectedBulk.length} selected</span>
                  <button onClick={() => bulkToggle(true)} style={btnSuccess}>Activate All</button>
                  <button onClick={() => bulkToggle(false)} style={btnDanger}>Deactivate All</button>
                  <button onClick={() => setSelectedBulk([])} style={{ ...btnPrimary, background: '#334155' }}>Clear</button>
                </div>
              )}
            </div>

            {/* Territory Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
              <div style={{ ...cardStyle, padding: '1.25rem', borderLeft: '4px solid #4ade80' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>Active Zones</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0', color: '#4ade80' }}>{territories.filter(t => t.is_active).length}</p>
              </div>
              <div style={{ ...cardStyle, padding: '1.25rem', borderLeft: '4px solid #64748b' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>Inactive Zones</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0', color: '#64748b' }}>{territories.filter(t => !t.is_active).length}</p>
              </div>
              <div style={{ ...cardStyle, padding: '1.25rem', borderLeft: '4px solid #4f46e5' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>Total Territories</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0' }}>{territories.length}</p>
              </div>
              <div style={{ ...cardStyle, padding: '1.25rem', borderLeft: '4px solid #f97316' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.75rem', margin: 0, fontWeight: 600 }}>With Franchise Partner</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0 0', color: '#f97316' }}>{franchisePartners.filter(f => f.region_id).length}</p>
              </div>
            </div>

            {/* Territory Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
              {territories
                .filter(t => {
                  const matchSearch = !territorySearch || t.zone.toLowerCase().includes(territorySearch.toLowerCase()) || (t.pincode || '').includes(territorySearch) || (t.district || '').toLowerCase().includes(territorySearch.toLowerCase());
                  const matchFilter = territoryFilter === 'all' || (territoryFilter === 'active' && t.is_active) || (territoryFilter === 'inactive' && !t.is_active);
                  return matchSearch && matchFilter;
                })
                .map(t => (
                <div key={t.id} style={{ ...cardStyle, borderTop: `3px solid ${t.is_active ? '#4ade80' : '#64748b'}`, opacity: t.is_active ? 1 : 0.7 }}>
                  {/* Header: Checkbox + Name + Toggle */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <input type="checkbox" checked={selectedBulk.includes(t.id)} onChange={e => { if (e.target.checked) setSelectedBulk([...selectedBulk, t.id]); else setSelectedBulk(selectedBulk.filter(x => x !== t.id)); }} style={{ width: 18, height: 18, accentColor: '#4f46e5', cursor: 'pointer' }} />
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem' }}>📍 {t.zone}</h3>
                        <p style={{ color: '#64748b', fontSize: '0.78rem', margin: '0.15rem 0 0' }}>{t.district && `${t.district}, `}{t.state} — {t.pincode || 'No pincode'}</p>
                      </div>
                    </div>
                    {/* ON/OFF Toggle Switch */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.72rem', color: t.is_active ? '#4ade80' : '#64748b', fontWeight: 700 }}>{t.is_active ? 'ACTIVE' : 'OFF'}</span>
                      <button
                        onClick={() => toggleTerritory(t.id)}
                        disabled={territoryTogglingId === t.id}
                        style={{
                          width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
                          background: t.is_active ? '#4ade80' : '#334155',
                          position: 'relative', transition: 'background 0.3s',
                          opacity: territoryTogglingId === t.id ? 0.5 : 1
                        }}
                      >
                        <div style={{
                          width: 20, height: 20, borderRadius: '50%', background: '#fff',
                          position: 'absolute', top: 3,
                          left: t.is_active ? 25 : 3, transition: 'left 0.3s',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                        }} />
                      </button>
                    </div>
                  </div>

                  {/* Franchise Partner Info */}
                  {(() => {
                    const fp = franchisePartners.find(f => f.region_id === t.id);
                    return fp ? (
                      <p style={{ color: '#94a3b8', fontSize: '0.82rem', marginBottom: '0.5rem' }}>Partner: <strong style={{ color: '#f97316' }}>{fp.partner_name}</strong> ({fp.commission_rate || 30}%)</p>
                    ) : (
                      <p style={{ color: '#64748b', fontSize: '0.82rem', marginBottom: '0.5rem' }}>No franchise partner assigned</p>
                    );
                  })()}

                  <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem' }}>
                    <div>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Shops</p>
                      <p style={{ fontWeight: 700, margin: 0 }}>{t.shops != null ? t.shops.toLocaleString() : 0}</p>
                    </div>
                    <div>
                      <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>Users</p>
                      <p style={{ fontWeight: 700, margin: 0 }}>{t.users != null ? t.users.toLocaleString() : 0}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                    <button onClick={() => setEditTerritory({ ...t })} style={{ ...btnPrimary, fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>✏️ Edit</button>
                    <button onClick={() => setAssignFranchiseModal(t)} style={{ ...btnWarning, fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}>🤝 Assign Franchise</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Territory Form */}
            <div style={cardStyle}>
              <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>➕ Add New Territory Zone</h3>
              {zoneAdded && <div style={{ background: '#052e16', color: '#4ade80', padding: '0.75rem 1rem', borderRadius: '0.5rem', marginBottom: '1rem', fontWeight: 600 }}>✓ Territory zone added successfully!</div>}
              <form onSubmit={addTerritory} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Zone Name *</label>
                  <input value={newZone.zone} onChange={e => setNewZone({ ...newZone, zone: e.target.value })} placeholder="e.g. Kalyani Nagar" style={inputStyle} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Pincode *</label>
                  <input value={newZone.pincode} onChange={e => setNewZone({ ...newZone, pincode: e.target.value })} placeholder="e.g. 411006" style={inputStyle} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>District</label>
                  <input value={newZone.district} onChange={e => setNewZone({ ...newZone, district: e.target.value })} placeholder="e.g. Pune" style={inputStyle} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>State</label>
                  <input value={newZone.state} onChange={e => setNewZone({ ...newZone, state: e.target.value })} placeholder="e.g. Maharashtra" style={inputStyle} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%' }}>
                  <input type="checkbox" checked={newZone.is_active !== false} onChange={e => setNewZone({ ...newZone, is_active: e.target.checked })} style={{ width: 18, height: 18, accentColor: '#4f46e5', cursor: 'pointer' }} />
                  <label style={{ fontSize: '0.85rem', color: '#94a3b8', cursor: 'pointer' }}>Active</label>
                </div>
                <button type="submit" style={btnPrimary}>Add Zone</button>
              </form>
            </div>

            {/* Edit Territory Modal */}
            {editTerritory && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '2rem', width: '500px', maxWidth: '90vw', border: '1px solid #334155' }}>
                  <h3 style={{ marginBottom: '1.5rem', fontSize: '1.15rem' }}>✏️ Edit Territory: {editTerritory.zone}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Zone Name</label>
                      <input value={editTerritory.zone} onChange={e => setEditTerritory({ ...editTerritory, zone: e.target.value })} style={inputStyle} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Pincode</label>
                        <input value={editTerritory.pincode} onChange={e => setEditTerritory({ ...editTerritory, pincode: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>District</label>
                        <input value={editTerritory.district} onChange={e => setEditTerritory({ ...editTerritory, district: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>State</label>
                        <input value={editTerritory.state} onChange={e => setEditTerritory({ ...editTerritory, state: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '0.35rem' }}>Latitude, Longitude</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input type="number" step="any" value={editTerritory.latitude || 0} onChange={e => setEditTerritory({ ...editTerritory, latitude: parseFloat(e.target.value) })} style={inputStyle} />
                          <input type="number" step="any" value={editTerritory.longitude || 0} onChange={e => setEditTerritory({ ...editTerritory, longitude: parseFloat(e.target.value) })} style={inputStyle} />
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ padding: '1rem', background: '#0f172a', borderRadius: '0.75rem', border: '1px solid #334155' }}>
                      <label style={{ fontSize: '0.85rem', color: '#f8fafc', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>Feature Toggles</label>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        {['delivery', 'jobs', 'rentals', 'events', 'services'].map(feature => (
                          <label key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: '#94a3b8', cursor: 'pointer', textTransform: 'capitalize' }}>
                            <input 
                              type="checkbox" 
                              checked={editTerritory.features ? editTerritory.features[feature] : true} 
                              onChange={e => setEditTerritory({
                                ...editTerritory, 
                                features: { ...(editTerritory.features || { delivery: true, jobs: true, rentals: true, events: true, services: true }), [feature]: e.target.checked }
                              })} 
                              style={{ width: 16, height: 16, accentColor: '#4f46e5' }} 
                            />
                            {feature}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Status:</label>
                      <button onClick={() => setEditTerritory({ ...editTerritory, is_active: editTerritory.is_active ? 0 : 1 })} style={{ ...btnPrimary, background: editTerritory.is_active ? '#4ade80' : '#64748b' }}>{editTerritory.is_active ? '✓ Active' : '✗ Inactive'}</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                    <button onClick={() => setEditTerritory(null)} style={{ ...btnPrimary, background: '#334155' }}>Cancel</button>
                    <button onClick={saveTerritory} style={btnSuccess}>Save Changes</button>
                  </div>
                </div>
              </div>
            )}

            {/* Assign Franchise Modal */}
            {assignFranchiseModal && (
              <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '2rem', width: '500px', maxWidth: '90vw', border: '1px solid #334155' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '1.15rem' }}>🤝 Assign Franchise Partner to: {assignFranchiseModal.zone}</h3>
                  <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Select a franchise partner to manage this territory.</p>
                  {franchisePartners.length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '2rem 0' }}>No franchise partners available. Partners must register first.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                      {franchisePartners.map(fp => (
                        <div key={fp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#0f172a', borderRadius: '0.5rem', border: fp.region_id === assignFranchiseModal.id ? '2px solid #4ade80' : '1px solid #334155' }}>
                          <div>
                            <p style={{ fontWeight: 700, margin: 0 }}>{fp.partner_name}</p>
                            <p style={{ color: '#94a3b8', fontSize: '0.8rem', margin: '0.2rem 0 0' }}>{fp.territory_name || 'Unassigned'} | {fp.partner_phone}</p>
                          </div>
                          <button onClick={() => assignFranchise(assignFranchiseModal.id, fp.id)} style={fp.region_id === assignFranchiseModal.id ? { ...btnSuccess, opacity: 0.5 } : btnPrimary} disabled={fp.region_id === assignFranchiseModal.id}>
                            {fp.region_id === assignFranchiseModal.id ? 'Assigned' : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                    <button onClick={() => setAssignFranchiseModal(null)} style={{ ...btnPrimary, background: '#334155' }}>Close</button>
                  </div>
                </div>
              </div>
            )}
          </div>
  );
}
