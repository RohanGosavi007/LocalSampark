'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api';

/**
 * S5: the shop's own coupons — list, create, switch off.
 *
 * Reads and writes /shops/:id/coupons, which only the shop's owner may use;
 * the server pins every coupon to this shop, so it never discounts another
 * shop's order. Server refusals (bad terms, a code already taken) are shown
 * as the server words them.
 */
const EMPTY = { code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_discount_amount: '' };

export default function ShopCouponsManager({ token, shopId }) {
  const [coupons, setCoupons] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const call = useCallback(async (path, init = {}) => {
    const res = await fetch(`${API_BASE}/shops/${shopId}/coupons${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
    return body;
  }, [shopId, token]);

  const load = useCallback(async () => {
    try {
      const body = await call('');
      setCoupons(body.data || []);
    } catch (e) {
      setError(e.message);
    }
  }, [call]);

  useEffect(() => { if (token && shopId) load(); }, [token, shopId, load]);

  const create = async (e) => {
    e.preventDefault();
    setError(''); setNotice(''); setBusy(true);
    try {
      const payload = {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: form.min_order_amount === '' ? 0 : Number(form.min_order_amount),
        ...(form.max_discount_amount !== '' ? { max_discount_amount: Number(form.max_discount_amount) } : {}),
      };
      const body = await call('', { method: 'POST', body: JSON.stringify(payload) });
      setNotice(`Coupon ${body.data.code} created.`);
      setForm(EMPTY);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (coupon) => {
    setError(''); setNotice('');
    const on = !isActive(coupon);
    try {
      await call(`/${coupon.id}`, { method: 'PATCH', body: JSON.stringify({ is_active: on }) });
      setNotice(`Coupon ${coupon.code} ${on ? 'switched on' : 'switched off'}.`);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <section aria-labelledby="coupons-heading" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2 id="coupons-heading" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Coupons</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Coupons you make here work only on orders from your shop.</p>

      <form onSubmit={create} aria-label="New coupon" style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <label>Code<input className="form-input" required value={form.code} onChange={set('code')} /></label>
        <label>Type
          <select className="form-input" value={form.discount_type} onChange={set('discount_type')}>
            <option value="percentage">Percentage off</option>
            <option value="fixed">Amount off (₹)</option>
          </select>
        </label>
        <label>Discount<input className="form-input" required inputMode="decimal" value={form.discount_value} onChange={set('discount_value')} /></label>
        <label>Minimum order (₹)<input className="form-input" inputMode="decimal" value={form.min_order_amount} onChange={set('min_order_amount')} /></label>
        <label>Maximum discount (₹)<input className="form-input" inputMode="decimal" value={form.max_discount_amount} onChange={set('max_discount_amount')} /></label>
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Create coupon'}</button>
      </form>

      {error && <p role="alert" style={{ color: '#dc2626' }}>{error}</p>}
      {notice && <p role="status">{notice}</p>}

      {coupons.length === 0 ? (
        <p role="status" style={{ color: 'var(--text-muted)' }}>No coupons yet.</p>
      ) : (
        <ul aria-label="Your coupons" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {coupons.map((c) => (
            <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid rgba(148,163,184,0.3)', borderRadius: 10 }}>
              <span>
                <strong>{c.code}</strong>{' — '}
                {String(c.discount_type) === 'percentage' ? `${Number(c.discount_value)}% off` : `₹${Number(c.discount_value)} off`}
                {Number(c.min_order_amount) > 0 ? ` on orders over ₹${Number(c.min_order_amount)}` : ''}
                {' · '}{isActive(c) ? 'Active' : 'Off'}
              </span>
              <button type="button" className="btn btn-secondary" onClick={() => toggle(c)}>
                {isActive(c) ? `Switch off ${c.code}` : `Switch on ${c.code}`}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function isActive(c) {
  return [true, 1, '1', 't', 'true'].includes(c.is_active);
}
