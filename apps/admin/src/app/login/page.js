'use client';
import React, { useState } from 'react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { API_BASE } from '../../lib/api';

export default function AdminLoginPage() {
  const { loginAdmin, error } = useAdminAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [pin, setPin] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = Pin + OTP
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phoneNumber) return;
    setLoading(true);
    setMessage('');
    try {
      // Mock OTP trigger on backend
      const res = await fetch(`${API_BASE}/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      
      setStep(2);
      setMessage(`🔐 Verification code sent successfully! ${data.otp ? `[DEV: ${data.otp}]` : ''}`);
    } catch (err) {
      setMessage(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      await loginAdmin(phoneNumber, pin, otp);
      setMessage('✅ Verification successful! Loading Admin Console...');
      window.location.href = '/';
    } catch (err) {
      setMessage(`❌ Login Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Quick preset login for dev
  const handleQuickLogin = async () => {
    setLoading(true);
    try {
      await loginAdmin('+919999999991', '123456', '123456');
      window.location.href = '/';
    } catch (err) {
      setMessage(`❌ Dev login failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0f172a',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: '#f8fafc',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        background: '#1e293b',
        borderRadius: '1rem',
        border: '1px solid #334155',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1rem', color: '#fff' }}>LocalSampark Control Center</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>Authorized Personnel Only</p>
        </div>

        {message && (
          <div style={{
            padding: '0.75rem',
            borderRadius: '0.5rem',
            background: 'rgba(79, 70, 229, 0.15)',
            border: '1px solid #4f46e5',
            color: '#818cf8',
            fontSize: '0.85rem',
            marginBottom: '1.5rem',
            fontWeight: 600
          }}>
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>ADMIN PHONE NUMBER</label>
              <input
                type="tel"
                placeholder="e.g. +91 99999 99999"
                value={phoneNumber}
                onChange={e => setPhoneNumber(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem',
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? 'Requesting OTP...' : 'Send Security OTP'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleAdminVerify}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>ENTER SMS OTP</label>
              <input
                type="text"
                placeholder="XXXXXX"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem', fontWeight: 600 }}>ENTER 6-DIGIT ADMIN PIN</label>
              <input
                type="password"
                placeholder="••••••"
                maxLength={6}
                value={pin}
                onChange={e => setPin(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #334155',
                  background: '#0f172a',
                  color: '#fff',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box',
                  letterSpacing: '0.25em'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {loading ? 'Authenticating...' : 'Verify Credentials & Access'}
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                color: '#6366f1',
                fontSize: '0.8rem',
                fontWeight: 600,
                marginTop: '1.25rem',
                cursor: 'pointer'
              }}
            >
              Change Phone Number
            </button>
          </form>
        )}

        <div style={{ marginTop: '2rem', borderTop: '1px solid #334155', paddingTop: '1.25rem' }}>
          <button
            onClick={handleQuickLogin}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: '#0f172a',
              color: '#94a3b8',
              border: '1px solid #334155',
              borderRadius: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            ⚡ DEV: Bypass via Quick Login
          </button>
        </div>
      </div>
    </div>
  );
}
