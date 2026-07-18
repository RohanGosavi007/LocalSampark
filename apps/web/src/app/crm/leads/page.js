'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function CRMLeadsPage() {
  const [leads, setLeads] = useState([
    { id: 1, name: 'Sharma Dairy & Grocery', source: 'Website Registration', email: 'sharma@gmail.com', phone: '+91 9999988888', status: 'New' },
    { id: 2, name: 'Sanjay Kumar (Plumbing)', source: 'Franchise Reference', email: 'sanjay@gmail.com', phone: '+91 9888877777', status: 'Contacted' },
    { id: 3, name: 'Ganga Aria Gate Security', source: 'Admin Onboarding', email: 'ganga_aria@gmail.com', phone: '+91 9777766666', status: 'Onboarded' }
  ]);

  const handleUpdateStatus = (id, status) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container">
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2.5rem' }}>
            <a href="/crm" style={{ fontSize: '1.25rem' }}>⬅️</a>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Lead Management Directory</h1>
          </div>

          <div className="glass-card" style={{ overflowX: 'auto', padding: '2rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem' }}>Lead Name</th>
                  <th style={{ padding: '1rem' }}>Source</th>
                  <th style={{ padding: '1rem' }}>Contact Info</th>
                  <th style={{ padding: '1rem' }}>Status</th>
                  <th style={{ padding: '1rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{l.name}</td>
                    <td style={{ padding: '1rem' }}>{l.source}</td>
                    <td style={{ padding: '1rem', fontSize: '0.85rem' }}>
                      {l.email}<br />{l.phone}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span className={`badge ${l.status === 'Onboarded' ? 'badge-success' : l.status === 'Contacted' ? 'badge-secondary' : 'badge-primary'}`}>
                        {l.status}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', gap: '0.5rem', display: 'flex' }}>
                      <button onClick={() => handleUpdateStatus(l.id, 'Contacted')} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Contact</button>
                      <button onClick={() => handleUpdateStatus(l.id, 'Onboarded')} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Onboard</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
