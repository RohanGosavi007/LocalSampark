'use client';
import React, { useState, useEffect } from 'react';
import { API_BASE, getAuthHeaders } from '../../lib/api';
export default function TerritoriesPage() {
  const [territories, setTerritories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // No Authorization header: the session is an httpOnly cookie that the
    // patched fetch in AdminAuthContext attaches (with its CSRF header) to any
    // request aimed at our API. Reading 'admin_token' from localStorage here
    // produced the literal string "Bearer null" once the token stopped being
    // stored there.
    fetch(`${API_BASE}/admin/regions`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(data => {
        setTerritories(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', color: 'var(--ink)', background: 'var(--ground)', minHeight: '100vh', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <a href="/" style={{ color: 'var(--success)', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '0.5rem', display: 'inline-block' }}>← Back to Dashboard</a>
          <h1 style={{ fontSize: '1.9rem', fontWeight: 800, margin: 0 }}>Territories Management</h1>
        </div>
      </div>
      
      {loading ? <p>Loading territories...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {territories.map(t => (
            <div key={t.id} style={{ background: 'var(--surface-1)', padding: '1.5rem', borderRadius: '1rem', border: '1px solid var(--line)' }}>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.2rem' }}>{t.name}</h3>
              <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', margin: 0 }}>State: {t.state} | Radius: {t.radius_km}km</p>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <span style={{ background: 'var(--success-quiet)', color: 'var(--success)', padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.8rem' }}>Active</span>
              </div>
            </div>
          ))}
          {territories.length === 0 && <p style={{ color: 'var(--ink-muted)' }}>No territories found.</p>}
        </div>
      )}
    </div>
  );
}
