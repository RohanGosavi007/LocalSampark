import React, { useState, useEffect, useCallback } from 'react';

// StatusBadge component for PropertiesTab
const StatusBadge = ({ status }) => {
  const map = {
    'Active': { bg: '#052e16', color: '#4ade80' },
    'Pending': { bg: '#431407', color: '#fb923c' },
    'Audit Pending': { bg: '#431407', color: '#fb923c' },
  };
  const style = map[status] || { bg: '#1e293b', color: '#94a3b8' };
  return (
    <span style={{ background: style.bg, color: style.color, padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
      {status}
    </span>
  );
};

export default function PropertiesTab({ API_BASE, authHeaders }) {
  const [properties, setProperties] = useState([]);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/properties?limit=100`, { headers: authHeaders() });
      const data = await res.json();
      const propList = data.data || data.properties || (Array.isArray(data) ? data : []);
      setProperties((Array.isArray(propList) ? propList : []).map(p => ({
        ...p,
        title: p.title || p.name || 'Property',
        landlord: p.owner_name || p.landlord || '—',
        rent: p.price ? `₹${Number(p.price).toLocaleString()}` : '—',
        type: p.listing_type || p.type || '—',
        zone: p.region_name || p.zone || '—',
        status: p.is_active ? 'Active' : 'Audit Pending'
      })));
    } catch(e) { console.error('Failed to fetch properties:', e); }
  }, [API_BASE, authHeaders]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const approveProperty = async (id) => {
    try {
      await fetch(`${API_BASE}/admin/approvals/property/${id}`, {
        method: 'PUT', headers: authHeaders(),
        body: JSON.stringify({ status: 'approved' })
      });
      setProperties(properties.map(p => p.id === id ? { ...p, status: 'Active' } : p));
    } catch(e) { console.error(e); }
  };

  const cardStyle = { background: '#1e293b', padding: '2rem', borderRadius: '1rem', border: '1px solid #334155' };
  const btnPrimary = { padding: '0.6rem 1.2rem', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
  const btnSuccess = { ...btnPrimary, background: '#10b981' };
  const btnDanger = { ...btnPrimary, background: '#ef4444' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem 2rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem' }}>House Rental & Real Estate Audit</h3>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.2rem 0 0' }}>Review, approve, and audit all property listings. Ensure compliance with broker-free policy.</p>
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>{properties.length} listings</span>
      </div>
      {properties.map(p => (
        <div key={p.id} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: '1fr auto', gap: '1.5rem', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{p.title}</h3>
              <StatusBadge status={p.status} />
            </div>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Landlord: <strong style={{ color: '#f8fafc' }}>{p.landlord}</strong> | Type: {p.type} | Zone: {p.zone}
            </p>
            <p style={{ color: '#4ade80', fontWeight: 700, margin: '0.4rem 0 0', fontSize: '1rem' }}>{p.rent}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {p.status !== 'Active' && <button onClick={() => approveProperty(p.id)} style={btnSuccess}>Approve</button>}
            <button onClick={() => alert(`Contacting landlord for ${p.title}`)} style={btnPrimary}>Contact Landlord</button>
            <button onClick={() => alert(`Removing listing: ${p.title}`)} style={btnDanger}>Remove</button>
          </div>
        </div>
      ))}
    </div>
  );
}
