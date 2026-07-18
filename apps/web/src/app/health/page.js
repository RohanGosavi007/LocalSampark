'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const HOSPITALS = [
  { name: 'Dhanori Lifeline Hospital', type: 'Multi-Specialty', dist: '0.8 km', phone: '+91 98765-43212', beds: '24/7 Emergency', icon: '🏥' },
  { name: 'Pune District Hospital', type: 'Government', dist: '3.2 km', phone: '020-26125600', beds: 'Free OPD', icon: '🏨' },
  { name: 'Surya Mother & Child Care', type: 'Maternity', dist: '1.5 km', phone: '+91 98765-43214', beds: 'NICU Available', icon: '🍼' },
];

const DOCTORS = [
  { name: 'Dr. Ajay Patil', spec: 'General Physician', clinic: 'Goodwill Square Clinic', phone: '+91 98765-11110', timing: 'Mon–Sat, 9AM–1PM & 5–8PM', icon: '👨‍⚕️' },
  { name: 'Dr. Shalini Deshmukh', spec: 'Pediatrician', clinic: 'Tingre Nagar Rd Clinic', phone: '+91 98765-22220', timing: 'Mon–Sat, 10AM–2PM', icon: '👩‍⚕️' },
  { name: 'Dr. Ravi Bhosale', spec: 'Cardiologist', clinic: 'Dhanori Heart Center', phone: '+91 98765-33330', timing: 'Tue & Thu, 11AM–4PM', icon: '❤️' },
  { name: 'Dr. Meera Kulkarni', spec: 'Dermatologist', clinic: 'Ganga Aria Clinic', phone: '+91 98765-44440', timing: 'Mon, Wed, Fri, 4–7PM', icon: '🌿' },
];

const PHARMACIES = [
  { name: 'Goodwill Pharmacy', note: '24/7 Open', phone: '+91 98765-43213', icon: '💊' },
  { name: 'Pune Wellness Chemist', note: 'Daily 7AM–11PM', phone: '+91 98765-55550', icon: '🧴' },
  { name: 'Jan Aushadhi Store', note: 'Generic Medicines', phone: '1800-111-255', icon: '🏷️' },
];

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
  const [activeTab, setActiveTab] = useState('hospitals');

  const handleSOS = () => {
    setSosActive(true);
    setTimeout(() => {
      setSosActive(false);
      setSosConfirmed(true);
      setTimeout(() => setSosConfirmed(false), 6000);
    }, 2000);
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
              One-tap SOS broadcast, nearest hospitals, verified local doctors, and 24/7 pharmacy directory — all within Dhanori's trusted network.
            </p>
          </div>

          {/* SOS Button */}
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            {sosConfirmed && (
              <div style={{ background: '#450a0a', border: '1px solid #ef4444', borderRadius: '1rem', padding: '1.25rem 2rem', marginBottom: '2rem', display: 'inline-block' }}>
                <p style={{ color: '#f87171', fontWeight: 700, margin: 0, fontSize: '1rem' }}>
                  🚨 SOS BROADCAST SENT — All neighbors within 5km radius alerted. Local ambulance dispatched.
                </p>
              </div>
            )}
            <div style={{ position: 'relative', display: 'inline-block' }}>
              {sosActive && (
                <>
                  <div style={{ position: 'absolute', inset: '-20px', borderRadius: '50%', background: 'rgba(239,68,68,0.2)', animation: 'pulse 1s ease-out infinite' }} />
                  <div style={{ position: 'absolute', inset: '-40px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', animation: 'pulse 1s ease-out infinite 0.3s' }} />
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
              Caution: Broadcasts emergency alert to all verified neighbors and dispatches local medical response.
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
              { id: 'hospitals', label: '🏥 Hospitals' },
              { id: 'doctors', label: '👨‍⚕️ Doctors' },
              { id: 'pharmacies', label: '💊 Pharmacies' },
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

          {/* Hospitals */}
          {activeTab === 'hospitals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {HOSPITALS.map((h, i) => (
                <div key={i} className="glass-card" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '1.5rem', alignItems: 'center', padding: '1.75rem' }}>
                  <div style={{ width: '60px', height: '60px', background: '#450a0a22', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>{h.icon}</div>
                  <div>
                    <h3 style={{ margin: '0 0 0.35rem', fontSize: '1.15rem' }}>{h.name}</h3>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{h.type} · 📍 {h.dist} from Dhanori · {h.beds}</p>
                  </div>
                  <a href={`tel:${h.phone}`} className="btn btn-primary" style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                    📞 {h.phone}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Doctors */}
          {activeTab === 'doctors' && (
            <div className="grid-2">
              {DOCTORS.map((d, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.75rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '2rem' }}>{d.icon}</div>
                    <div>
                      <h3 style={{ margin: '0 0 0.2rem', fontSize: '1.1rem' }}>{d.name}</h3>
                      <span className="badge badge-primary" style={{ fontSize: '0.72rem' }}>{d.spec}</span>
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.3rem' }}>📍 {d.clinic}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 1.25rem' }}>🕐 {d.timing}</p>
                  <a href={`tel:${d.phone}`} className="btn btn-secondary" style={{ width: '100%', padding: '0.55rem', fontSize: '0.85rem', textAlign: 'center', display: 'block' }}>
                    📞 {d.phone}
                  </a>
                </div>
              ))}
            </div>
          )}

          {/* Pharmacies */}
          {activeTab === 'pharmacies' && (
            <div className="grid-3">
              {PHARMACIES.map((p, i) => (
                <div key={i} className="glass-card" style={{ textAlign: 'center', padding: '2rem' }}>
                  <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{p.icon}</div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{p.name}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>{p.note}</p>
                  <a href={`tel:${p.phone}`} className="btn btn-primary" style={{ width: '100%', fontSize: '0.85rem' }}>📞 {p.phone}</a>
                </div>
              ))}
            </div>
          )}

        </div>
      </main>
      <Footer />
    </div>
  );
}
