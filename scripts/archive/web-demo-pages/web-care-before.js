'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const CAREGIVERS = [
  { id: 1, name: 'Sunita Bhosale', role: 'Infant Nanny / Baby Care', rating: '4.9 ★', experience: '5 years', location: 'Dhanori', charge: '₹220/hour', skills: ['Infant Feeding', 'First Aid', 'Toddler Activities'], icon: '🍼' },
  { id: 2, name: 'Janardan Shinde', role: 'Senior Care Companion', rating: '4.8 ★', experience: '8 years', location: 'Viman Nagar', charge: '₹250/hour', skills: ['Medicine Reminders', 'Mobility Assist', 'Bilingual'], icon: '👵' },
  { id: 3, name: 'Amol Gokhale', role: 'Pet Sitter / Dog Walker', rating: '4.7 ★', experience: '3 years', location: 'Kharadi', charge: '₹150/walk', skills: ['Large Breeds', 'Pet Boarding', 'Grooming Assist'], icon: '🐕' },
];

export default function CarePage() {
  const [selectedCare, setSelectedCare] = useState(null);
  const [matchDone, setMatchDone] = useState(false);

  const handleMatch = (care) => {
    setSelectedCare(care);
    setMatchDone(false);
  };

  const confirmMatch = (e) => {
    e.preventDefault();
    setMatchDone(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container">
          
          <div style={{ marginBottom: '3rem', textAlign: 'center' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Pillar 13: Care Network</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800 }}>Vetted Caregivers & Companions</h1>
            <p style={{ color: 'var(--text-muted)' }}>Find verified local assistance for baby care, elder care, and pet care. Safe, society-vetted professionals.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', maxWidth: '800px', margin: '0 auto' }}>
            {CAREGIVERS.map(c => (
              <div key={c.id} className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '2rem', alignItems: 'center', padding: '2rem' }}>
                <div style={{ fontSize: '3rem', width: '70px', height: '70px', background: 'var(--primary-light)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{c.name}</h3>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>✓ Background Checked</span>
                  </div>
                  <p style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 0.5rem' }}>{c.role} · {c.experience} Exp</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>📍 {c.location} · {c.rating}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                    {c.skills.map(s => (
                      <span key={s} style={{ fontSize: '0.72rem', background: 'var(--background)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid var(--border)' }}>{s}</span>
                    ))}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ color: 'var(--text)', fontWeight: 800, marginBottom: '0.25rem' }}>{c.charge}</h3>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>₹150 Local Match Fee</p>
                  <button onClick={() => handleMatch(c)} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Hire Assistant</button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </main>

      {/* Match Confirmation Modal */}
      {selectedCare && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '2rem' }}>
            {matchDone ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: 'var(--accent)' }}>Match Fee Paid Successfully!</h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>The Match Fee of ₹150 has been debited. You will receive the caregiver's contact details, police verification records, and references via SMS instantly.</p>
                <button className="btn btn-primary" onClick={() => setSelectedCare(null)} style={{ width: '100%', marginTop: '1.5rem' }}>Close</button>
              </div>
            ) : (
              <form onSubmit={confirmMatch}>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '1rem' }}>Match Caregiver</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>A ₹150 match fee is processed securely to dispatch full police verification records and connect you directly with the provider.</p>
                
                <div className="form-group">
                  <label className="form-label">Society Wing & flat</label>
                  <input className="form-input" placeholder="e.g. A-402, Pride Aashiyana" required />
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedCare(null)} style={{ flex: 1 }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Pay Match Fee (₹150)</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
