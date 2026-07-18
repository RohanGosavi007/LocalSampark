'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const FEATURES = [
  { icon: '📱', title: 'Community Feed & Forum', desc: 'Live neighborhood updates, polls, and announcements from OTP-verified residents.' },
  { icon: '🛒', title: 'Zero-Commission Shop Orders', desc: 'Direct orders to local shops. No Zomato, no Swiggy cut. 100% profit for merchants.' },
  { icon: '⚡', title: 'On-Demand Gig Workers', desc: 'Electricians, plumbers, tutors, and cleaners — rated by your actual neighbors.' },
  { icon: '🏘️', title: 'Society Gate Pass', desc: 'Pre-approve visitors with QR codes. Full digital security log for your complex.' },
  { icon: '🚗', title: 'Verified Carpooling', desc: 'Share rides to IT parks with verified co-residents. Split costs, cut emissions.' },
  { icon: '👛', title: 'LocalSampark Wallet', desc: 'Load money, pay shops, collect earnings, and split bills — all in one secure wallet.' },
  { icon: '🏢', title: 'Broker-Free Real Estate', desc: 'Direct landlord-to-tenant listings. Find PGs, flats, and flatmates without agent fees.' },
  { icon: '💸', title: 'Earn from Your Neighborhood', desc: 'Delivery runs, referrals, and franchise partner programs. Build recurring income.' },
  { icon: '🐾', title: 'Pet Community Hub', desc: 'Lost alerts, local vets, grooming, and pet-sitting from verified neighbor caregivers.' },
  { icon: '🏥', title: 'Health & SOS Emergency', desc: 'Nearest hospitals, doctors, and one-tap SOS broadcast to all neighbors in 5km radius.' },
  { icon: '🎉', title: 'Events & Ticketing', desc: 'Discover, RSVP, and buy tickets for local cultural events and society functions.' },
  { icon: '📦', title: 'Peer-to-Peer Delivery', desc: 'Send keys, documents, parcels across your neighborhood instantly via local runners.' },
];

const APP_SCREENS = [
  { name: 'Home Feed', icon: '🏠', desc: 'Personalized hyper-local feed based on your society and zone.' },
  { name: 'Shop & Order', icon: '🛒', desc: 'Browse and order from 347+ verified local shops.' },
  { name: 'Wallet & Pay', icon: '👛', desc: 'Manage money, earnings, and subscription payments.' },
  { name: 'Community', icon: '💬', desc: 'Forum posts, alerts, polls, and announcements.' },
  { name: 'Society Gate', icon: '🏘️', desc: 'Visitor QR passes and domestic staff verification.' },
  { name: 'Gig Economy', icon: '⚡', desc: 'Browse, book, and review local service workers.' },
];

export default function DownloadPage() {
  const [activeScreen, setActiveScreen] = useState(0);
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);

  const handleNotify = (e) => {
    e.preventDefault();
    if (!email) return;
    setNotified(true);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>

        {/* Hero */}
        <section style={{ padding: '7rem 0 5rem', background: 'radial-gradient(circle at 80% 30%, rgba(99,102,241,0.1) 0%, transparent 50%), radial-gradient(circle at 20% 70%, rgba(249,115,22,0.07) 0%, transparent 50%)' }}>
          <div className="container">
            <div className="grid-2" style={{ gap: '5rem', alignItems: 'center' }}>
              <div>
                <span className="badge badge-primary" style={{ marginBottom: '1.25rem' }}>📱 LocalSampark Mobile App</span>
                <h1 style={{ fontSize: '3.8rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', letterSpacing: '-0.04em' }}>
                  Your Neighborhood in the<br />
                  <span className="gradient-text">Palm of Your Hand</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', marginBottom: '2.5rem', lineHeight: 1.7 }}>
                  Get the full LocalSampark experience. Verify with OTP, post community updates, order from local shops, run deliveries, and manage your society — all from one app.
                </p>

                {/* Store Buttons */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
                  <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.75rem', background: '#0f172a', color: 'white', cursor: 'pointer', borderRadius: '0.85rem', border: 'none', transition: 'all 0.3s' }}
                    onClick={() => alert('Coming to Google Play — Join waitlist below!')}>
                    <span style={{ fontSize: '2.25rem' }}>🤖</span>
                    <div>
                      <p style={{ fontSize: '0.68rem', margin: 0, opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Get it on</p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Google Play</p>
                    </div>
                  </div>
                  <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.9rem 1.75rem', background: '#0f172a', color: 'white', cursor: 'pointer', borderRadius: '0.85rem', border: 'none', transition: 'all 0.3s' }}
                    onClick={() => alert('Coming to App Store — Join waitlist below!')}>
                    <span style={{ fontSize: '2.25rem' }}>🍎</span>
                    <div>
                      <p style={{ fontSize: '0.68rem', margin: 0, opacity: 0.7, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Download on the</p>
                      <p style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>App Store</p>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                  {[{ v: '12,450+', l: 'Active Users' }, { v: '4.8★', l: 'Avg Rating' }, { v: '25+', l: 'Zones Live' }].map(s => (
                    <div key={s.l} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{s.v}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{s.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* App Preview Panel */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: '340px' }}>
                  {/* Phone mockup */}
                  <div style={{
                    background: '#0f172a', borderRadius: '2.5rem', padding: '1.25rem',
                    border: '6px solid #1e293b', boxShadow: '0 40px 80px -20px rgba(0,0,0,0.5)',
                    position: 'relative', overflow: 'hidden'
                  }}>
                    {/* Notch */}
                    <div style={{ width: '100px', height: '24px', background: '#0f172a', borderRadius: '0 0 1rem 1rem', margin: '0 auto 0.5rem', border: '4px solid #1e293b', borderTop: 'none' }} />
                    {/* Screen */}
                    <div style={{
                      background: 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)',
                      borderRadius: '1.5rem', padding: '1.5rem', minHeight: '420px',
                      display: 'flex', flexDirection: 'column', gap: '1rem'
                    }}>
                      {/* Status bar */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#94a3b8' }}>
                        <span>9:41 AM</span><span>●●● ▲ 100%</span>
                      </div>
                      {/* App header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.25rem' }}>🏘️</span>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.95rem' }}>LocalSampark</span>
                        <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>● Dhanori</span>
                      </div>
                      {/* Active screen preview */}
                      <div style={{ background: '#1e293b', borderRadius: '1rem', padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '3.5rem' }}>{APP_SCREENS[activeScreen].icon}</div>
                        <h4 style={{ color: '#fff', margin: 0, fontSize: '1rem', fontWeight: 700 }}>{APP_SCREENS[activeScreen].name}</h4>
                        <p style={{ color: '#94a3b8', fontSize: '0.78rem', textAlign: 'center', margin: 0 }}>{APP_SCREENS[activeScreen].desc}</p>
                      </div>
                      {/* Bottom nav */}
                      <div style={{ display: 'flex', justifyContent: 'space-around', paddingTop: '0.5rem' }}>
                        {['🏠', '🛒', '👛', '💬', '👤'].map((ic, i) => (
                          <div key={i} style={{ fontSize: '1.25rem', opacity: i === 0 ? 1 : 0.4 }}>{ic}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                  {/* Screen selector dots */}
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                    {APP_SCREENS.map((s, i) => (
                      <button key={i} onClick={() => setActiveScreen(i)} title={s.name} style={{
                        width: i === activeScreen ? '24px' : '8px', height: '8px', borderRadius: '50px',
                        background: i === activeScreen ? 'var(--primary)' : 'var(--border)',
                        border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0
                      }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Waitlist / Notify */}
        <section style={{ padding: '3rem 0', background: 'var(--background-alt)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          <div className="container" style={{ maxWidth: '640px', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.75rem' }}>📬 Get Notified When We Launch on Play Store</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Download the APK for Android now, or join the waitlist for the official Play Store / App Store launch.</p>
            {notified ? (
              <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '1rem 1.5rem', borderRadius: '0.75rem', fontWeight: 700 }}>
                ✅ You're on the waitlist! We'll notify you at {email}
              </div>
            ) : (
              <form onSubmit={handleNotify} style={{ display: 'flex', gap: '0.75rem' }}>
                <input type="email" className="form-input" placeholder="your@email.com" required value={email} onChange={e => setEmail(e.target.value)} style={{ flex: 1 }} />
                <button type="submit" className="btn btn-primary" style={{ whiteSpace: 'nowrap', padding: '0.9rem 1.75rem' }}>Notify Me</button>
              </form>
            )}
          </div>
        </section>

        {/* QR & APK */}
        <section style={{ padding: '5rem 0' }}>
          <div className="container" style={{ maxWidth: '900px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center', marginBottom: '5rem' }}>
              <div className="glass-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
                <div style={{ width: '160px', height: '160px', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '1rem', margin: '0 auto 1.25rem', fontSize: '5rem', border: '1px solid var(--border)' }}>
                  📱
                </div>
                <h3 style={{ marginBottom: '0.5rem' }}>Scan for Android APK</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>Direct APK download for local testing on Android devices (5.0+)</p>
                <a href="/download" className="btn btn-primary" style={{ width: '100%' }}>⬇️ Download APK (v1.0.0)</a>
              </div>
              <div>
                <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>Why Download LocalSampark?</h2>
                {[
                  { icon: '🔒', t: '100% OTP Verified', d: 'Every user is verified with mobile OTP. No bots, no spam.' },
                  { icon: '⚡', t: 'Real-time Updates', d: 'WebSocket-powered live alerts from your neighborhood.' },
                  { icon: '💰', t: 'Save Money', d: 'Zero delivery fees, zero broker fees, zero commission.' },
                  { icon: '🇮🇳', t: 'Local First', d: 'Built specifically for Pune neighborhoods. Hindi & Marathi support.' },
                ].map(item => (
                  <div key={item.t} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '1.75rem', flexShrink: 0 }}>{item.icon}</div>
                    <div>
                      <h4 style={{ margin: '0 0 0.25rem', fontSize: '1rem' }}>{item.t}</h4>
                      <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem' }}>{item.d}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 12-feature grid */}
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Everything in One App</h2>
              <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>12 powerful modules — all free for residents</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              {FEATURES.map((f, i) => (
                <div key={i} className="glass-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{f.icon}</div>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>{f.title}</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
