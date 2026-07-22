'use client';
import React, { useState, useEffect } from 'react';

export default function RBACTab({ franchisePartners, API_BASE, authHeaders }) {
  const [activeTier, setActiveTier] = useState('tier1'); // 'tier1' (Global/Franchise), 'tier2' (Shop Staff), 'tier3' (Society/Delivery)
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Styles
  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };
  const buttonStyle = { background: '#4f46e5', color: '#fff', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' };
  const tabBtnStyle = (active) => ({
    padding: '0.6rem 1.2rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: active ? '#4f46e5' : '#0f172a',
    color: active ? '#fff' : '#94a3b8',
    fontWeight: 600,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users?limit=50`, {
        headers: authHeaders()
      });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
    setLoading(false);
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await fetch(`${API_BASE}/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ role: newRole })
      });
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  // Filter users according to active tier tab
  const getFilteredUsers = () => {
    return users.filter(u => {
      const matchesSearch = u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            u.phone_number?.includes(searchQuery);
      if (!matchesSearch) return false;

      if (activeTier === 'tier1') {
        return ['super_admin', 'admin', 'territory_admin', 'area_agent', 'moderator'].includes(u.role);
      } else if (activeTier === 'tier2') {
        return ['shop_owner', 'chef', 'doctor', 'service_provider'].includes(u.role) || u.role === 'user';
      } else {
        return ['society_admin', 'security_guard', 'resident_member', 'delivery_agent', 'field_agent'].includes(u.role);
      }
    });
  };

  const filteredUsers = getFilteredUsers();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header & Description */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', marginBottom: '0.25rem', color: '#f8fafc' }}>
              🔐 Multi-Tiered Role-Based Access Control (RBAC)
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
              Manage global administrative privileges, shop-level staff scopes (Chefs, Medical), and society roles.
            </p>
          </div>
          <input
            type="text"
            placeholder="🔍 Search user by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: '#0f172a',
              border: '1px solid #334155',
              color: '#fff',
              padding: '0.5rem 1rem',
              borderRadius: '0.5rem',
              fontSize: '0.85rem',
              width: '280px'
            }}
          />
        </div>

        {/* Tier Tabs Navigation */}
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', borderBottom: '1px solid #334155', pb: '0.75rem' }}>
          <button style={tabBtnStyle(activeTier === 'tier1')} onClick={() => setActiveTier('tier1')}>
            🌐 Tier 1: Global & Territory
          </button>
          <button style={tabBtnStyle(activeTier === 'tier2')} onClick={() => setActiveTier('tier2')}>
            🏪 Tier 2: Shop Staff & Services (Chefs, Doctors)
          </button>
          <button style={tabBtnStyle(activeTier === 'tier3')} onClick={() => setActiveTier('tier3')}>
            🏢 Tier 3: Society & Logistics
          </button>
        </div>
      </div>

      {/* Main Table Content */}
      <div style={cardStyle}>
        {/* Tier Specific Banner */}
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#0f172a', borderRadius: '0.5rem', borderLeft: '4px solid #4f46e5' }}>
          {activeTier === 'tier1' && (
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              <strong>Platform Scope:</strong> Super Admins, Territory Admins, and Franchise Partners bound to Pincode/Regions.
            </p>
          )}
          {activeTier === 'tier2' && (
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              <strong>Merchant Data Silo Scope:</strong> Roles like <code>Chef</code> and <code>Doctor</code> are scoped to specific <code>shop_id</code> instances to enforce data protection.
            </p>
          )}
          {activeTier === 'tier3' && (
            <p style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              <strong>Hyperlocal & Logistics Scope:</strong> Society Admins, Security Guards, and Delivery Agents.
            </p>
          )}
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', padding: '1rem' }}>Loading access controls...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>User & Contact</th>
                  <th style={thStyle}>Current Role</th>
                  <th style={thStyle}>Scope / Binding</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No users found matching current tier filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.full_name || 'Unknown Name'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.email || u.phone_number}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: u.role === 'super_admin' ? 'rgba(239, 68, 68, 0.2)' :
                                     u.role === 'chef' ? 'rgba(249, 115, 22, 0.2)' :
                                     u.role === 'doctor' ? 'rgba(20, 184, 166, 0.2)' :
                                     u.role === 'territory_admin' ? 'rgba(139, 92, 246, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                          color: u.role === 'super_admin' ? '#fca5a5' :
                                 u.role === 'chef' ? '#ffedd5' :
                                 u.role === 'doctor' ? '#99f6e4' :
                                 u.role === 'territory_admin' ? '#c4b5fd' : '#93c5fd',
                          padding: '0.25rem 0.6rem', borderRadius: '0.35rem', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase'
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                          {u.region_id ? `Region: ${u.region_id}` : u.shop_id ? `Shop ID: ${u.shop_id}` : 'Global Scope'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {editingUser === u.id ? (
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <select
                              style={{ background: '#0f172a', color: '#fff', border: '1px solid #334155', borderRadius: '0.35rem', padding: '0.35rem' }}
                              defaultValue={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            >
                              {activeTier === 'tier1' && (
                                <>
                                  <option value="user">User</option>
                                  <option value="admin">Admin</option>
                                  <option value="super_admin">Super Admin</option>
                                  <option value="territory_admin">Territory Admin</option>
                                  <option value="area_agent">Area Agent</option>
                                  <option value="moderator">Moderator</option>
                                </>
                              )}
                              {activeTier === 'tier2' && (
                                <>
                                  <option value="shop_owner">Shop Owner</option>
                                  <option value="chef">Chef (Kitchen KDS Scope)</option>
                                  <option value="doctor">Doctor (Medical EMR Scope)</option>
                                  <option value="service_provider">Service Provider</option>
                                  <option value="user">Standard User</option>
                                </>
                              )}
                              {activeTier === 'tier3' && (
                                <>
                                  <option value="society_admin">Society Admin</option>
                                  <option value="security_guard">Security Guard</option>
                                  <option value="resident_member">Resident Member</option>
                                  <option value="delivery_agent">Delivery Agent</option>
                                  <option value="field_agent">Field Agent</option>
                                </>
                              )}
                            </select>
                            <button onClick={() => setEditingUser(null)} style={{ ...buttonStyle, background: '#64748b' }}>Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingUser(u.id)} style={buttonStyle}>Modify Role</button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
