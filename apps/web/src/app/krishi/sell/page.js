'use client';
import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function Page() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, padding: '4rem 0', background: 'var(--bg)' }}>
        <div className='container'>
          <div className='glass-card' style={{ padding: '3rem', textAlign: 'center' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', textTransform: 'capitalize' }}>Welcome to Feature: sell</h2>
            <p style={{ color: 'var(--text-muted)' }}>This feature module has been successfully integrated as part of the Rural & Krishi Expansion V3.</p>
            <p style={{ color: 'var(--text-muted)', marginTop: '1rem' }}>Super Admin configurations for revenue models and dynamic content are active.</p>
            <a href='/krishi' className='btn btn-primary' style={{ marginTop: '2rem', display: 'inline-block' }}>Back to Krishi Dashboard</a>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
