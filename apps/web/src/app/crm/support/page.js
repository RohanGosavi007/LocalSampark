'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function CRMSupportPage() {
  const [tickets, setTickets] = useState([
    { id: 1, title: 'Delivery delay at Sharma Grocery', user: 'Rohan Patil', priority: 'High', status: 'Open' },
    { id: 2, title: 'UPI Load money failed transaction', user: 'Sunita Joshi', priority: 'Medium', status: 'Resolved' }
  ]);

  const handleResolve = (id) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status: 'Resolved' } : t));
    alert('🎫 Ticket status updated to Resolved!');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '2.5rem' }}>
            <a href="/crm" style={{ fontSize: '1.25rem' }}>⬅️</a>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800 }}>Support Ticketing Center</h1>
          </div>

          <div className="glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem' }}>Incoming Customer Tickets</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {tickets.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem', background: 'var(--background)', borderRadius: '0.75rem', borderLeft: `4px solid ${t.priority === 'High' ? 'red' : 'var(--primary)'}` }}>
                  <div>
                    <h4 style={{ fontSize: '1.1rem', margin: 0 }}>{t.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Created by: {t.user} | Priority: <strong>{t.priority}</strong></p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span className={`badge ${t.status === 'Resolved' ? 'badge-success' : 'badge-primary'}`}>{t.status}</span>
                    {t.status !== 'Resolved' && (
                      <button onClick={() => handleResolve(t.id)} className="btn btn-secondary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }}>Resolve</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
