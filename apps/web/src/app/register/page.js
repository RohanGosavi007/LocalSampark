'use client';
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function RegisterPage() {
  const { registerEmail, sendOtp, verifyOtp } = useAuth();
  const [method, setMethod] = useState('email');
  const [activeOtpChannel, setActiveOtpChannel] = useState('firebase'); // 'firebase' | 'phone'
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);
  const [otp, setOtp] = useState('');

  const update = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleEmailRegister = async (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setMessage('❌ Password must be at least 8 characters.');
      return;
    }
    if (form.password !== form.confirm) {
      setMessage('❌ Passwords do not match.');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const data = await registerEmail(form.email, form.password, form.name, '');
      if (data && data.accessToken) {
        window.location.href = '/';
      } else {
        setMessage('✅ Account created successfully! Logging you in...');
        setTimeout(() => { window.location.href = '/'; }, 1000);
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSendPhoneOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const clean = form.phone.replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      setMessage('❌ Please enter a valid 10-digit mobile number.');
      setLoading(false);
      return;
    }
    const fullPhone = clean.startsWith('91') && clean.length > 10 ? `+${clean}` : `+91${clean.slice(-10)}`;

    try {
      // 1. Attempt real SMS delivery via Google Firebase (10k free/month)
      try {
        await sendOtp(fullPhone, 'firebase');
        setActiveOtpChannel('firebase');
        setStep(2);
        setMessage(`📱 Real SMS OTP sent via Google to ${fullPhone}. Check your phone.`);
        return;
      } catch (firebaseErr) {
        console.warn('Firebase SMS delivery failed/unavailable, falling back to server OTP:', firebaseErr?.message);
      }

      // 2. Graceful fallback to server-side Free OTP Pilot Mode
      const res = await sendOtp(fullPhone, 'phone');
      setActiveOtpChannel('phone');
      setStep(2);
      setMessage(`📱 OTP generated for ${fullPhone}.${res && res.otp ? ` [Verification Code: ${res.otp}]` : ''}`);
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPhoneOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const clean = form.phone.replace(/[^0-9]/g, '');
    const fullPhone = clean.startsWith('91') && clean.length > 10 ? `+${clean}` : `+91${clean.slice(-10)}`;

    try {
      let data;
      if (activeOtpChannel === 'firebase') {
        try {
          data = await verifyOtp(fullPhone, otp, form.name, '', 'firebase');
        } catch (fbErr) {
          console.warn('Firebase verify failed, attempting direct verify fallback:', fbErr?.message);
          data = await verifyOtp(fullPhone, otp, form.name, '', 'phone');
        }
      } else {
        data = await verifyOtp(fullPhone, otp, form.name, '', 'phone');
      }

      if (data && data.registered && data.accessToken) {
        window.location.href = '/';
      } else {
        setMessage('❌ We could not finish creating your account. Please try again.');
      }
    } catch (err) {
      setMessage(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem 0' }}>
        <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '2.5rem' }}>

          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <span style={{ fontSize: '3rem' }}>🏘️</span>
            <h1 style={{ fontSize: '1.75rem', marginTop: '0.75rem' }}>Create Your Account</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Join the LocalSampark neighborhood network</p>
          </div>

          {/* Method toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: 'var(--background)', padding: '0.35rem', borderRadius: '0.5rem' }}>
            {['email', 'phone'].map((t) => (
              <button key={t} onClick={() => { setMethod(t); setStep(1); setMessage(''); }}
                style={{ flex: 1, padding: '0.5rem', borderRadius: '0.35rem', border: 'none', background: method === t ? 'var(--primary)' : 'transparent', color: method === t ? 'white' : 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'capitalize', cursor: 'pointer' }}>
                {t === 'email' ? '📧 Email' : '📱 Phone OTP'}
              </button>
            ))}
          </div>

          {/* Invisible Google reCAPTCHA container for Firebase Phone Auth */}
          <div id="recaptcha-container"></div>

          {message && (
            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'var(--primary-light)', color: 'var(--primary)', marginBottom: '1.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
              {message}
            </div>
          )}

          {/* EMAIL REGISTER */}
          {method === 'email' && (
            <form onSubmit={handleEmailRegister}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Ramesh Shinde" value={form.name} onChange={update('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address *</label>
                <input type="email" className="form-input" placeholder="name@email.com" value={form.email} onChange={update('email')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input type="password" className="form-input" placeholder="Minimum 8 characters" value={form.password} onChange={update('password')} required minLength={8} autoComplete="new-password" minLength={8} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password *</label>
                <input type="password" className="form-input" placeholder="Repeat your password" value={form.confirm} onChange={update('confirm')} required />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {loading ? 'Creating Account...' : 'Create Account & Verify Email'}
              </button>
            </form>
          )}

          {/* PHONE OTP REGISTER */}
          {method === 'phone' && step === 1 && (
            <form onSubmit={handleSendPhoneOtp}>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" placeholder="Ramesh Shinde" value={form.name} onChange={update('name')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number *</label>
                <input type="tel" className="form-input" placeholder="+91 XXXXX XXXXX" value={form.phone} onChange={update('phone')} required />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                {loading ? 'Sending OTP...' : 'Send OTP via SMS'}
              </button>
            </form>
          )}

          {method === 'phone' && step === 2 && (
            <form onSubmit={handleVerifyPhoneOtp}>
              <div className="form-group">
                <label className="form-label">Enter 6-Digit OTP</label>
                <input type="text" className="form-input" placeholder="XXXXXX" value={otp} onChange={(e) => setOtp(e.target.value)} required maxLength={6} />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%' }}>{loading ? 'Verifying...' : 'Verify & Create Account'}</button>
              <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ width: '100%', marginTop: '0.75rem' }}>Back</button>
            </form>
          )}

          <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Already have an account? <a href="/login" style={{ color: 'var(--primary)', fontWeight: 700 }}>Login here</a>
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
