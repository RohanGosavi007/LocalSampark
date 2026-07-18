'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { LocationContext } from '../../context/LocationContext';

const TIER_BENEFITS = [
  { tier: 'Sub-Agent', icon: '🧑', invest: '₹10,000', commission: '10%', support: 'WhatsApp support', manage: 'Up to 20 shops', monthly: '₹8,000–25,000', color: '#94a3b8' },
  { tier: 'Zone Franchise', icon: '🏢', invest: '₹1,00,000', commission: '25%', support: 'Dedicated BDE', manage: 'Full zone control', monthly: '₹40,000–1.2L', color: '#4f46e5', popular: true },
  { tier: 'City Master', icon: '🌆', invest: 'Varies by Location', commission: '40% + override', support: 'C-Level access', manage: 'All zones in city', monthly: '₹1.5L–5L+', color: '#f97316' },
];

const STEPS = [
  { n: '01', title: 'Submit Application', desc: 'Fill the form with your desired territory pincode. Our team reviews within 24 hours.' },
  { n: '02', title: 'Video Call Interview', desc: 'Quick 20-minute call with our franchise onboarding team to assess fit.' },
  { n: '03', title: 'Agreement & Training', desc: 'Sign digital franchise agreement. Complete 2-day onboarding training (online).' },
  { n: '04', title: 'Go Live & Earn', desc: 'Launch your territory. Start earning commissions from day one.' },
];

export default function FranchisePage() {
  const { STATES, DISTRICTS, TERRITORIES } = React.useContext(LocationContext) || { STATES: [], DISTRICTS: {}, TERRITORIES: [] };
  
  const [form, setForm] = useState({ name: '', phone: '', pincode: '', state: '', district: '', zone: '', tier: 'Zone Franchise', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [mapStateFilter, setMapStateFilter] = useState('Maharashtra');
  const [mapDistrictFilter, setMapDistrictFilter] = useState('Pune');
  const up = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>

        {/* Hero */}
        <section style={{ padding: '7rem 0 5rem', position: 'relative', overflow: 'hidden', background: 'var(--hero-bg)', backgroundSize: '300% 300%' }}>
          <div style={{ position: 'absolute', top: '-120px', right: '-80px', width: '600px', height: '600px', borderRadius: '50%', background: 'rgba(249,115,22,0.12)', filter: 'blur(100px)', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', bottom: '-80px', left: '-60px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(99,102,241,0.12)', filter: 'blur(80px)', pointerEvents: 'none' }} />
          <div className="container" style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
            <span className="badge badge-secondary" style={{ marginBottom: '1.5rem', fontSize: '0.85rem' }}>🤝 Partner Program</span>
            <h1 style={{ fontSize: '4rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1.5rem' }}>
              Own a Piece of<br /><span className="gradient-text">India's Hyperlocal Future</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '600px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
              Become a LocalSampark Franchise Partner. Operate your own neighborhood super-app territory. Earn 25%+ of all platform commissions generated in your zone.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3rem' }}>
              <a href="#apply" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.05rem' }}>Apply for Territory →</a>
              <a href="#zones" className="btn btn-secondary" style={{ padding: '1rem 2.25rem', fontSize: '1.05rem' }}>View Open Zones</a>
            </div>
            <div style={{ display: 'flex', gap: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {[{ v: '₹40K–1.2L', l: 'Monthly Earnings' }, { v: '25%', l: 'Commission Rate' }, { v: '25+', l: 'Open Zones in Pune' }, { v: '48hr', l: 'Onboarding SLA' }].map(s => (
                <div key={s.l} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--secondary)' }}>{s.v}</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tier Cards */}
        <section style={{ padding: '5rem 0', background: 'var(--section-alt)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span className="section-tag">💼 Partnership Tiers</span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Choose Your Partnership Level</h2>
            </div>
            <div className="grid-3" style={{ maxWidth: '1000px', margin: '0 auto' }}>
              {TIER_BENEFITS.map((t, i) => (
                <div key={i} className={`glass-card${t.popular ? ' card-3d' : ''}`} style={{
                  padding: '2.5rem 2rem', textAlign: 'center', position: 'relative',
                  border: t.popular ? `2px solid ${t.color}` : '1px solid var(--card-border)',
                  transform: t.popular ? 'scale(1.04)' : 'none',
                  boxShadow: t.popular ? `0 20px 60px -15px ${t.color}55` : undefined
                }}>
                  {t.popular && <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: t.color, color: 'white', padding: '0.3rem 1rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap' }}>⭐ Most Popular</div>}
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{t.icon}</div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem', color: t.color }}>{t.tier}</h3>
                  <div style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '0.25rem' }}>{t.invest}</div>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>One-time franchise fee</p>
                  {[
                    { l: 'Commission Rate', v: t.commission },
                    { l: 'Manage', v: t.manage },
                    { l: 'Support', v: t.support },
                    { l: 'Monthly Earning', v: t.monthly },
                  ].map(row => (
                    <div key={row.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.85rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>{row.l}</span>
                      <strong style={{ color: t.color }}>{row.v}</strong>
                    </div>
                  ))}
                  <a href="#apply" className="btn" style={{ width: '100%', marginTop: '1.5rem', background: t.color, color: 'white', boxShadow: `0 8px 24px -6px ${t.color}66` }}>
                    Apply for {t.tier}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section style={{ padding: '5rem 0' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
              <span className="section-tag">🗺️ Process</span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>4 Steps to Become a Partner</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
              {STEPS.map((step, i) => (
                <div key={i} className="glass-card" style={{ textAlign: 'center', padding: '2.5rem 1.75rem' }}>
                  <div style={{ width: '60px', height: '60px', background: 'linear-gradient(135deg, var(--primary), #818cf8)', borderRadius: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem', fontSize: '1.25rem', fontWeight: 900, color: 'white' }}>{step.n}</div>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.6rem' }}>{step.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Zone Map */}
        <section id="zones" style={{ padding: '5rem 0', background: 'var(--section-alt)' }}>
          <div className="container">
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <span className="section-tag">📍 Territory Map</span>
              <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{mapDistrictFilter || 'Available'} Pilot Territories</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.75rem' }}>Explore our available zones and claim your territory today.</p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1.5rem', flexWrap: 'wrap' }}>
                <select className="form-input" value={mapStateFilter} onChange={e => { setMapStateFilter(e.target.value); setMapDistrictFilter(''); }} style={{ maxWidth: '200px' }}>
                  <option value="">All States</option>
                  {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select className="form-input" value={mapDistrictFilter} onChange={e => setMapDistrictFilter(e.target.value)} disabled={!mapStateFilter} style={{ maxWidth: '200px' }}>
                  <option value="">All Districts</option>
                  {(DISTRICTS[mapStateFilter] || []).map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {TERRITORIES.filter(t => !mapDistrictFilter || t.district === mapDistrictFilter).map((t, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.75rem', borderLeft: `4px solid ${t.color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                    <div>
                      <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.2rem' }}>{t.zone}</h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>PIN: {t.pin}</p>
                    </div>
                    <span style={{ background: t.color + '22', color: t.color, padding: '0.25rem 0.75rem', borderRadius: '50px', fontSize: '0.72rem', fontWeight: 800 }}>{t.status}</span>
                  </div>
                  {t.status === 'Active' ? (
                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1rem' }}>
                      <div><div style={{ fontWeight: 800, color: t.color }}>{t.shops}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Shops</div></div>
                      <div><div style={{ fontWeight: 800, color: t.color }}>{t.users}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Users</div></div>
                      <div><div style={{ fontWeight: 800, color: t.color }}>{t.revenue}</div><div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Revenue</div></div>
                    </div>
                  ) : (
                    <div style={{ background: 'var(--secondary-light)', borderRadius: '0.5rem', padding: '0.75rem 1rem', marginBottom: '1rem' }}>
                      <p style={{ color: 'var(--secondary)', fontWeight: 700, margin: 0, fontSize: '0.85rem' }}>🔓 Available — Be the first franchise partner!</p>
                    </div>
                  )}
                  {t.status === 'Active' && <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Partner: <strong>{t.partner}</strong></p>}
                  <a href="#apply" className="btn btn-secondary" style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem' }}>
                    {t.status === 'Active' ? 'View Details' : 'Claim Territory'}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Application Form */}
        <section id="apply" style={{ padding: '5rem 0' }}>
          <div className="container" style={{ maxWidth: '680px' }}>
            {submitted ? (
              <div className="glass-card" style={{ textAlign: 'center', padding: '4rem 3rem' }}>
                <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🎉</div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Application Submitted!</h2>
                <p style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
                  Thank you, <strong>{form.name}</strong>! Our franchise team will call you at <strong>{form.phone}</strong> within 24 hours to discuss the <strong>{form.zone || 'selected'}</strong> territory.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                  <span className="section-tag">📋 Application</span>
                  <h2 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Apply for Franchise Territory</h2>
                </div>
                <div className="glass-card" style={{ padding: '2.5rem' }}>
                  <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Full Name *</label>
                        <input className="form-input" required placeholder="e.g. Rajesh Sharma" value={form.name} onChange={e => up('name', e.target.value)} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Mobile Number *</label>
                        <input type="tel" className="form-input" required placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={e => up('phone', e.target.value)} />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">State *</label>
                        <select className="form-input" required value={form.state} onChange={e => { up('state', e.target.value); up('district', ''); up('zone', ''); }}>
                          <option value="">Select State</option>
                          {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">District *</label>
                        <select className="form-input" required value={form.district} onChange={e => { up('district', e.target.value); up('zone', ''); }} disabled={!form.state}>
                          <option value="">Select District</option>
                          {(DISTRICTS[form.state] || []).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Desired Zone / Area *</label>
                        <select className="form-input" required value={form.zone} onChange={e => up('zone', e.target.value)} disabled={!form.district}>
                          <option value="">Select a zone</option>
                          {TERRITORIES.filter(t => t.district === form.district).map(t => <option key={t.zone} value={t.zone}>{t.zone} (PIN: {t.pin}) {t.status === 'Open' ? '🔓' : '✅'}</option>)}
                        </select>
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label">Partnership Tier</label>
                        <select className="form-input" value={form.tier} onChange={e => up('tier', e.target.value)}>
                          {TIER_BENEFITS.map(t => <option key={t.tier}>{t.tier}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Pincode of Interest</label>
                      <input className="form-input" placeholder="e.g. 411015" value={form.pincode} onChange={e => up('pincode', e.target.value)} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Why do you want to be a LocalSampark partner?</label>
                      <textarea className="form-input" rows={3} placeholder="Tell us about your background and motivation..." value={form.message} onChange={e => up('message', e.target.value)} style={{ resize: 'vertical' }} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%', fontSize: '1.05rem', padding: '1rem' }}>
                      🚀 Submit Franchise Application
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
