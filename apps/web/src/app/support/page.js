'use client';
/**
 * Customer help desk (C14).
 *
 * This page used to show three hard-coded tickets (TKT-1042 …) to everyone,
 * and its "Submit Ticket" button only switched tabs: nothing reached the
 * support queue. It now lists the signed-in customer's own tickets with the
 * support team's answers, and raises real tickets (optionally a formal
 * grievance, optionally about one of their orders).
 *
 * /support?order=<id> opens the form for that order: the "Get help" entry
 * point from an order.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import { LifeBuoy, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const CATEGORIES = [
  ['order', 'Order problem (missing, damaged, wrong item)'],
  ['delivery', 'Delivery'],
  ['payment', 'Payment'],
  ['refund', 'Refund'],
  ['quality', 'Product quality'],
  ['account', 'My account'],
  ['general', 'Something else'],
];
const OPEN = ['open', 'in_progress'];
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');

export default function SupportHelpdesk() {
  const { user, loading: authLoading } = useAuth() || {};
  const [tab, setTab] = useState('open');
  const [tickets, setTickets] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [form, setForm] = useState({ category: 'order', subject: '', description: '', orderId: '', isStatutory: false });
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async () => {
    try {
      const [mine, myOrders] = await Promise.all([
        apiGet('/support/tickets/my'),
        apiGet('/orders/my-orders').catch(() => ({ data: [] })),
      ]);
      setTickets(mine.tickets || []);
      setOrders(myOrders.data || []);
      setLoadError('');
    } catch (e) {
      setLoadError(e.message || 'Could not load your tickets');
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  // Order help entry point: /support?order=<id>
  useEffect(() => {
    try {
      const order = new URLSearchParams(window.location.search).get('order');
      if (order) {
        setForm((f) => ({ ...f, orderId: order, category: 'order' }));
        setTab('new');
      }
    } catch { /* no window during prerender */ }
  }, []);

  const shown = useMemo(
    () => (tickets || []).filter((t) => (tab === 'open' ? OPEN.includes(t.status) : !OPEN.includes(t.status))),
    [tickets, tab]
  );

  const submit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.description.trim()) {
      setNotice({ ok: false, text: 'Please add a subject and describe the problem.' });
      return;
    }
    setSending(true);
    setNotice(null);
    try {
      const res = await apiPost('/support/tickets', {
        category: form.category,
        subject: form.subject.trim(),
        description: form.description.trim(),
        isStatutory: form.isStatutory,
        ...(form.orderId ? { orderId: form.orderId } : {}),
      });
      setNotice({ ok: true, text: `Ticket ${String(res.ticket.id).slice(0, 8).toUpperCase()} registered. ${res.ticket.isStatutory ? 'Our Grievance Officer will respond within 30 days.' : 'We will reply here.'}` });
      setForm({ category: 'order', subject: '', description: '', orderId: '', isStatutory: false });
      setTab('open');
      await load();
    } catch (err) {
      setNotice({ ok: false, text: err.message || 'Could not register your ticket. Please try again.' });
    } finally {
      setSending(false);
    }
  };

  const signedOut = !authLoading && !user;

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />
      <main id="main-content" className="max-w-5xl mx-auto p-6 pt-24">
        <div className="flex flex-wrap gap-4 justify-between items-end mb-8">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <LifeBuoy className="text-blue-500" size={32} />
              Help &amp; support
            </h1>
            <p className="text-text-muted mt-2 font-medium">
              Problems with an order, a payment or your account. For a formal complaint, see the{' '}
              <Link href="/legal/grievance" className="text-primary font-bold hover:underline">Grievance Officer</Link>.
            </p>
          </div>
          {!signedOut && (
            <button onClick={() => setTab('new')} className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 min-h-[44px] rounded-xl flex items-center gap-2">
              <Plus size={20} /> Raise a ticket
            </button>
          )}
        </div>

        {signedOut && (
          <div className="bg-card-bg border border-border rounded-2xl p-8 text-center">
            <p className="font-bold mb-4">Sign in to raise a ticket or see your existing ones.</p>
            <Link href="/login?next=/support" className="inline-block bg-primary text-white font-bold px-6 py-3 rounded-xl">Sign in</Link>
          </div>
        )}

        {!signedOut && (
          <>
            <div role="tablist" className="flex gap-2 mb-6 bg-background p-1 rounded-xl w-fit border border-border">
              {[['open', 'Open'], ['resolved', 'Resolved'], ['new', 'New ticket']].map(([id, label]) => (
                <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                  className={`px-6 py-2 min-h-[44px] rounded-lg font-bold ${tab === id ? 'bg-card-bg text-text shadow-sm border border-border' : 'text-text-muted'}`}>
                  {label}
                </button>
              ))}
            </div>

            {notice && (
              <div role={notice.ok ? 'status' : 'alert'} data-testid="support-notice"
                className={`mb-6 rounded-xl p-4 font-semibold border ${notice.ok ? 'border-green-500 text-green-700' : 'border-red-500 text-red-600'}`}>
                {notice.text}
              </div>
            )}
            {loadError && <div role="alert" className="mb-6 text-red-600 font-semibold">{loadError}</div>}

            <div className="bg-background border border-border rounded-3xl p-6 min-h-[300px]">
              {tab === 'new' ? (
                <form onSubmit={submit} className="max-w-2xl mx-auto space-y-5" aria-label="Raise a support ticket">
                  <label className="block">
                    <span className="block text-sm font-bold text-text-muted mb-2">What is it about?</span>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3">
                      {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-bold text-text-muted mb-2">Order (optional)</span>
                    <select value={form.orderId} onChange={(e) => setForm({ ...form, orderId: e.target.value })}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3">
                      <option value="">Not about a specific order</option>
                      {form.orderId && !orders.some((o) => String(o.id) === String(form.orderId)) && (
                        <option value={form.orderId}>Order {String(form.orderId).slice(0, 8).toUpperCase()}</option>
                      )}
                      {orders.map((o) => (
                        <option key={o.id} value={o.id}>{o.shop_name} · {String(o.id).slice(0, 8).toUpperCase()} · {o.status}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-sm font-bold text-text-muted mb-2">Subject</span>
                    <input value={form.subject} maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      placeholder="A short summary" className="w-full bg-background border border-border rounded-xl px-4 py-3" />
                  </label>
                  <label className="block">
                    <span className="block text-sm font-bold text-text-muted mb-2">Details</span>
                    <textarea rows={5} value={form.description} maxLength={5000} onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What happened, and what would put it right?" className="w-full bg-background border border-border rounded-xl px-4 py-3" />
                  </label>
                  <label className="flex items-start gap-3 text-sm">
                    <input type="checkbox" checked={form.isStatutory} onChange={(e) => setForm({ ...form, isStatutory: e.target.checked })} className="mt-1 w-5 h-5" />
                    <span>Register this as a formal grievance under the Consumer Protection (E-Commerce) Rules, 2020. It goes to our Grievance Officer, who must resolve it within 30 days.</span>
                  </label>
                  <button type="submit" disabled={sending} className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold py-4 rounded-xl">
                    {sending ? 'Sending…' : 'Submit ticket'}
                  </button>
                </form>
              ) : tickets === null ? (
                <p className="text-text-muted">Loading your tickets…</p>
              ) : shown.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-text-muted">
                  <CheckCircle size={48} className="mb-4 opacity-50" />
                  <p className="font-bold">{tab === 'open' ? 'No open tickets.' : 'No resolved tickets yet.'}</p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {shown.map((t) => (
                    <li key={t.id} data-testid={`ticket-${t.id}`} className="border border-border rounded-2xl p-5">
                      <div className="flex flex-wrap items-center gap-3 mb-1">
                        <span className="font-mono text-xs font-bold text-text-muted">#{String(t.id).slice(0, 8).toUpperCase()}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card-bg">{t.category}</span>
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-card-bg" data-testid="ticket-status">{t.status.replace('_', ' ')}</span>
                        {t.isStatutory && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700">Formal grievance</span>}
                      </div>
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        {OPEN.includes(t.status) ? <AlertCircle size={18} className="text-amber-500" /> : <CheckCircle size={18} className="text-green-600" />}
                        {t.subject}
                      </h3>
                      <p className="text-sm text-text-muted mt-1 whitespace-pre-line">{t.description}</p>
                      <p className="text-xs text-text-muted mt-2">
                        Raised {when(t.createdAt)}{t.orderId ? ` · Order ${String(t.orderId).slice(0, 8).toUpperCase()}` : ''}
                        {OPEN.includes(t.status) && t.isStatutory ? ` · Resolution due by ${when(t.slaDueAt)}` : ''}
                      </p>
                      {t.resolution && (
                        <div data-testid="ticket-resolution" className="mt-3 rounded-xl bg-card-bg border border-border p-3 text-sm">
                          <strong>Support:</strong> {t.resolution}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
