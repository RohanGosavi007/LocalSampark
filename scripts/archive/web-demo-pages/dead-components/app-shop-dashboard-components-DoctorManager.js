import React, { useState } from 'react';

export default function DoctorManager({ shop }) {
  const [activeTab, setActiveTab] = useState('treatment_plans');

  const tabs = [
    { id: 'treatment_plans', label: 'Treatment Plans' },
    { id: 'emr', label: 'EMR & Diet Builder' },
    { id: 'video_consult', label: 'Video Consults' }
  ];

  return (
    <div className="doctor-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Doctor & Clinic Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage treatments, EMR, and video consultations</p>
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

      {activeTab === 'treatment_plans' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Patient Treatment Plans</h3>
            <button className="btn btn-primary">+ Create Plan</button>
          </div>
          <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
            <strong>Dental Implant (Mrs. Verma)</strong>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>Phase 2 / 4 - Bone Grafting</div>
            <button className="btn btn-secondary">View Plan Details</button>
          </div>
        </div>
      )}

      {/* Logic for EMR and Video Consults */}
    </div>
  );
}
