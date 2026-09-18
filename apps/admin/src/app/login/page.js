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
  // The three failure paths all prefix with ❌; the two success paths use 🔐
  // and ✅. Deriving the tone from the message keeps one source of truth rather
  // than a second piece of state that can fall out of step with it.
  const isFailure = message.startsWith('❌');
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
      background: 'var(--ground)',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'var(--ink)',
      padding: '1rem'
    }}>
      <div style={{
        width: '100%',
        maxWidth: '420px',
        padding: '2.5rem',
        background: 'var(--surface-1)',
        borderRadius: '1rem',
        border: '1px solid var(--line)',
        boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginTop: '1rem', color: 'var(--ink)' }}>LocalSampark Control Center</h2>
          <p style={{ color: 'var(--ink-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Authorized Personnel Only</p>
        </div>

        {message && (
          /* One style served every message, so "Login Failed" and "Dev login
             failed" rendered in the success green with an indigo wash — a
             failure that reads as a success. The tone now follows the message:
             all three failure paths prefix with ❌. */
          <div
            role={isFailure ? 'alert' : 'status'}
            aria-live={isFailure ? 'assertive' : 'polite'}
            style={{
              padding: '0.75rem',
              borderRadius: '0.5rem',
              background: isFailure ? 'var(--danger-quiet)' : 'var(--success-quiet)',
              border: `1px solid ${isFailure ? 'var(--danger)' : 'var(--success)'}`,
              color: isFailure ? 'var(--danger)' : 'var(--success)',
              fontSize: '0.85rem',
              marginBottom: '1.5rem',
              fontWeight: 600
            }}
          >
            {message}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOtp}>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>ADMIN PHONE NUMBER</label>
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
                  border: '1px solid var(--line)',
                  background: 'var(--ground)',
                  color: 'var(--ink)',
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
                background: 'var(--accent)',
                color: 'var(--on-solid)',
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
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>ENTER SMS OTP</label>
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
                  border: '1px solid var(--line)',
                  background: 'var(--ground)',
                  color: 'var(--ink)',
                  fontSize: '0.95rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--ink-muted)', marginBottom: '0.5rem', fontWeight: 600 }}>ENTER 6-DIGIT ADMIN PIN</label>
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
                  border: '1px solid var(--line)',
                  background: 'var(--ground)',
                  color: 'var(--ink)',
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
                background: 'var(--success)',
                color: 'var(--on-solid)',
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
                color: 'var(--accent-text)',
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

        <div style={{ marginTop: '2rem', borderTop: '1px solid var(--line)', paddingTop: '1.25rem' }}>
          <button
            onClick={handleQuickLogin}
            style={{
              width: '100%',
              padding: '0.5rem',
              background: 'var(--ground)',
              color: 'var(--ink-muted)',
              border: '1px solid var(--line)',
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
