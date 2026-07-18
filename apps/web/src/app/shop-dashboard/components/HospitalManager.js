import React, { useState } from 'react';

export default function HospitalManager({ shop }) {
  const tier = shop?.category_details?.hospital_tier || 'tier_1'; // tier_1, tier_2, tier_3
  const [activeTab, setActiveTab] = useState('opd_queue');

  // Dummy Data for deep implementation
  const [departments, setDepartments] = useState([
    { id: 'd1', name: 'Cardiology', hod: 'Dr. Sharma', timings: '10AM-2PM' },
    { id: 'd2', name: 'Orthopedics', hod: 'Dr. Mehta', timings: '4PM-8PM' }
  ]);
  const [doctors, setDoctors] = useState([
    { id: 'doc1', name: 'Dr. Sharma', dept: 'Cardiology', fee: 500, status: 'Available' },
    { id: 'doc2', name: 'Dr. Mehta', dept: 'Orthopedics', fee: 400, status: 'In OPD' }
  ]);
  const [opdQueue, setOpdQueue] = useState([
    { id: 't14', token: 14, patient: 'Ramesh K.', doc: 'Dr. Sharma', status: 'In Consultation' },
    { id: 't15', token: 15, patient: 'Suresh P.', doc: 'Dr. Sharma', status: 'Waiting' },
    { id: 't16', token: 16, patient: 'Amit V.', doc: 'Dr. Sharma', status: 'Waiting' }
  ]);
  const [beds, setBeds] = useState([
    { type: 'General', total: 20, available: 12 },
    { type: 'Semi-Private', total: 8, available: 3 },
    { type: 'ICU', total: 4, available: 1 }
  ]);

  const tabs = [
    { id: 'opd_queue', label: 'Live OPD Queue', tiers: ['tier_1', 'tier_2', 'tier_3'] },
    { id: 'doctors', label: 'Doctor Roster', tiers: ['tier_1', 'tier_2', 'tier_3'] },
    { id: 'departments', label: 'Departments', tiers: ['tier_2', 'tier_3'] },
    { id: 'emr', label: 'Patient EMR', tiers: ['tier_1', 'tier_2', 'tier_3'] },
    { id: 'lab', label: 'Lab & Pharmacy', tiers: ['tier_2', 'tier_3'] },
    { id: 'ward', label: 'Bed/Ward Board', tiers: ['tier_3'] },
    { id: 'ambulance', label: 'Ambulance & Blood Bank', tiers: ['tier_3'] },
    { id: 'insurance', label: 'Insurance / TPA', tiers: ['tier_2', 'tier_3'] }
  ];

  const visibleTabs = tabs.filter(t => t.tiers.includes(tier));

  return (
    <div className="hospital-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Hospital & OPD Manager</h2>
          <span className="badge" style={{ background: 'var(--primary)', color: 'white', fontSize: '0.8rem' }}>
            {tier === 'tier_1' ? 'Clinic Mode' : tier === 'tier_2' ? 'Polyclinic Mode' : 'Full Hospital Mode'}
          </span>
        </div>
        <button className="btn btn-danger">🚨 Emergency SOS Alert</button>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
        {visibleTabs.map(t => (
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

      {activeTab === 'opd_queue' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Live Token Tracking</h3>
            <button className="btn btn-primary">+ Register Walk-in Patient</button>
          </div>
          <div style={{ display: 'flex', gap: '2rem' }}>
            <div style={{ flex: 1, background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem' }}>
              <h4 style={{ color: '#ef4444', marginBottom: '1rem' }}>Current Token: #14</h4>
              {opdQueue.map(q => (
                <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <strong>#{q.token} - {q.patient}</strong>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{q.doc}</div>
                  </div>
                  <div>
                    <span className="badge" style={{ background: q.status === 'Waiting' ? '#f59e0b' : '#10b981', color: 'white' }}>{q.status}</span>
                  </div>
                </div>
              ))}
              <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>Call Next Patient (Token #15)</button>
            </div>
            
            <div style={{ flex: 1, background: 'var(--background)', padding: '1rem', borderRadius: '0.5rem' }}>
              <h4>Digital Prescription Pad</h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Select a patient from the queue to start writing prescription.</p>
              <textarea className="form-input" rows="5" placeholder="Rx: ..."></textarea>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }}>Print PDF</button>
                <button className="btn btn-secondary" style={{ flex: 1 }}>Send to Pharmacy</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'ward' && (
        <div>
          <h3>Bed & Ward Availability Board</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '1.5rem' }}>
            {beds.map(b => (
              <div key={b.type} style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', textAlign: 'center', borderTop: `4px solid ${b.available > 0 ? '#10b981' : '#ef4444'}` }}>
                <h4>{b.type} Ward</h4>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', margin: '1rem 0' }}>{b.available} / {b.total}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Beds Available</div>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: '1rem' }}>Admit Patient</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add logic for doctors, emr, lab, ambulance, insurance tabs based on tier... */}
    </div>
  );
}
