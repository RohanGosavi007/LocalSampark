'use client';
import React, { useState, useEffect } from 'react';

export default function UsersTab({ API_BASE, authHeaders }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const cardStyle = { background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', border: '1px solid #334155' };
  const thStyle = { textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #334155' };
  const tdStyle = { padding: '0.85rem 1rem', color: '#cbd5e1', borderBottom: '1px solid #1e293b' };

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

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.phone_number?.includes(search)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: '#f8fafc' }}>👥 Platform User Directory</h3>
            <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>View all registered consumer accounts and credentials.</p>
          </div>

          <input
            type="text"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ background: '#0f172a', border: '1px solid #334155', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '0.5rem' }}
          />
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8' }}>Loading users...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>User Name</th>
                  <th style={thStyle}>Contact Details</th>
                  <th style={thStyle}>Role</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ ...tdStyle, textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                      No users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.full_name || 'Anonymous User'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>ID: {u.id}</div>
                      </td>
                      <td style={tdStyle}>
                        <div>{u.email || 'No email registered'}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.phone_number}</div>
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          background: 'rgba(59, 130, 246, 0.2)', color: '#93c5fd',
                          padding: '0.2rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', fontWeight: 600
                        }}>
                          {(u.role || 'user').toUpperCase()}
                        </span>
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
