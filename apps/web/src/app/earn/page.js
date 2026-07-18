'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

const STREAMS = [
  {
    id: 'runner',
    icon: '🏍️',
    title: 'Delivery Runner',
    badge: 'Most Popular',
    badgeColor: '#10b981',
    rate: '₹35 – ₹65',
    period: 'per delivery',
    monthly: '~₹12,000 – ₹25,000/mo',
    desc: 'Work on your own schedule. Accept delivery gigs from nearby shops. Walk, cycle, or use a 2-wheeler. No target pressure.',
    steps: ['Download the LocalSampark Partner app', 'Complete OTP verification', 'Start accepting local delivery gigs instantly'],
    perks: ['Flexible timing', 'Instant wallet payout', 'Zero deductions', 'Insurance support'],
    requirements: ['Age 18+', 'Smartphone', 'Know local Pune roads'],
  },
  {
    id: 'partner',
    icon: '🤝',
    title: 'Franchise Partner',
    badge: 'High Earning',
    badgeColor: '#f97316',
    rate: '30%',
    period: 'of platform commission',
    monthly: '~₹40,000 – ₹1,20,000/mo',
    desc: 'Operate a full LocalSampark franchise in your pincode zone. Onboard shops, manage runners, and earn on every transaction.',
    steps: ['Apply with pincode territory', 'Attend 2-day onboarding training in Pune', 'Launch your zone — start earning from Day 1'],
    perks: ['Territory exclusivity', 'Revenue sharing dashboard', 'Branding & app support', 'Direct admin access'],
    requirements: ['₹25,000 one-time security deposit', 'Smartphone + laptop', 'Basic business knowledge'],
  },
  {
    id: 'merchant',
    icon: '🏪',
    title: 'Shop Owner / Merchant',
    badge: 'Zero Commission',
    badgeColor: '#4f46e5',
    rate: '0%',
    period: 'commission on orders',
    monthly: 'Keep 100% of revenue',
    desc: 'List your grocery store, restaurant, pharmacy, or service business. Accept orders from neighbors. Never pay commission.',
    steps: ['Register your shop with Aadhaar + GST', 'Upload menu or service catalog', 'Receive direct orders from neighbors'],
    perks: ['Zero middleman fees', 'Subscription & pre-order support', 'Society-exclusive deals', 'Rating & reviews'],
    requirements: ['Valid business (any type)', 'Smartphone', 'Dhanori/Pune area location'],
  },
  {
    id: 'agent',
    icon: '💼',
    title: 'Sub-Agent (Referral)',
    badge: 'Passive Income',
    badgeColor: '#8b5cf6',
    rate: '₹50',
    period: 'per verified referral',
    monthly: 'Unlimited earning potential',
    desc: 'Refer neighbors, shops, or service providers to LocalSampark. Every verified signup earns you wallet credits.',
    steps: ['Get your unique referral link from the app', 'Share with neighbors, shops, and friends', 'Earn ₹50 per verified account'],
    perks: ['No time limit', 'Stackable credits', 'Tier bonuses for 10+, 25+ referrals', 'Leaderboard prizes'],
    requirements: ['Active LocalSampark account', 'Smartphone', 'Any Pune resident'],
  },
];

export default function EarnPage() {
  const [activeStream, setActiveStream] = useState('runner');
  const [calcHours, setCalcHours] = useState(4);
  const [calcDays, setCalcDays] = useState(22);

  const stream = STREAMS.find(s => s.id === activeStream);

  const runnerEarning = activeStream === 'runner'
    ? { min: calcHours * 35 * calcDays, max: calcHours * 65 * calcDays }
    : null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1 }}>

        {/* Hero */}
        <section style={{ padding: '6rem 0 4rem', background: 'radial-gradient(circle at 70% 30%, rgba(99,102,241,0.08) 0%, transparent 50%)' }}>
          <div className="container" style={{ textAlign: 'center' }}>
            <span className="badge badge-primary" style={{ marginBottom: '1rem' }}>💸 Earning Opportunities</span>
            <h1 style={{ fontSize: '3.2rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1.25rem' }}>
              Start Earning with<br /><span className="gradient-text">LocalSampark</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.15rem', maxWidth: '620px', margin: '0 auto 3rem', lineHeight: 1.7 }}>
              4 different earning streams for Pune residents — from daily delivery gigs to full franchise territories. 
              Transparent, instant payouts via your LocalSampark Wallet.
            </p>
            {/* Global Stats */}
            <div style={{ display: 'inline-flex', gap: '3rem', background: 'var(--card-bg)', border: '1px solid var(--card-border)', borderRadius: '1.5rem', padding: '2rem 3rem', backdropFilter: 'blur(16px)' }}>
              {[
                { v: '₹1.2 Cr+', l: 'Paid Out to Earners' },
                { v: '2,400+', l: 'Active Earners in Pune' },
                { v: '₹25,000', l: 'Top Monthly Earner' },
              ].map((s, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary)' }}>{s.v}</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stream Selector */}
        <section style={{ padding: '4rem 0' }}>
          <div className="container">
            {/* Tabs */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '3.5rem' }}>
              {STREAMS.map(s => (
                <button key={s.id} onClick={() => setActiveStream(s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem',
                  padding: '0.75rem 1.5rem', borderRadius: '50px', cursor: 'pointer',
                  fontWeight: 700, fontSize: '0.95rem', transition: 'all 0.3s',
                  background: activeStream === s.id ? 'var(--primary)' : 'var(--background-alt)',
                  color: activeStream === s.id ? 'white' : 'var(--text)',
                  border: activeStream === s.id ? 'none' : '1px solid var(--border)',
                  boxShadow: activeStream === s.id ? '0 8px 20px -4px rgba(79,70,229,0.4)' : 'none'
                }}>
                  {s.icon} {s.title}
                </button>
              ))}
            </div>

            {/* Active Stream Detail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
              {/* Left: Info */}
              <div>
                <div className="glass-card card-3d" style={{ padding: '2.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                    <span style={{ fontSize: '3.5rem' }}>{stream.icon}</span>
                    <span style={{ background: stream.badgeColor + '22', color: stream.badgeColor, padding: '0.3rem 0.8rem', borderRadius: '50px', fontSize: '0.78rem', fontWeight: 700 }}>
                      {stream.badge}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>{stream.title}</h2>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--primary)' }}>{stream.rate}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{stream.period}</span>
                  </div>
                  <div style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '0.4rem 0.8rem', borderRadius: '0.5rem', fontSize: '0.85rem', fontWeight: 700, display: 'inline-block', marginBottom: '1.25rem' }}>
                    {stream.monthly}
                  </div>
                  <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '2rem' }}>{stream.desc}</p>

                  <h4 style={{ marginBottom: '1rem', fontSize: '1rem' }}>📋 How to Get Started</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                    {stream.steps.map((step, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>{i + 1}</div>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginTop: '0.2rem' }}>{step}</p>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => alert('Application registered! Our Pune team will contact you within 24 hours.')} className="btn btn-accent" style={{ width: '100%', fontSize: '1rem' }}>
                    Apply Now — Start Earning Today
                  </button>
                </div>

                {/* Requirements */}
                <div className="glass-card" style={{ padding: '1.75rem' }}>
                  <h4 style={{ marginBottom: '1rem' }}>✅ Requirements</h4>
                  <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {stream.requirements.map((r, i) => (
                      <li key={i} style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--accent)' }}>✓</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Right: Perks + Calculator */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                {/* Perks */}
                <div className="glass-card" style={{ padding: '2rem' }}>
                  <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem' }}>🎁 Perks & Benefits</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    {stream.perks.map((perk, i) => (
                      <div key={i} style={{ background: 'var(--primary-light)', borderRadius: '0.75rem', padding: '1rem', textAlign: 'center' }}>
                        <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--primary)' }}>{perk}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Earnings Calculator (only for runner) */}
                {activeStream === 'runner' && (
                  <div className="glass-card" style={{ padding: '2rem', border: '2px solid var(--primary)' }}>
                    <h3 style={{ marginBottom: '0.5rem' }}>🧮 Earnings Calculator</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Estimate your monthly income as a runner</p>
                    <div className="form-group">
                      <label className="form-label">Hours worked per day: <strong>{calcHours}h</strong></label>
                      <input type="range" min={1} max={12} value={calcHours} onChange={e => setCalcHours(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Days worked per month: <strong>{calcDays} days</strong></label>
                      <input type="range" min={1} max={30} value={calcDays} onChange={e => setCalcDays(+e.target.value)} style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    </div>
                    <div style={{ background: 'linear-gradient(135deg, var(--primary), #6366f1)', borderRadius: '1rem', padding: '1.5rem', color: 'white', textAlign: 'center' }}>
                      <p style={{ opacity: 0.8, fontSize: '0.85rem' }}>Estimated Monthly Income</p>
                      <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'white', margin: '0.25rem 0' }}>
                        ₹{runnerEarning.min.toLocaleString()} – ₹{runnerEarning.max.toLocaleString()}
                      </h2>
                      <p style={{ opacity: 0.75, fontSize: '0.8rem' }}>Based on ₹35–₹65/delivery avg. (actual may vary)</p>
                    </div>
                  </div>
                )}

                {/* Referral bonus callout */}
                <div className="glass-card" style={{ background: 'var(--accent-light)', border: 'none', padding: '2rem' }}>
                  <h3 style={{ color: 'var(--accent)', marginBottom: '0.5rem' }}>🎁 Referral Loop Rewards</h3>
                  <p style={{ color: 'var(--text)', fontSize: '0.95rem', lineHeight: 1.6 }}>
                    Invite neighbors to join LocalSampark and earn <strong>₹50 wallet credit</strong> per verified sign-up. No limit on referrals.
                  </p>
                  <div style={{ marginTop: '1rem', fontWeight: 700, fontSize: '1.1rem', color: 'var(--accent)' }}>
                    10 referrals = ₹500 bonus. 25+ = Extra tier bonus! 🚀
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
