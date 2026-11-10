'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { apiGet, apiPost } from '@/lib/api';

const EMERGENCY_CONTACTS = [
  { label: 'Medical Ambulance', number: '108', color: '#ef4444' },
  { label: 'Police', number: '100', color: '#4f46e5' },
  { label: 'Fire Brigade', number: '101', color: '#f97316' },
  { label: 'Women Helpline', number: '1091', color: '#8b5cf6' },
  { label: 'Child Helpline', number: '1098', color: '#06b6d4' },
  { label: 'Poison Control', number: '1800-116-117', color: '#10b981' },
];

export default function HealthPage() {
  const [sosActive, setSosActive] = useState(false);
  const [sosConfirmed, setSosConfirmed] = useState(false);
  const [sosError, setSosError] = useState(null);
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState(null);
  const [doctorsError, setDoctorsError] = useState(null);

  useEffect(() => {
    apiGet('/medical/doctors')
      .then((r) => setDoctors(Array.isArray(r) ? r : (r && (r.doctors || r.data)) || []))
      .catch((e) => setDoctorsError(e.message || 'Doctors could not be loaded.'));
  }, []);

  // Sends a real alert (POST /sos/trigger) with the device position, and says what happened. It used
  // to wait two seconds and announce "SOS broadcast sent — neighbours alerted, ambulance dispatched"
  // without contacting anything. An emergency button that lies is worse than none.
  const handleSOS = () => {
    if (sosActive) return;
    setSosActive(true);
    setSosError(null);
    setSosConfirmed(false);
    const send = async (coords) => {
      try {
        await apiPost('/sos/trigger', { type: 'medical', ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}) });
        setSosConfirmed(true);
      } catch (e) {
        setSosError(e.status === 401 ? 'Please log in to send an SOS alert. Call 108 for an ambulance now.' : `The alert was NOT sent (${e.message || 'no connection'}). Call 108 or 112 now.`);
      } finally {
        setSosActive(false);
      }
    };
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((p) => send(p.coords), () => send(null), { timeout: 8000, maximumAge: 30000 });
    } else {
      send(null);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container">

          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>Emergency Hub</span>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '1rem' }}>
              Health & <span className="gradient-text">SOS Emergency</span> Network
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
              One-tap SOS alert, national emergency numbers and the doctors listed on LocalSampark — all within Dhanori's trusted network.
            </p>
          </div>

          {/* SOS Button */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            {sosError && (
              <div role="alert" style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: '1rem', padding: '1.25rem', marginBottom: '1.5rem', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
                <p style={{ color: '#f87171', fontWeight: 700, margin: 0 }}>{sosError}</p>
              </div>
            )}
            {sosConfirmed && (
              <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: '1rem', padding: '1.25rem 2rem', marginBottom: '2rem', display: 'inline-block' }}>
                <p style={{ color: '#f87171', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                  🚨 SOS alert sent to LocalSampark responders with your location. If this is life-threatening, also call 108 now.
                </p>
              </div>
            )}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {sosActive && (
                <>
                  <div style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', animation: 'ripple 1s ease-out infinite' }} />
                  <div style={{ position: 'absolute', inset: '-40px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', animation: 'ripple 1s ease-out infinite 0.3s' }} />
                </>
              )}
              <button onClick={handleSOS} style={{
                width: '200px', height: '200px', borderRadius: '50%', border: 'none', cursor: 'pointer',
                background: sosActive ? '#dc2626' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                color: 'white', fontSize: '1.6rem', fontWeight: 800, display: 'flex',
                flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                margin: '0 auto',
                boxShadow: `0 0 ${sosActive ? '60px' : '30px'} rgba(239,68,68,${sosActive ? '0.7' : '0.35'})`,
                transition: 'all 0.3s', transform: sosActive ? 'scale(1.08)' : 'scale(1)'
              }}>
                <span style={{ fontSize: '2.5rem' }}>🚨</span>
                <span>{sosActive ? 'SENDING...' : 'TRIGGER SOS'}</span>
              </button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '1.25rem', maxWidth: '300px', margin: '1.25rem auto 0' }}>
              Sends an alert with your location to LocalSampark responders. It does not replace calling an ambulance: dial 108 or 112.
            </p>
          </div>

          {/* Emergency Numbers Strip */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '3.5rem' }}>
            {EMERGENCY_CONTACTS.map(ec => (
              <a key={ec.label} href={`tel:${ec.number}`} style={{ textDecoration: 'none' }}>
                <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center', borderTop: `3px solid ${ec.color}`, transition: 'transform 0.2s' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: 900, color: ec.color, margin: '0 0 0.3rem' }}>{ec.number}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>{ec.label}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
            {[
              { id: 'doctors', label: '👨‍⚕️ Doctors' },
              { id: 'nearby', label: '💊 Pharmacies & hospitals' },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                padding: '0.75rem 1.5rem', borderRadius: '0.5rem 0.5rem 0 0', border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: '0.9rem', transition: 'all 0.2s',
                background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                borderBottom: activeTab === tab.id ? 'none' : 'none',
              }}>{tab.label}</button>
            ))}
          </div>

          {/* Doctors */}
          {activeTab === 'doctors' && (
            <div className="grid-2">
              {doctorsError && <p role="alert" style={{ color: '#f87171', fontWeight: 700 }}>{doctorsError}</p>}
              {doctors === null && !doctorsError && <p style={{ color: 'var(--text-muted)' }}>Loading doctors…</p>}
              {doctors && doctors.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No doctors are listed yet.</p>}
              {(doctors || []).map((d) => (
                <div key={d.id} className="glass-card" style={{ padding: '1.75rem' }}>
                  <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem' }}>{d.name}</h3>
                  {d.specialization && <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{d.specialization}</span>}
                  {(d.clinic_name || d.hospital_name) && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.75rem 0 0.3rem' }}>📍 {d.clinic_name || d.hospital_name}</p>}
                  {d.consultation_fee != null && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1rem' }}>Consultation ₹{d.consultation_fee}</p>}
                  {d.phone && <a href={`tel:${d.phone}`} className="btn btn-secondary" style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem' }}>📞 {d.phone}</a>}
                </div>
              ))}
            </div>
          )}

          {/* Pharmacies and hospitals live in the shop directory */}
          {activeTab === 'nearby' && (
            <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Pharmacies and hospitals registered on LocalSampark are in the shop directory.</p>
              <a href="/shops" className="btn btn-primary">Browse the shop directory</a>
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
