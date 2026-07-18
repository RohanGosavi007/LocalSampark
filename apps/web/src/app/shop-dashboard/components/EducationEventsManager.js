import React, { useState } from 'react';

export default function EducationEventsManager({ shop }) {
  const [activeTab, setActiveTab] = useState('batches');

  const tabs = [
    { id: 'batches', label: 'Batch Management' },
    { id: 'attendance', label: 'Attendance Tracker' },
    { id: 'assignments', label: 'Assignment Portal' },
    { id: 'catering', label: 'Catering Menu Customizer' },
    { id: 'virtual_tour', label: 'Virtual Tour Links' }
  ];

  return (
    <div className="edu-events-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Education & Events Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage batches, attendance, events, and catering</p>
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

      {activeTab === 'batches' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Class Batches</h3>
            <button className="btn btn-primary">+ Create Batch</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {/* Dummy data */}
            <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong>Class 10th Math (Morning)</strong>
                <span className="badge" style={{ background: '#3b82f6', color: 'white' }}>Active</span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>Timing: 7:00 AM - 8:30 AM</p>
              <div style={{ margin: '1rem 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                  <span>Capacity: 45/50</span>
                  <span>90% Full</span>
                </div>
                <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px' }}>
                  <div style={{ width: '90%', height: '100%', background: '#3b82f6', borderRadius: '4px' }}></div>
                </div>
              </div>
              <button className="btn btn-secondary" style={{ width: '100%' }}>Manage Students</button>
            </div>
          </div>
        </div>
      )}

      {/* Add logic for other tabs... */}
    </div>
  );
}
