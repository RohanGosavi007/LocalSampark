import React from 'react';

export default function RBACTab({ franchisePartners }) {
  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={cardStyle}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>🔐 Role-Based Access Control (RBAC)</h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Manage admin roles, permissions, and access levels. Assign territory-specific admin roles and control feature access per role.</p>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #334155' }}>
              {['Role', 'Description', 'Permissions', 'Users Assigned'].map(h => <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: '#94a3b8', fontWeight: 600 }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {[
                { role: 'super_admin', desc: 'Full platform access', perms: 'All', users: '1' },
                { role: 'admin', desc: 'Platform management (no billing)', perms: 'Users, Shops, Territories', users: '—' },
                { role: 'territory_admin', desc: 'Territory-specific management', perms: 'Local shops, users, events', users: '—' },
                { role: 'franchise_partner', desc: 'Franchise operations', perms: 'Onboard shops, earn commission', users: (franchisePartners?.length || 0).toString() },
                { role: 'shop_owner', desc: 'Shop management', perms: 'Own shop, products, orders', users: '—' },
                { role: 'delivery_agent', desc: 'Delivery operations', perms: 'Accept/deliver orders', users: '—' },
                { role: 'service_provider', desc: 'Service listings', perms: 'Own services, bookings', users: '—' },
              ].map(r => (
                <tr key={r.role} style={{ borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#818cf8' }}>{r.role.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#94a3b8' }}>{r.desc}</td>
                  <td style={{ padding: '0.85rem 1rem', color: '#64748b', fontSize: '0.82rem' }}>{r.perms}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>{r.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
