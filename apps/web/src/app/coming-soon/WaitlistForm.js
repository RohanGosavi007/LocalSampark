'use client';
import { useState } from 'react';
import { apiPost } from '@/lib/api';

/** Pincode waitlist for a module that is not live yet (POST /gtm/interest-lead). */
export default function WaitlistForm({ feature }) {
  const [pincode, setPincode] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | done | error
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    const pin = pincode.trim();
    if (!/^[1-9][0-9]{5}$/.test(pin)) {
      setError('Please enter a valid 6-digit pincode.');
      setStatus('error');
      return;
    }
    setStatus('sending');
    setError('');
    try {
      await apiPost('/gtm/interest-lead', { feature_key: feature, pincode: pin });
      setStatus('done');
    } catch (err) {
      setError(err && err.message ? err.message : 'Could not save your request. Please try again.');
      setStatus('error');
    }
  };

  if (status === 'done') {
    return (
      <div className="glass-card" role="status" style={{ padding: '1.5rem' }}>
        <strong>You are on the list.</strong>
        <p style={{ color: 'var(--text-muted)', margin: '0.5rem 0 0' }}>
          We will let you know when this opens near {pincode.trim()}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass-card" style={{ padding: '1.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
      <label htmlFor="waitlist-pincode" className="sr-only">Your pincode</label>
      <input
        id="waitlist-pincode"
        className="form-input"
        inputMode="numeric"
        autoComplete="postal-code"
        maxLength={6}
        placeholder="Your pincode, e.g. 411015"
        value={pincode}
        onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, ''))}
        style={{ flex: '1 1 200px', minWidth: 0 }}
      />
      <button type="submit" className="btn btn-primary" disabled={status === 'sending'}>
        {status === 'sending' ? 'Saving…' : 'Notify me'}
      </button>
      {status === 'error' && error && (
        <p role="alert" style={{ color: 'var(--danger, #dc2626)', width: '100%', margin: 0, fontSize: '0.9rem' }}>{error}</p>
      )}
    </form>
  );
}
