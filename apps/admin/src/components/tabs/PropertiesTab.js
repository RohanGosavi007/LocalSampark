import React, { useState, useEffect } from 'react';
import TabError from '../TabError';
import { fetchJson } from '../../lib/api';

const cardStyle = { background: 'var(--surface-1)', padding: '2rem', borderRadius: '1rem', border: '1px solid var(--line)' };
const btnPrimary = { padding: '0.6rem 1.2rem', background: 'var(--accent)', border: 'none', color: 'var(--on-solid)', borderRadius: '0.5rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' };
const btnDanger = { ...btnPrimary, background: 'var(--danger)' };

export default function PropertiesTab({ API_BASE, authHeaders }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchJson(`${API_BASE}/admin/properties`, { headers: authHeaders() });
      setProperties(data.properties || data.data || []);
    } catch (e) {
      console.error(e);
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleApproval = async (id, status) => {
    try {
      const res = await fetch(`${API_BASE}/admin/approvals/property/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        setProperties(properties.map(p => p.id === id ? { ...p, status } : p));
      }
    } catch (e) {
      console.error(e);
      setError(e);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <TabError error={error} onRetry={typeof fetchData === 'function' ? fetchData : undefined} />
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--ink)' }}>🏡 Real Estate & House Rental Audit</h3>
            <p style={{ color: 'var(--ink-subtle)', fontSize: '0.85rem', margin: 0 }}>Review and audit property listings for rent and sale across active zones.</p>
          </div>
          <button onClick={fetchProperties} style={btnPrimary}>{loading ? 'Loading...' : 'Refresh'}</button>
        </div>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--line)' }}>
                {['Title', 'Type', 'Listing', 'Price', 'Address', 'Status', 'Actions'].map(h => 
                  <th key={h} style={{ textAlign: 'left', padding: '0.75rem 1rem', color: 'var(--ink-muted)', fontWeight: 600 }}>{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {properties.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-subtle)' }}>No active property listings found.</td></tr>
              ) : properties.map((prop) => (
                <tr key={prop.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: 'var(--ink)' }}>{prop.title}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{prop.property_type}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-subtle)' }}>{prop.listing_type}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--success)', fontWeight: 700 }}>₹{Number(prop.price).toLocaleString()}</td>
                  <td style={{ padding: '0.85rem 1rem', color: 'var(--ink-muted)' }}>{prop.address}</td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <span style={{ 
                      background: prop.status === 'approved' ? 'var(--success-quiet)' : (prop.status === 'rejected' ? 'var(--danger-quiet)' : 'var(--warning-quiet)'), 
                      color: prop.status === 'approved' ? 'var(--success)' : (prop.status === 'rejected' ? 'var(--danger)' : 'var(--warning)'), 
                      padding: '0.25rem 0.7rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700, whiteSpace: 'nowrap'
                    }}>
                      {prop.status ? prop.status.toUpperCase() : 'PENDING'}
                    </span>
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => handleApproval(prop.id, 'approved')} style={{...btnPrimary, background: 'var(--success)', padding: '0.4rem 0.8rem', fontSize: '0.75rem'}}>Approve</button>
                      <button onClick={() => handleApproval(prop.id, 'rejected')} style={{...btnDanger, padding: '0.4rem 0.8rem', fontSize: '0.75rem'}}>Reject</button>
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
