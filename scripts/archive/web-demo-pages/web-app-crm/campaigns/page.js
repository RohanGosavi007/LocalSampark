'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function CRMCampaignsPage() {
  const [campaigns, setCampaigns] = useState([
    { id: 1, name: 'Dhanori Monsoon Offer', channel: 'SMS', sent: 1200, clicks: 450, status: 'Completed' },
    { id: 2, name: 'Society Safety Announcement', channel: 'Push Notification', sent: 2500, clicks: 1800, status: 'Active' }
  ]);
  const [name, setName] = useState('');
  const [channel, setChannel] = useState('SMS');

  const handleLaunch = (e) => {
    e.preventDefault();
    if (!name) return;
    const newCamp = {
      id: Date.now(),
      name,
      channel,
      sent: 0,
      clicks: 0,
      status: 'Pending Start'
    };
    setCampaigns([newCamp, ...campaigns]);
    setName('');
    alert(`📢 Campaign "${name}" scheduled for broadcast!`);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2.5rem' }}>
            <a href="/crm" style={{ fontSize: '1.25rem' }}>⬅️</a>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Marketing & Broadcast Campaigns</h1>
          </div>

          <div className="grid-2" style={{ gap: '2rem', alignItems: 'start', marginBottom: '3rem' }}>
            {/* Create Campaign */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem' }}>Create New Campaign</h3>
              <form onSubmit={handleLaunch}>
                <div className="form-group">
                  <label className="form-label">Campaign Name</label>
                  <input type="text" className="form-input" placeholder="e.g. Diwali Premium Shops Blast" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Channel</label>
                  <select className="form-input" value={channel} onChange={(e) => setChannel(e.target.value)}>
                    <option value="SMS">SMS Broadcast</option>
                    <option value="Email">Email Newsletters</option>
                    <option value="Push Notification">Mobile App Push Notification</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Launch Campaign</button>
              </form>
            </div>

            {/* Campaign Analytics */}
            <div className="glass-card">
              <h3 style={{ marginBottom: '1.25rem' }}>Active Campaign Performance</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {campaigns.map(c => (
                  <div key={c.id} style={{ padding: '1rem', border: '1px solid var(--border)', borderRadius: '0.5rem', background: 'var(--background-alt)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <h4 style={{ margin: 0 }}>{c.name}</h4>
                      <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{c.status}</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Channel: {c.channel}</p>
                    <div style={{ display: 'flex', gap: '2rem', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                      <span>Sent: <strong>{c.sent}</strong></span>
                      <span>Clicks: <strong>{c.clicks}</strong></span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
