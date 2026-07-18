import React, { useState } from 'react';

export default function FourWheelerVisitorView({ shop }) {
  const [activeTab, setActiveTab] = useState('sos');

  return (
    <div className="garage-visitor-view glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
        <button className={`btn ${activeTab === 'sos' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('sos')}>🚨 Roadside SOS</button>
        <button className={`btn ${activeTab === 'track' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('track')}>Track My Vehicle Repair</button>
        <button className={`btn ${activeTab === 'pickup' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('pickup')}>Book Service & Pickup</button>
      </div>

      {activeTab === 'sos' && (
        <div style={{ textAlign: 'center' }}>
          <h3>Stuck on the road?</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Send an emergency towing or repair request directly to this garage.</p>
          <button className="btn btn-primary" style={{ background: '#ef4444', border: 'none', padding: '1.5rem 3rem', fontSize: '1.2rem', borderRadius: '3rem' }}>
            Request Emergency Help
          </button>
        </div>
      )}

      {activeTab === 'track' && (
        <div>
          <h3>Track Repair Status</h3>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <input type="text" className="form-input" placeholder="Enter Job Card No. or Vehicle Reg No." style={{ flex: 1 }} />
            <button className="btn btn-primary">Track</button>
          </div>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '1rem' }}>View live photos of your vehicle being repaired.</p>
        </div>
      )}
    </div>
  );
}
