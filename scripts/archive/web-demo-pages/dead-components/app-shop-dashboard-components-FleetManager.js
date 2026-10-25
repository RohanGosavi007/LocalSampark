import React from 'react';

export default function FleetManager({ shop }) {
  return (
    <div className="glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <h2>🚚 Fleet & Delivery Management</h2>
        <button className="btn btn-primary">+ Add Delivery Agent</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        <div style={{ background: 'var(--background)', borderRadius: '0.5rem', border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)', background: 'var(--nav-bg)' }}>
            <strong>Live Map Tracker</strong>
          </div>
          <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e5e7eb', color: '#6b7280' }}>
            [Interactive Map Component]
          </div>
        </div>

        <div>
          <h3 style={{ marginBottom: '1rem' }}>Active Agents</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {['Ramesh (Agent #101)', 'Suresh (Agent #102)'].map((agent, i) => (
              <div key={i} style={{ border: '1px solid var(--border)', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontWeight: 'bold' }}>{agent}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Status: {i === 0 ? '🟢 On Delivery (ETA 10 min)' : '🟡 Waiting for Order'}</div>
                <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Orders Today: {i === 0 ? 5 : 2}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
