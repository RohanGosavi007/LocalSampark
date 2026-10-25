import React, { useState } from 'react';

export default function HomeServiceManager({ shop }) {
  const [activeTab, setActiveTab] = useState('live_tracking');

  const tabs = [
    { id: 'live_tracking', label: '📍 Live Agent Tracking' },
    { id: 'proof_of_work', label: '📸 Proof of Work' },
    { id: 'amc_plans', label: 'AMC Maintenance Contracts' },
    { id: 'billing', label: 'Hourly vs Fixed Billing' }
  ];

  return (
    <div className="home-service-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Home & Professional Services Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage agents, tracking, and AMC contracts</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
        {tabs.map(t => (
          <button 
            key={t.id} 
            className={`btn ${activeTab === t.id ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab(t.id)}
            style={{ whiteSpace: 'nowrap' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'live_tracking' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Live Agent Map</h3>
            <button className="btn btn-primary">Dispatch Agent</button>
          </div>
          <div style={{ height: '400px', background: '#e2e8f0', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#64748b', fontSize: '1.2rem' }}>[ Uber-Style Live Tracking Map Rendered Here ]</span>
          </div>
        </div>
      )}

      {activeTab === 'proof_of_work' && (
        <div>
          <h3>Job Completion Proof</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>Technicians must upload before/after photos of the completed job before marking it as done.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Dummy data */}
            <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <strong>Job #401 - AC Gas Leak Repair</strong>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <div style={{ flex: 1, height: '100px', background: '#ccc', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>Before</div>
                <div style={{ flex: 1, height: '100px', background: '#ccc', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>After</div>
              </div>
              <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Approve & Send Bill</button>
            </div>
          </div>
        </div>
      )}

      {/* Add logic for other tabs... */}
    </div>
  );
}
