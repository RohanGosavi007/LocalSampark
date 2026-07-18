import React, { useState } from 'react';

export default function DoctorVisitorView({ shop }) {
  const [activeTab, setActiveTab] = useState('book');

  return (
    <div className="doctor-visitor-view glass-card" style={{ padding: '2rem', marginTop: '2rem' }}>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1rem', overflowX: 'auto' }}>
        <button className={`btn ${activeTab === 'book' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('book')}>Book Appointment</button>
        <button className={`btn ${activeTab === 'video' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('video')}>Telemedicine Consult</button>
        <button className={`btn ${activeTab === 'emr' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('emr')}>My Prescriptions</button>
      </div>

      {activeTab === 'book' && (
        <div>
          <h3>Book In-Clinic Appointment</h3>
          <p style={{ color: 'var(--text-muted)' }}>Choose an available slot to visit the clinic.</p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <input type="date" className="form-input" style={{ flex: 1 }} />
            <button className="btn btn-primary">Check Availability</button>
          </div>
        </div>
      )}

      {activeTab === 'video' && (
        <div style={{ textAlign: 'center' }}>
          <h3>Online Video Consultation</h3>
          <p style={{ color: 'var(--text-muted)' }}>Consult the doctor from the comfort of your home.</p>
          <button className="btn btn-primary" style={{ marginTop: '1rem' }}>Start Instant Consult</button>
        </div>
      )}
    </div>
  );
}
