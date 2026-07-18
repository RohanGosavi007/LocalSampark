'use client';
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <main style={{ flex: 1, padding: '5rem 0' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ marginBottom: '3.5rem', textAlign: 'center' }}>
            <span className="badge badge-primary" style={{ marginBottom: '0.5rem' }}>Our Story</span>
            <h1 style={{ fontSize: '3rem', fontWeight: 800, letterSpacing: '-0.04em' }}>About LocalSampark</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Empowering local communities and economies through open digital connections.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            <section className="glass-card">
              <h2 style={{ marginBottom: '1rem', fontSize: '1.6rem' }}>Our Mission</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                LocalSampark (लोकल संपर्क) is designed to bring local housing societies, neighborhood retailers, service providers, and residents together on a single, secure digital platform. Our goal is to reduce dependency on high-commission global aggregates by offering a commission-free direct trading and logistics framework.
              </p>
            </section>

            <section className="glass-card" style={{ borderLeft: '4px solid var(--secondary)' }}>
              <h2 style={{ marginBottom: '1rem', fontSize: '1.6rem' }}>Pilot Project: Dhanori, Pune</h2>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7' }}>
                We are actively running our initial pilot project in the Dhanori neighborhood of Pune, Maharashtra. Over 12,000 residents across various societies use our app daily to communicate, share carpools, discover properties, trade used items, and support local businesses.
              </p>
            </section>

            <section className="glass-card">
              <h2 style={{ marginBottom: '1rem', fontSize: '1.6rem' }}>Platform Features</h2>
              <ul style={{ paddingLeft: '1.5rem', color: 'var(--text-muted)', lineHeight: '1.8' }}>
                <li>🔒 OTP verified user accounts to ensure community safety.</li>
                <li>🛒 Commission-free digital storefronts for verified merchants.</li>
                <li>🔧 Gig economy engine connecting plumbers, electricians, and tutors directly.</li>
                <li>📦 Peer-to-peer micro-delivery network with zero platform commissions.</li>
                <li>🚗 Local carpool matches to IT parks like Kharadi and Hinjewadi.</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
