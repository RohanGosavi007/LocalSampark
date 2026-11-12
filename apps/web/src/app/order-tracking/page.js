'use client';
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Package, CheckCircle2, Clock, Truck, XCircle } from 'lucide-react';
import { apiGet, apiPut, apiPost, API_BASE, getAuthHeaders } from '@/lib/api';
import { useCart } from '@/context/CartContext';
import { useSocket, useSocketEvent } from '@/context/SocketContext';

// The signed-in customer's real orders. This page used to show one made-up order from "Sharma
// Grocery & Daily Needs" delivered by "Ramesh Kumar", and subscribed to realtime tables
// ("Order", "OrderTracking") that this database does not have, so it could never update.
const STEPS = [
  { key: 'pending', label: 'Order placed', Icon: Clock },
  { key: 'confirmed', label: 'Accepted by the shop', Icon: CheckCircle2 },
  { key: 'preparing', label: 'Being prepared', Icon: Package },
  { key: 'out_for_delivery', label: 'Out for delivery', Icon: Truck },
  { key: 'delivered', label: 'Delivered', Icon: CheckCircle2 },
];
// Statuses between the listed ones count as the nearest earlier step.
const RANK = { pending: 0, confirmed: 1, accepted: 1, preparing: 2, ready: 2, assigned: 2, picked_up: 3, out_for_delivery: 3, delivered: 4 };

const label = (v) => { const t = String(v || 'pending').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
// C8: the one-hour window an order was placed for, in India time.
const slotText = (iso) => {
  if (!iso) return null;
  const start = new Date(iso);
  const fmt = (d) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
  const day = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });
  return `${day}, ${fmt(start)}–${fmt(new Date(start.getTime() + 3600000))}`;
};

function OrderList() {
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/orders/my-orders')
      .then((r) => setOrders(Array.isArray(r) ? r : (r && (r.data || r.rows)) || []))
      .catch((e) => setError(e.message || 'Your orders could not be loaded.'));
  }, []);

  if (error) return <p role="alert" className="text-red-500 font-bold">{error}</p>;
  if (orders === null) return <p className="text-text-muted">Loading your orders…</p>;
  if (orders.length === 0) return <p className="text-text-muted">You have not placed an order yet.</p>;
  return (
    <div className="space-y-3">
      {orders.map((o) => (
        <Link key={o.id} href={`/order-tracking?id=${o.id}`} className="block glass-card rounded-2xl border border-border p-5 hover:border-primary/40 transition-colors">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-bold text-text">{o.shop_name}</p>
              <p className="text-xs text-text-muted">#{String(o.id).slice(0, 8)} • {when(o.created_at)}</p>
            </div>
            <div className="text-right">
              <p className="font-black text-text">₹{Number(o.total_amount) || 0}</p>
              <p className="text-xs font-bold text-primary">{label(o.status)}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

/** Statuses a customer may still cancel from (the server enforces the same rule). */
const CUSTOMER_CANCELLABLE = ['pending', 'confirmed'];

/**
 * C9 actions on an order: cancel while the window is open, download the GST
 * invoice, order the same items again. The page had none of these; the
 * server already enforced the cancellation window and generated invoices.
 */
function OrderActions({ order, items, reload }) {
  const router = useRouter();
  const { dispatch } = useCart();
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);
  const status = String(order.status || '').toLowerCase();

  const cancel = async () => {
    if (!window.confirm('Cancel this order?')) return;
    setBusy('cancel');
    setNotice(null);
    try {
      await apiPut(`/orders/${order.id}/status`, { status: 'cancelled', reason: 'Cancelled by customer' });
      setNotice({ ok: true, text: 'Your order has been cancelled.' });
      reload();
    } catch (e) {
      // e.g. "The shop has started preparing this order, so it can no longer be cancelled."
      setNotice({ ok: false, text: e.message || 'The order could not be cancelled.' });
      reload();
    } finally {
      setBusy(null);
    }
  };

  const invoice = async () => {
    setBusy('invoice');
    setNotice(null);
    try {
      const res = await fetch(`${API_BASE}/orders/${order.id}/invoice/pdf`, { headers: getAuthHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `The invoice could not be downloaded (HTTP ${res.status}).`);
      }
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice-${String(order.id).slice(0, 8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setNotice({ ok: false, text: e.message });
    } finally {
      setBusy(null);
    }
  };

  // Re-order at today's prices: only items the shop still lists, priced as
  // they are now, never as they were on the old order.
  const reorder = async () => {
    setBusy('reorder');
    setNotice(null);
    try {
      const listed = await apiGet(`/shops/${order.shop_id}/products`);
      const current = new Map((Array.isArray(listed) ? listed : listed.data || []).map((p) => [String(p.id), p]));
      const missing = [];
      let added = 0;
      for (const it of items) {
        const product = current.get(String(it.product_id));
        if (!product) { missing.push(it.name || 'an item'); continue; }
        dispatch({
          type: 'ADD_ITEM',
          payload: { ...product, shop_id: order.shop_id, shop_name: order.shop_name, quantity: Number(it.quantity) || 1 },
        });
        added += 1;
      }
      if (!added) {
        setNotice({ ok: false, text: 'None of these items is available from the shop any more.' });
        return;
      }
      if (missing.length) window.alert(`Not available any more, so not added: ${missing.join(', ')}`);
      router.push('/checkout');
    } catch (e) {
      setNotice({ ok: false, text: e.message || 'Could not re-order.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {CUSTOMER_CANCELLABLE.includes(status) && (
          <button onClick={cancel} disabled={!!busy} className="px-4 py-2 min-h-[44px] rounded-xl border border-red-500 text-red-600 font-bold disabled:opacity-60">
            {busy === 'cancel' ? 'Cancelling…' : 'Cancel order'}
          </button>
        )}
        {status !== 'cancelled' && (
          <button onClick={invoice} disabled={!!busy} className="px-4 py-2 min-h-[44px] rounded-xl border border-border font-bold disabled:opacity-60">
            {busy === 'invoice' ? 'Preparing…' : 'Download invoice'}
          </button>
        )}
        {['delivered', 'cancelled'].includes(status) && items.length > 0 && (
          <button onClick={reorder} disabled={!!busy} className="px-4 py-2 min-h-[44px] rounded-xl bg-primary text-white font-bold disabled:opacity-60">
            {busy === 'reorder' ? 'Adding…' : 'Order again'}
          </button>
        )}
      </div>
      {notice && (
        <p role={notice.ok ? 'status' : 'alert'} data-testid="order-notice" className={`font-semibold ${notice.ok ? 'text-green-700' : 'text-red-600'}`}>{notice.text}</p>
      )}
    </div>
  );
}

/** C10: what a customer may give as the reason for a return (the server's list). */
const RETURN_REASONS = [
  ['damaged', 'Damaged'], ['wrong_item', 'Wrong item'], ['missing_items', 'Items missing'],
  ['spoiled_or_expired', 'Spoiled or expired'], ['quality_issue', 'Poor quality'],
  ['not_as_described', 'Not as described'], ['other', 'Something else'],
];
/** Where an accepted return's money is. */
function refundText(r) {
  const amount = `₹${Number(r.refund_amount)}`;
  if (r.refund_channel === 'wallet') return `${amount} refunded to your LocalSampark wallet.`;
  if (r.refund_channel === 'manual_payout') {
    return r.payout_status === 'paid'
      ? `${amount} sent${r.refund_upi ? ` to ${r.refund_upi}` : ''} (reference ${r.payout_reference}).`
      : `${amount} will be sent${r.refund_upi ? ` to ${r.refund_upi}` : ''}; our team will tell you when it is.`;
  }
  return r.refund_reference_id ? `${amount} refunded to your original payment method.` : `${amount} is being refunded to your original payment method.`;
}

const RETURN_STATUS = {
  pending_review: 'Waiting for the shop to decide',
  verified_approved: 'Accepted',
  rejected: 'Not accepted',
};

/**
 * C10: ask to return or replace a delivered order, with photos, and follow
 * the request. The server holds the window (48 hours for food, 7 days
 * otherwise) and refunds an accepted return to the wallet (cash, wallet) or
 * the original payment method (online).
 */
function ReturnRequest({ order }) {
  const [existing, setExisting] = useState(undefined);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ returnType: 'return', reasonCode: 'damaged', reason: '', refundUpi: '' });
  // A cash order's refund is paid to a UPI ID while the wallet is off (D10).
  const cash = String(order.payment_method || '').toLowerCase() === 'cod';
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    apiGet('/orders/returns/mine')
      .then((r) => setExisting(((r && r.data) || []).find((x) => String(x.order_id) === String(order.id)) || null))
      .catch(() => setExisting(null));
  }, [order.id]);
  useEffect(() => { load(); }, [load]);

  const upload = async (file) => {
    const body = new FormData();
    body.append('files', file);
    body.append('purpose', 'return_photo');
    body.append('referenceId', String(order.id));
    const headers = { ...getAuthHeaders() };
    delete headers['Content-Type'];
    const res = await fetch(`${API_BASE}/upload`, { method: 'POST', headers, body });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) throw new Error(data.error || 'A photo could not be uploaded.');
    return data.url;
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const evidenceUrls = [];
      for (const f of files.slice(0, 5)) evidenceUrls.push(await upload(f));
      await apiPost(`/orders/${order.id}/returns`, { ...form, reason: form.reason.trim() || undefined, refundUpi: form.refundUpi.trim() || undefined, evidenceUrls });
      setOpen(false);
      load();
    } catch (err) {
      setError(err.message || 'The request could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  if (existing === undefined) return null;
  if (existing) {
    const refunded = existing.status === 'verified_approved';
    return (
      <div className="glass-card rounded-2xl border border-border p-5" data-testid="return-status">
        <p className="font-bold text-text">Your {existing.return_type === 'replacement' ? 'replacement' : 'return'} request: {RETURN_STATUS[existing.status] || existing.status}</p>
        {refunded && (
          <p className="text-sm text-text-muted mt-1" data-testid="return-refund">{refundText(existing)}</p>
        )}
        {existing.status === 'rejected' && existing.rejection_reason && <p className="text-sm text-text-muted mt-1">Reason: {existing.rejection_reason}</p>}
      </div>
    );
  }
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="px-4 py-2 min-h-[44px] rounded-xl border border-border font-bold text-text">Return or replace an item</button>;
  }
  return (
    <form onSubmit={submit} aria-label="Return request" className="glass-card rounded-2xl border border-border p-5 space-y-3">
      <p className="font-bold text-text">Return or replace</p>
      <div className="flex gap-4" role="radiogroup" aria-label="What would you like?">
        {[['return', 'Refund'], ['replacement', 'Replacement']].map(([v, l]) => (
          <label key={v} className="flex items-center gap-2 min-h-[44px]">
            <input type="radio" name="returnType" value={v} checked={form.returnType === v} onChange={() => setForm({ ...form, returnType: v })} /> {l}
          </label>
        ))}
      </div>
      <label className="block">
        <span className="text-sm text-text-muted">What went wrong?</span>
        <select value={form.reasonCode} onChange={(e) => setForm({ ...form, reasonCode: e.target.value })} className="mt-1 w-full bg-background-alt text-text rounded-xl p-3 border border-border">
          {RETURN_REASONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="text-sm text-text-muted">Details{form.reasonCode === 'other' ? '' : ' (optional)'}</span>
        <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} maxLength={1000} rows={3}
          className="mt-1 w-full bg-background-alt text-text rounded-xl p-3 border border-border" />
      </label>
      {cash && (
        <label className="block">
          <span className="text-sm text-text-muted">Your UPI ID for the refund (optional)</span>
          <input value={form.refundUpi} onChange={(e) => setForm({ ...form, refundUpi: e.target.value })} placeholder="name@bank" inputMode="email"
            className="mt-1 w-full bg-background-alt text-text rounded-xl p-3 border border-border" />
        </label>
      )}
      <label className="block">
        <span className="text-sm text-text-muted">Photos (up to 5)</span>
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 5))} className="mt-1 block text-sm" />
      </label>
      {error && <p role="alert" className="text-red-600 text-sm font-semibold">{error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy} className="px-5 min-h-[44px] rounded-xl bg-primary text-white font-bold disabled:opacity-60">{busy ? 'Sending…' : 'Send request'}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 min-h-[44px] rounded-xl border border-border font-bold">Cancel</button>
      </div>
    </form>
  );
}

/**
 * C11: a delivered order can be reviewed. The review is of the shop, from a
 * verified purchase (the server checks the order is this customer's and
 * delivered); a second review replaces the first.
 */
function RateOrder({ order }) {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [state, setState] = useState(null);
  const submit = async (e) => {
    e.preventDefault();
    if (!rating) { setState({ ok: false, text: 'Choose a rating from 1 to 5 stars.' }); return; }
    try {
      await apiPost(`/shops/${order.shop_id}/orders/${order.id}/review`, { rating, review: text.trim() || undefined });
      setState({ ok: true, text: 'Thank you. Your review is published as a verified purchase.' });
    } catch (err) {
      setState({ ok: false, text: err.message || 'The review could not be saved.' });
    }
  };
  return (
    <form onSubmit={submit} className="glass-card rounded-2xl border border-border p-5 space-y-3" aria-labelledby="rate-heading">
      <p id="rate-heading" className="font-bold text-text">Rate {order.shop_name}</p>
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => setRating(n)} className={`text-2xl min-w-[44px] min-h-[44px] ${n <= rating ? 'text-amber-500' : 'text-border'}`}>★</button>
        ))}
      </div>
      <label className="block">
        <span className="text-sm text-text-muted">Your review (optional)</span>
        <textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} rows={3}
          className="mt-1 w-full bg-background-alt text-text rounded-xl p-3 border border-border focus:border-primary outline-none" />
      </label>
      <button type="submit" className="px-5 min-h-[44px] rounded-xl bg-primary text-white font-bold">Publish review</button>
      {state && <p role={state.ok ? 'status' : 'alert'} data-testid="review-notice" className={`text-sm font-semibold ${state.ok ? 'text-green-700' : 'text-red-600'}`}>{state.text}</p>}
    </form>
  );
}

function OrderDetail({ id }) {
  const [order, setOrder] = useState(null);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);
  const { joinOrderRoom, isConnected } = useSocket();

  const load = useCallback(() => {
    apiGet(`/orders/${id}`)
      .then((r) => { setOrder(r.order); setItems(r.items || []); setError(null); })
      .catch((e) => setError(e.status === 404 ? 'We could not find that order.' : (e.message || 'The order could not be loaded.')));
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { joinOrderRoom(id); }, [id, joinOrderRoom, isConnected]);

  // Both spellings are emitted by different server paths; either one means "re-read the order".
  useSocketEvent('ORDER_STATUS_UPDATED', (d) => { if (d && String(d.orderId) === String(id)) load(); });
  useSocketEvent('order_status_update', (d) => { if (d && String(d.orderId) === String(id)) load(); });
  useSocketEvent('ORDER_RIDER_ASSIGNED', (d) => { if (d && String(d.orderId) === String(id)) load(); });

  // Polling fallback (C9): with no live connection the page used to show the
  // status it was opened with until reloaded. Stops once the order is final.
  const finalStatus = order && ['delivered', 'cancelled', 'returned'].includes(order.status);
  useEffect(() => {
    if (isConnected || finalStatus) return undefined;
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [isConnected, finalStatus, load]);

  if (error) return <p role="alert" className="text-red-500 font-bold">{error}</p>;
  if (!order) return <p className="text-text-muted">Loading order…</p>;

  const cancelled = order.status === 'cancelled';
  const reached = RANK[order.status] ?? 0;

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl border border-border p-5">
        <p className="font-bold text-text">{order.shop_name}</p>
        <p className="text-xs text-text-muted">#{String(order.id).slice(0, 8)} • {when(order.created_at)}</p>
        <p className="mt-2 text-lg font-black text-text">₹{Number(order.total_amount) || 0}</p>
        {order.scheduled_for && (
          <p className="text-sm font-bold text-primary mt-1" data-testid="order-slot">
            {order.fulfillment_method === 'pickup' ? 'Collect' : 'Arrives'} {slotText(order.scheduled_for)}
          </p>
        )}
      </div>

      {cancelled ? (
        <p className="flex items-center gap-2 font-bold text-red-500"><XCircle className="w-5 h-5" /> This order was cancelled.</p>
      ) : (
        <ol className="space-y-4">
          {STEPS.map(({ key, label: text, Icon }, i) => (
            <li key={key} className={`flex items-center gap-3 ${i <= reached ? 'text-text' : 'text-text-muted opacity-60'}`}>
              <span className={`w-9 h-9 rounded-full flex items-center justify-center ${i <= reached ? 'bg-primary text-white' : 'bg-background-alt'}`}><Icon className="w-5 h-5" /></span>
              <span className="font-bold">{text}</span>
            </li>
          ))}
        </ol>
      )}

      {items.length > 0 && (
        <div className="glass-card rounded-2xl border border-border p-5">
          <p className="font-bold text-text mb-2">Items</p>
          <ul className="text-sm text-text-muted space-y-1">
            {items.map((it) => (
              <li key={it.id} className="flex justify-between"><span>{it.name || it.product_name || 'Item'} × {it.quantity}</span><span>₹{Number(it.price) || 0}</span></li>
            ))}
          </ul>
        </div>
      )}
      <OrderActions order={order} items={items} reload={load} />
      {String(order.status).toLowerCase() === 'delivered' && <RateOrder order={order} />}
      {String(order.status).toLowerCase() === 'delivered' && <ReturnRequest order={order} />}

      <div className="flex flex-wrap gap-4 items-center">
        <Link href="/order-tracking" className="text-primary font-bold text-sm">← All orders</Link>
        {/* C14: the in-app order help entry point; the ticket keeps this order. */}
        <Link href={`/support?order=${encodeURIComponent(order.id)}`} className="text-primary font-bold text-sm">Get help with this order</Link>
      </div>
    </div>
  );
}

function Inner() {
  const params = useSearchParams();
  const id = params.get('id') || params.get('order_id');
  return id ? <OrderDetail id={id} /> : <OrderList />;
}

export default function OrderTrackingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-3xl font-heading font-black text-text mb-6">My orders</h1>
          <Suspense fallback={<p className="text-text-muted">Loading…</p>}><Inner /></Suspense>
        </div>
      </main>
      <Footer />
    </div>
  );
}
