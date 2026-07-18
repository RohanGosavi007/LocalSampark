import React, { useState } from 'react';

export default function BeautyManager({ shop }) {
  const [activeTab, setActiveTab] = useState('waitlist');

  const tabs = [
    { id: 'waitlist', label: 'Smart Waitlist' },
    { id: 'portfolio', label: 'Stylist Portfolio Gallery' },
    { id: 'memberships', label: 'Membership Packages' },
    { id: 'punch_card', label: 'Loyalty Punch Card' },
    { id: 'skin_analysis', label: 'Skin/Hair Analysis Log' }
  ];

  return (
    <div className="beauty-manager glass-card" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2>Beauty, Spa & Fitness Manager</h2>
          <p style={{ color: 'var(--text-muted)' }}>Manage portfolios, waitlists, and memberships</p>
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

      {activeTab === 'waitlist' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <h3>Smart Waitlist</h3>
          </div>
          <p style={{ color: 'var(--text-muted)' }}>Auto-notify waitlisted users when there are cancellations.</p>
          <div style={{ background: 'var(--background)', padding: '1.5rem', borderRadius: '0.5rem', border: '1px solid var(--border)', marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <strong>Saturday 15th July - 5:00 PM Slot (Haircut - Stylist: Rita)</strong>
                <div style={{ color: '#ef4444', fontSize: '0.9rem', marginTop: '0.2rem' }}>Current Booking Cancelled</div>
              </div>
              <button className="btn btn-primary">Auto-Notify 3 Users in Waitlist</button>
            </div>
          </div>
        </div>
      )}

      {/* Add logic for other tabs... */}
    </div>
  );
}
