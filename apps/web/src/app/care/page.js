'use client';
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Caregivers are listed through the services directory. This page showed three invented people
// ("Sunita Bhosale — 4.9 ★, 5 years") with a "match" button that confirmed without contacting anyone.
export default function CarePage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: 640 }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '1rem' }}>Care &amp; Companions</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
            Nannies, elder-care companions and pet sitters registered on LocalSampark appear in the services directory.
          </p>
          <a href="/services" className="btn btn-primary">Browse services</a>
        </div>
      </main>
      <Footer />
    </div>
  );
}
