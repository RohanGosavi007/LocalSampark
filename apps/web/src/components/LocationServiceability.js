'use client';

import React, { useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';

/**
 * C2 on the web: "use my current location", and what happens when we do not
 * serve it yet.
 *
 * The header's location picker only listed zones to choose from, so someone
 * outside every zone was never told so, and the waitlist that decides the next
 * zone (POST /zones/waitlist) had no way in. Inside a zone this sets the
 * location; outside it says so, names the nearest zone, and offers the list.
 */
export default function LocationServiceability({ onInZone }) {
  const [state, setState] = useState({ step: 'idle' }); // idle | locating | outside | joined | error
  const [contact, setContact] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({ step: 'error', message: 'This browser cannot share your location.' });
      return;
    }
    setState({ step: 'locating' });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const res = await apiGet(`/zones/resolve?lat=${coords.latitude}&lng=${coords.longitude}`);
          if (res && !res.outOfBounds && res.territory) {
            setState({ step: 'idle' });
            onInZone && onInZone({ territory: res.territory, lat: coords.latitude, lng: coords.longitude });
          } else {
            setState({ step: 'outside', lat: coords.latitude, lng: coords.longitude, nearest: (res && res.nearest) || null });
          }
        } catch (e) {
          setState({ step: 'error', message: 'Your area could not be checked. Please try again.' });
        }
      },
      (err) => setState({
        step: 'error',
        message: err && err.code === 1 ? 'Location permission was refused. Choose your area below instead.' : 'Your location could not be found.',
      }),
      { timeout: 10000 }
    );
  };

  const join = async (e) => {
    e.preventDefault();
    const value = contact.trim();
    const isEmail = value.includes('@');
    if (!value) { setFormError('Enter a mobile number or email so we can tell you.'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await apiPost('/zones/waitlist', {
        latitude: state.lat,
        longitude: state.lng,
        ...(isEmail ? { email: value } : { phone: value }),
      });
      setState((s) => ({ ...s, step: 'joined' }));
    } catch (err) {
      setFormError((err && err.message) || 'That did not work. Check the number or email and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mb-4" data-testid="serviceability">
      <button
        type="button"
        onClick={locate}
        disabled={state.step === 'locating'}
        className="btn btn-secondary w-full py-2 text-sm"
      >
        {state.step === 'locating' ? 'Checking your area…' : 'Use my current location'}
      </button>

      {state.step === 'error' && <p role="alert" className="text-xs text-red-600 mt-2">{state.message}</p>}

      {state.step === 'outside' && (
        <div role="status" className="mt-3 text-sm">
          <p className="font-semibold">We don&apos;t deliver to your area yet.</p>
          {state.nearest && (
            <p className="text-xs text-text-muted mt-1">
              The nearest area we serve is {state.nearest.name}
              {Number.isFinite(Number(state.nearest.distance_km)) ? `, about ${Math.round(Number(state.nearest.distance_km))} km away` : ''}.
            </p>
          )}
          <form onSubmit={join} className="mt-3 flex flex-col gap-2" aria-label="Join the waitlist">
            <label htmlFor="waitlist-contact" className="text-xs">Tell me when you reach my area</label>
            <input
              id="waitlist-contact"
              className="form-input text-sm"
              placeholder="Mobile number or email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              autoComplete="on"
            />
            {formError && <p role="alert" className="text-xs text-red-600">{formError}</p>}
            <button type="submit" disabled={submitting} className="btn btn-primary w-full py-2 text-sm">
              {submitting ? 'Adding you…' : 'Join the waitlist'}
            </button>
          </form>
        </div>
      )}

      {state.step === 'joined' && (
        <p role="status" className="mt-3 text-sm font-semibold">You&apos;re on the list. We&apos;ll tell you when we reach your area.</p>
      )}
    </div>
  );
}
