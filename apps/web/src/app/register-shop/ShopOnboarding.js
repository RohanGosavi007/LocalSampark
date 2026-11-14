'use client';

import React, { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';

/**
 * S1 on the web: register a shop, then submit KYC.
 *
 * This page had a form whose inputs went nowhere and whose "Create Digital
 * Storefront" button only reloaded the page — someone who filled it in
 * believed they had registered and nothing was saved. No web screen submitted
 * KYC at all; only the admin review side existed.
 *
 * Step 1: POST /shops (name, category, address, position — the API needs the
 * position to place the shop on the map). Step 2: POST /shops/:id/kyc. A
 * seller who already has a shop lands on step 2 with its current status.
 * Server problems are shown beside the field they are about.
 */
const field = 'w-full bg-background-alt border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500';
const label = 'block text-sm font-bold text-text-muted mb-2';

const KYC_STATUS = {
  not_started: 'Not submitted yet',
  submitted: 'Submitted — under review',
  under_review: 'Under review',
  verified: 'Verified',
  rejected: 'Needs changes',
  resubmission_required: 'Needs changes',
};

function problemsOf(err) {
  const list = err && err.data && Array.isArray(err.data.problems) ? err.data.problems : [];
  return Object.fromEntries(list.map((p) => [p.field, p.message]));
}

export default function ShopOnboarding() {
  const [signedIn, setSignedIn] = useState(null);
  const [shop, setShop] = useState(null);
  const [kyc, setKyc] = useState(null);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: '', category: '', phone_number: '', address: '', pincode: '' });
  const [position, setPosition] = useState(null);
  const [kycForm, setKycForm] = useState({ pan_number: '', gst_number: '', bank_account_number: '', bank_ifsc: '', bank_name: '' });
  const [problems, setProblems] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let token = null;
    try { token = localStorage.getItem('auth_token'); } catch { /* storage blocked */ }
    setSignedIn(Boolean(token));
    apiGet('/shops/categories')
      .then((r) => setCategories(Array.isArray(r) ? r : (r && r.categories) || []))
      .catch(() => setCategories([]));
    if (!token) return;
    apiGet('/shops/my-shop')
      .then(async (r) => {
        if (r && r.shop) {
          setShop(r.shop);
          const k = await apiGet(`/shops/${r.shop.id}/kyc`).catch(() => null);
          setKyc((k && k.kyc) || { kyc_status: 'not_started' });
        }
      })
      .catch(() => { /* 404: no shop yet */ });
  }, []);

  const set = (setter) => (key) => (e) => setter((f) => ({ ...f, [key]: e.target.value }));

  const locate = () => {
    setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('This browser cannot share its location. Register from the shop on your phone instead.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setPosition({ latitude: coords.latitude, longitude: coords.longitude }),
      (e) => setError(e && e.code === 1 ? 'Location permission was refused. Allow it while you are at your shop.' : 'Your location could not be found.'),
      { timeout: 10000 }
    );
  };

  const register = async (e) => {
    e.preventDefault();
    setError(''); setProblems({}); setNotice('');
    if (!position) { setProblems({ latitude: 'Use your current location while you are at the shop, so customers can find it on the map.' }); return; }
    setBusy(true);
    try {
      const created = await apiPost('/shops', { ...form, ...position });
      setShop({ id: created.id, name: created.name, approval_status: created.approval_status || 'pending' });
      setKyc({ kyc_status: 'not_started' });
      setNotice(`${created.name} is registered. It goes live after verification — submit your KYC below.`);
    } catch (err) {
      setProblems(problemsOf(err));
      setError(err.message || 'Your shop could not be registered.');
    } finally {
      setBusy(false);
    }
  };

  const submitKyc = async (e) => {
    e.preventDefault();
    setError(''); setProblems({}); setNotice('');
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries(kycForm).filter(([, v]) => String(v).trim() !== '').map(([k, v]) => [k, String(v).trim()]));
      await apiPost(`/shops/${shop.id}/kyc`, body);
      setKyc({ kyc_status: 'submitted' });
      setNotice('KYC submitted. We will review it and tell you when your shop is verified.');
    } catch (err) {
      setProblems(problemsOf(err));
      setError(err.message || 'Your KYC could not be submitted.');
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key) => problems[key] && <p role="alert" className="text-xs text-red-600 mt-1">{problems[key]}</p>;

  if (signedIn === null) return null;

  if (!signedIn) {
    return (
      <div data-testid="onboarding">
        <h3 className="text-2xl font-black mb-4">Register your shop</h3>
        <p className="text-text-muted mb-6">Sign in with your mobile number first; your shop is registered to your account.</p>
        <a href="/login" className="btn btn-primary w-full rounded-xl py-3 text-center block">Sign in to continue</a>
      </div>
    );
  }

  return (
    <div data-testid="onboarding">
      {error && <p role="alert" className="text-sm text-red-600 mb-4">{error}</p>}
      {notice && <p role="status" className="text-sm font-semibold mb-4">{notice}</p>}

      {!shop ? (
        <form onSubmit={register} aria-label="Register your shop" className="space-y-4">
          <h3 className="text-2xl font-black mb-2">Register your shop</h3>
          <div>
            <label htmlFor="shop-name" className={label}>Shop name</label>
            <input id="shop-name" className={field} required value={form.name} onChange={set(setForm)('name')} />
            {fieldError('name')}
          </div>
          <div>
            <label htmlFor="shop-category" className={label}>Category</label>
            <select id="shop-category" className={field} required value={form.category} onChange={set(setForm)('category')}>
              <option value="">Choose a category</option>
              {categories.map((c) => <option key={c.id || c.slug || c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="shop-phone" className={label}>Shop phone</label>
            <input id="shop-phone" className={field} inputMode="tel" value={form.phone_number} onChange={set(setForm)('phone_number')} />
            {fieldError('phoneNumber') || fieldError('phone_number')}
          </div>
          <div>
            <label htmlFor="shop-address" className={label}>Address</label>
            <input id="shop-address" className={field} required value={form.address} onChange={set(setForm)('address')} />
            {fieldError('address')}
          </div>
          <div>
            <label htmlFor="shop-pincode" className={label}>Pincode</label>
            <input id="shop-pincode" className={field} inputMode="numeric" maxLength={6} value={form.pincode} onChange={set(setForm)('pincode')} />
          </div>
          <div>
            <button type="button" onClick={locate} className="btn btn-secondary w-full rounded-xl py-3 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" /> {position ? 'Location set — use again' : 'Use my current location'}
            </button>
            {position && <p role="status" className="text-xs text-text-muted mt-1">Location set: {position.latitude.toFixed(5)}, {position.longitude.toFixed(5)}</p>}
            {fieldError('latitude') || fieldError('longitude')}
          </div>
          <button type="submit" disabled={busy} className="btn btn-primary w-full rounded-xl py-3">
            {busy ? 'Registering…' : 'Register shop'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <h3 className="text-2xl font-black">{shop.name}</h3>
          <p data-testid="kyc-status" className="text-sm">
            KYC: <strong>{KYC_STATUS[kyc && kyc.kyc_status] || (kyc && kyc.kyc_status) || 'Not submitted yet'}</strong>
            {kyc && kyc.rejection_reason ? ` — ${kyc.rejection_reason}` : ''}
          </p>
          {kyc && ['not_started', 'rejected', 'resubmission_required'].includes(kyc.kyc_status) && (
            <form onSubmit={submitKyc} aria-label="Submit KYC" className="space-y-4">
              <div>
                <label htmlFor="kyc-pan" className={label}>PAN</label>
                <input id="kyc-pan" className={field} required autoCapitalize="characters" value={kycForm.pan_number} onChange={set(setKycForm)('pan_number')} />
                {fieldError('pan_number')}
              </div>
              <div>
                <label htmlFor="kyc-gst" className={label}>GSTIN (if registered)</label>
                <input id="kyc-gst" className={field} autoCapitalize="characters" value={kycForm.gst_number} onChange={set(setKycForm)('gst_number')} />
                {fieldError('gst_number')}
              </div>
              <div>
                <label htmlFor="kyc-account" className={label}>Bank account number</label>
                <input id="kyc-account" className={field} inputMode="numeric" autoComplete="off" value={kycForm.bank_account_number} onChange={set(setKycForm)('bank_account_number')} />
                {fieldError('bank_account_number')}
              </div>
              <div>
                <label htmlFor="kyc-ifsc" className={label}>IFSC</label>
                <input id="kyc-ifsc" className={field} autoCapitalize="characters" value={kycForm.bank_ifsc} onChange={set(setKycForm)('bank_ifsc')} />
                {fieldError('bank_ifsc')}
              </div>
              <div>
                <label htmlFor="kyc-bank" className={label}>Bank name</label>
                <input id="kyc-bank" className={field} value={kycForm.bank_name} onChange={set(setKycForm)('bank_name')} />
              </div>
              <button type="submit" disabled={busy} className="btn btn-primary w-full rounded-xl py-3">
                {busy ? 'Submitting…' : 'Submit KYC'}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
