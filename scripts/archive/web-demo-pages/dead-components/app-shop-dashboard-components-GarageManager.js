import React, { useState } from 'react';

export default function GarageManager({ shop }) {
  const [activeTab, setActiveTab] = useState('job_cards');

  const [jobCards, setJobCards] = useState([
    { id: 'JC101', vehicle: 'Honda Activa (MH12AB1234)', customer: 'Ramesh', status: 'Inspection', estimatedCost: 1500 },
    { id: 'JC102', vehicle: 'Maruti Swift (MH14XY5678)', customer: 'Suresh', status: 'Repair In Progress', estimatedCost: 4500 },
    { id: 'JC103', vehicle: 'Royal Enfield (MH12CD9012)', customer: 'Amit', status: 'Ready for Pickup', estimatedCost: 3200 }
  ]);

  const [inventory, setInventory] = useState([
    { id: 'P1', name: 'Brake Pad (Honda)', stock: 12, price: 850 },
    { id: 'P2', name: 'Engine Oil 1L (Motul)', stock: 45, price: 450 },
    { id: 'P3', name: 'Swift Clutch Plate', stock: 4, price: 3200 }
  ]);

  const tabs = [
    { id: 'job_cards', label: 'Live Repair Status' },
    { id: 'new_job', label: 'Create Job Card' },
    { id: 'pickup_drop', label: 'Pickup & Drop' },
    { id: 'inventory', label: 'Spare Parts Inventory' },
    { id: 'roadside', label: '🚨 Roadside Assistance' },
    { id: 'insurance', label: 'Insurance Claim Docs' }
  ];

  return (
    <div className="garage-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>2W & 4W Garage Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Complete lifecycle management for vehicles</p>
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

      {activeTab === 'job_cards' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Active Job Cards</h3>
            <button className="btn btn-primary" onClick={() => setActiveTab('new_job')}>+ New Job Card</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {jobCards.map(jc => (
              <div key={jc.id} style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <strong>{jc.id}</strong>
                  <span className="badge" style={{ background: jc.status === 'Ready for Pickup' ? '#10b981' : '#f59e0b', color: 'white' }}>{jc.status}</span>
                </div>
                <h4 style={{ marginBottom: '0.5rem' }}>{jc.vehicle}</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>Customer: {jc.customer}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Est: ₹{jc.estimatedCost}</span>
                  <button className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}>View Details</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'new_job' && (
        <div style={{ background: 'var(--background)', padding: '2rem', borderRadius: '0.5rem' }}>
          <h3>Create New Job Card</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            <div>
              <label className="form-label">Vehicle Type</label>
              <select className="form-input">
                <option>🏍️ 2-Wheeler</option>
                <option>🚗 4-Wheeler</option>
              </select>
            </div>
            <div>
              <label className="form-label">Vehicle Registration No.</label>
              <input type="text" className="form-input" placeholder="e.g. MH12AB1234" />
            </div>
            <div>
              <label className="form-label">Customer Name</label>
              <input type="text" className="form-input" placeholder="Full Name" />
            </div>
            <div>
              <label className="form-label">Customer Phone</label>
              <input type="text" className="form-input" placeholder="+91..." />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Reported Issues</label>
              <textarea className="form-input" rows="3" placeholder="Describe problems reported by customer..."></textarea>
            </div>
            <div>
              <label className="form-label">Intake Photos (Mandatory)</label>
              <input type="file" multiple className="form-input" />
            </div>
          </div>
          <button className="btn btn-primary" style={{ marginTop: '2rem' }}>Generate Job Card</button>
        </div>
      )}

      {activeTab === 'pickup_drop' && (
        <div>
          <h3>Pickup & Drop Fleet</h3>
          <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', marginTop: '1.5rem' }}>
            <p>Live Map Integration Placeholder</p>
            <p style={{ color: 'var(--text-muted)' }}>Map shows live location of pickup agents retrieving vehicles.</p>
          </div>
        </div>
      )}

      {activeTab === 'roadside' && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '2rem', borderRadius: '0.5rem', border: '1px solid #ef4444' }}>
          <h3 style={{ color: '#ef4444', marginBottom: '1rem' }}>🚨 Active SOS Requests</h3>
          <p>No active towing requests nearby.</p>
        </div>
      )}
    </div>
  );
}
