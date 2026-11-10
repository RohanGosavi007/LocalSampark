'use client';
/**
 * Commerce Ops console (A1–A14).
 *
 * Every launch admin capability had an API under /admin/commerce but no screen
 * that used it, so none of it could be operated (or verified end to end) from
 * the console. Each section below is one feature; each talks only to the real
 * endpoints, shows the server's own error when a request is refused, and
 * renders an empty state rather than placeholder numbers.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { API_BASE, fetchJson, getAuthHeaders } from '../../lib/api';

const C = `${API_BASE}/admin/commerce`;
const json = (method, body) => ({ method, headers: getAuthHeaders(), body: body === undefined ? undefined : JSON.stringify(body) });
const get = (url) => fetchJson(url, { headers: getAuthHeaders() });
const inr = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const truthy = (v) => v === true || v === 1 || v === '1' || v === 'true';

const S = {
  card: { background: 'var(--surface-1)', border: '1px solid var(--line)', borderRadius: '0.75rem', padding: '1.25rem', marginBottom: '1.25rem' },
  h3: { margin: '0 0 0.9rem', fontSize: '1.05rem', fontWeight: 800 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' },
  th: { textAlign: 'left', padding: '0.5rem', borderBottom: '1px solid var(--line)', color: 'var(--ink-muted)', fontWeight: 700 },
  td: { padding: '0.5rem', borderBottom: '1px solid var(--line)', verticalAlign: 'top' },
  input: { padding: '0.5rem 0.7rem', borderRadius: '0.45rem', border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', fontSize: '0.88rem' },
  btn: { padding: '0.45rem 0.9rem', borderRadius: '0.45rem', border: 'none', background: 'var(--accent)', color: 'var(--on-accent, #fff)', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' },
  ghost: { padding: '0.45rem 0.9rem', borderRadius: '0.45rem', border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem' },
  danger: { padding: '0.45rem 0.9rem', borderRadius: '0.45rem', border: 'none', background: 'var(--danger)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.82rem' },
  row: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' },
  muted: { color: 'var(--ink-muted)', fontSize: '0.85rem' },
};

/** Loads a resource, exposing { data, error, reload }. */
function useResource(loader, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const reload = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      setState({ data: await loader(), error: null, loading: false });
    } catch (e) {
      setState({ data: null, error: e.message || 'Request failed', loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { ...state, reload };
}

/** Runs an action, surfacing success or the server's error. */
function useAction() {
  const [msg, setMsg] = useState(null);
  const run = async (fn, ok) => {
    try {
      const out = await fn();
      setMsg({ ok: true, text: typeof ok === 'function' ? ok(out) : ok || 'Done' });
      return out;
    } catch (e) {
      setMsg({ ok: false, text: e.message || 'Request failed' });
      return null;
    }
  };
  const view = msg ? (
    <div role={msg.ok ? 'status' : 'alert'} data-testid="ops-message" style={{ margin: '0.5rem 0', fontWeight: 600, color: msg.ok ? 'var(--success)' : 'var(--danger)' }}>
      {msg.text}
    </div>
  ) : null;
  return [run, view];
}

const Err = ({ error }) => (error ? <div role="alert" style={{ color: 'var(--danger)', fontWeight: 600 }}>{error}</div> : null);
const Empty = ({ children }) => <p style={S.muted}>{children}</p>;

/** Fetches a CSV with the admin session and hands it to the browser as a download. */
async function download(url, filename) {
  const res = await fetch(url, { headers: getAuthHeaders(), credentials: 'include' });
  if (!res.ok) {
    let message = `Export failed (HTTP ${res.status})`;
    try { message = (await res.json()).error || message; } catch { /* not JSON */ }
    throw new Error(message);
  }
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
  return filename;
}

// ── A1 ─────────────────────────────────────────────────────────────────────
function KpiSection() {
  const { data, error } = useResource(() => get(`${C}/kpis`).then((r) => r.data));
  const items = data ? [
    ['GMV', inr(data.gmv)], ['Orders', data.totalOrders], ['Delivered', data.completedOrders],
    ['In flight', data.inFlightOrders], ['AOV', inr(data.aov)], ['Cancellation rate', `${data.cancellationRate}%`],
    ['Return rate', `${data.returnRate}%`], ['Active shops', data.activeShops], ['Riders online', data.activeRiders],
    ['Customers', data.totalCustomers],
  ] : [];
  return (
    <section data-testid="ops-kpis" style={S.card}>
      <h3 style={S.h3}>Commerce KPIs</h3>
      <Err error={error} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
        {items.map(([label, value]) => (
          <div key={label} data-testid={`kpi-${label.toLowerCase().replace(/\s+/g, '-')}`} style={{ border: '1px solid var(--line)', borderRadius: '0.6rem', padding: '0.8rem' }}>
            <div style={S.muted}>{label}</div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800 }}>{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── A2 ─────────────────────────────────────────────────────────────────────
function SellersSection() {
  const kyc = useResource(() => get(`${API_BASE}/admin/kyc/pending`).then((r) => r.submissions || []));
  const shops = useResource(() => get(`${C}/shops`).then((r) => r.data));
  const [reasons, setReasons] = useState({});
  const [run, msg] = useAction();
  const docLinks = (k) => [['Aadhaar (front)', k.aadhaar_front_url], ['Aadhaar (back)', k.aadhaar_back_url], ['PAN', k.pan_url], ['FSSAI', k.fssai_url], ['Drug licence', k.drug_license_url]].filter(([, u]) => u);
  const review = (k, action) => run(
    () => fetchJson(`${API_BASE}/admin/kyc/${k.id}/review`, json('PUT', { action, rejection_reason: reasons[k.id] || undefined })).then(() => { kyc.reload(); shops.reload(); }),
    `KYC for ${k.shop_name}: ${action}`
  );
  const suspend = (s) => run(
    () => fetchJson(`${C}/shops/${s.id}/suspend`, json('PUT', { reason: reasons[s.id] })).then(() => shops.reload()),
    `${s.name} suspended`
  );
  const reinstate = (s) => run(
    () => fetchJson(`${C}/shops/${s.id}/status`, json('PUT', { approvalStatus: 'approved', isActive: true, reason: reasons[s.id] || 'Reinstated' })).then(() => shops.reload()),
    `${s.name} reinstated`
  );
  return (
    <section data-testid="ops-sellers" style={S.card}>
      <h3 style={S.h3}>Seller KYC queue</h3>
      {msg}
      <Err error={kyc.error} />
      {kyc.data && kyc.data.length === 0 && <Empty>No KYC submissions are waiting.</Empty>}
      {kyc.data && kyc.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Owner</th><th style={S.th}>Documents</th><th style={S.th}>Status</th><th style={S.th}>Decision</th></tr></thead>
          <tbody>
            {kyc.data.map((k) => (
              <tr key={k.id} data-testid={`kyc-row-${k.id}`}>
                <td style={S.td}>{k.shop_name}<div style={S.muted}>{k.category}</div></td>
                <td style={S.td}>{k.owner_name}<div style={S.muted}>{k.owner_phone}</div></td>
                <td style={S.td}>
                  {docLinks(k).length === 0 ? <span style={S.muted}>None uploaded</span> : docLinks(k).map(([label, url]) => (
                    <div key={label}><a href={url} target="_blank" rel="noopener noreferrer">{label}</a></div>
                  ))}
                  {k.gst_number && <div style={S.muted}>GSTIN {k.gst_number}</div>}
                </td>
                <td style={S.td}>{k.kyc_status}{k.rejection_reason && <div style={S.muted}>{k.rejection_reason}</div>}</td>
                <td style={S.td}>
                  <input aria-label={`Reason for ${k.shop_name}`} placeholder="Reason (needed to reject or ask again)" style={{ ...S.input, width: '100%', marginBottom: '0.4rem' }}
                    value={reasons[k.id] || ''} onChange={(e) => setReasons({ ...reasons, [k.id]: e.target.value })} />
                  <div style={S.row}>
                    <button style={S.btn} onClick={() => review(k, 'verified')}>Approve</button>
                    <button style={S.ghost} onClick={() => review(k, 'resubmission')}>Request resubmission</button>
                    <button style={S.danger} onClick={() => review(k, 'rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>Shops</h3>
      <Err error={shops.error} />
      {shops.data && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Approval</th><th style={S.th}>Active</th><th style={S.th}>Kill switch</th></tr></thead>
          <tbody>
            {shops.data.map((s) => (
              <tr key={s.id} data-testid={`shop-row-${s.id}`}>
                <td style={S.td}>{s.name}<div style={S.muted}>{s.address}</div></td>
                <td style={S.td}>{s.approval_status || '—'}</td>
                <td style={S.td}>{truthy(s.is_active) ? 'Yes' : 'No'}</td>
                <td style={S.td}>
                  <div style={S.row}>
                    <input aria-label={`Suspension reason for ${s.name}`} placeholder="Reason" style={S.input}
                      value={reasons[s.id] || ''} onChange={(e) => setReasons({ ...reasons, [s.id]: e.target.value })} />
                    {s.approval_status === 'suspended'
                      ? <button style={S.ghost} onClick={() => reinstate(s)}>Reinstate</button>
                      : <button style={S.danger} onClick={() => suspend(s)}>Suspend</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A3 ─────────────────────────────────────────────────────────────────────
function CatalogSection() {
  const cats = useResource(() => get(`${C}/categories`).then((r) => r.data));
  const products = useResource(() => get(`${C}/products/moderation`).then((r) => r.data));
  const [form, setForm] = useState({ name: '', slug: '', icon: '' });
  const [onlyRestricted, setOnlyRestricted] = useState(true);
  const [run, msg] = useAction();
  const create = (e) => {
    e.preventDefault();
    run(() => fetchJson(`${C}/categories`, json('POST', form)).then(() => { setForm({ name: '', slug: '', icon: '' }); cats.reload(); }), `Category ${form.name} created`);
  };
  const moderate = (p, action) => run(() => fetchJson(`${C}/products/${p.id}/moderation`, json('PUT', { action, reason: p.restrictedKeyword ? `Restricted goods: ${p.restrictedKeyword}` : 'Moderated' })).then(() => products.reload()), `${p.name}: ${action}`);
  const shown = (products.data || []).filter((p) => !onlyRestricted || p.isRestricted);
  return (
    <section data-testid="ops-catalog" style={S.card}>
      <h3 style={S.h3}>Category taxonomy</h3>
      {msg}
      <form onSubmit={create} style={{ ...S.row, marginBottom: '0.8rem' }}>
        <input aria-label="Category name" placeholder="Name" style={S.input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input aria-label="Category slug" placeholder="slug" style={S.input} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input aria-label="Category icon" placeholder="Icon" style={{ ...S.input, width: '5rem' }} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        <button type="submit" style={S.btn}>Add category</button>
      </form>
      <Err error={cats.error} />
      {cats.data && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Category</th><th style={S.th}>Slug</th><th style={S.th}>Active</th><th style={S.th} /></tr></thead>
          <tbody>
            {cats.data.map((c) => (
              <tr key={c.id} data-testid={`category-row-${c.slug}`}>
                <td style={S.td}>{c.icon} {c.name}</td>
                <td style={S.td}>{c.slug}</td>
                <td style={S.td}>{truthy(c.is_active) ? 'Yes' : 'No'}</td>
                <td style={S.td}>{truthy(c.is_active) && <button style={S.ghost} onClick={() => run(() => fetchJson(`${C}/categories/${c.id}`, json('DELETE')).then(() => cats.reload()), `${c.name} deactivated`)}>Deactivate</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>Product moderation</h3>
      <label style={{ ...S.row, marginBottom: '0.6rem' }}>
        <input type="checkbox" checked={onlyRestricted} onChange={(e) => setOnlyRestricted(e.target.checked)} /> Only restricted goods
      </label>
      <Err error={products.error} />
      {products.data && shown.length === 0 && <Empty>Nothing to moderate.</Empty>}
      {shown.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Product</th><th style={S.th}>Shop</th><th style={S.th}>Flag</th><th style={S.th}>Listed</th><th style={S.th}>Action</th></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} data-testid={`moderation-row-${p.id}`}>
                <td style={S.td}>{p.name}<div style={S.muted}>{inr(p.price)}</div></td>
                <td style={S.td}>{p.shop_name}</td>
                <td style={S.td}>{p.isRestricted ? <strong style={{ color: 'var(--danger)' }}>Restricted: {p.restrictedKeyword}</strong> : '—'}</td>
                <td style={S.td}>{truthy(p.is_active) ? 'Live' : 'Hidden'}</td>
                <td style={S.td}><div style={S.row}>
                  <button style={S.ghost} onClick={() => moderate(p, 'approve')}>Approve</button>
                  <button style={S.danger} onClick={() => moderate(p, 'reject')}>Block</button>
                </div></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A4 ─────────────────────────────────────────────────────────────────────
function OrdersSection() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState({ q: '', status: '' });
  const orders = useResource(() => get(`${C}/orders?q=${encodeURIComponent(query.q)}&status=${encodeURIComponent(query.status)}`).then((r) => r.data), [query]);
  const sla = useResource(() => get(`${C}/orders/sla-breaches`).then((r) => r.data));
  const fleet = useResource(() => get(`${C}/fleet/live`).then((r) => r.data));
  const [open, setOpen] = useState(null);
  const [detail, setDetail] = useState(null);
  const [form, setForm] = useState({ reason: '', amount: '', rider: '' });
  const [run, msg] = useAction();

  const show = async (id) => {
    setOpen(id);
    setDetail(null);
    try { setDetail((await get(`${C}/orders/${id}/timeline`)).data); } catch (e) { setDetail({ error: e.message }); }
  };
  const after = () => { orders.reload(); sla.reload(); if (open) show(open); };

  return (
    <section data-testid="ops-orders" style={S.card}>
      <h3 style={S.h3}>Order search</h3>
      {msg}
      <form onSubmit={(e) => { e.preventDefault(); setQuery({ q, status }); }} style={{ ...S.row, marginBottom: '0.8rem' }}>
        <input aria-label="Search orders" placeholder="Order ID, customer, phone or shop" style={{ ...S.input, minWidth: '18rem' }} value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Order status" style={S.input} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Any status</option>
          {['placed', 'confirmed', 'preparing', 'ready', 'assigned', 'picked_up', 'delivered', 'cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="submit" style={S.btn}>Search</button>
      </form>
      <Err error={orders.error} />
      {orders.data && orders.data.length === 0 && <Empty>No orders match.</Empty>}
      {orders.data && orders.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Order</th><th style={S.th}>Customer</th><th style={S.th}>Shop</th><th style={S.th}>Total</th><th style={S.th}>Status</th><th style={S.th}>Placed</th></tr></thead>
          <tbody>
            {orders.data.map((o) => (
              <tr key={o.id} data-testid={`order-row-${o.id}`} style={{ cursor: 'pointer', background: open === o.id ? 'var(--surface-2, var(--ground))' : undefined }} onClick={() => show(o.id)}>
                <td style={S.td}><button style={{ ...S.ghost, padding: '0.2rem 0.5rem' }}>{String(o.id).slice(0, 8)}</button></td>
                <td style={S.td}>{o.customer_name || '—'}</td>
                <td style={S.td}>{o.shop_name || '—'}</td>
                <td style={S.td}>{inr(o.total_amount)}<div style={S.muted}>{o.payment_method} · {o.payment_status}</div></td>
                <td style={S.td}>{o.order_status}</td>
                <td style={S.td}>{when(o.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <div data-testid="order-detail" style={{ ...S.card, marginTop: '1rem', background: 'var(--ground)' }}>
          {!detail && <Empty>Loading order…</Empty>}
          {detail && detail.error && <Err error={detail.error} />}
          {detail && detail.order && (
            <>
              <h3 style={S.h3}>Order {String(detail.order.id).slice(0, 8)} · {detail.order.order_status}</h3>
              <p style={S.muted}>
                {detail.order.customer_name} ({detail.order.customer_phone}) · {detail.order.shop_name} · {inr(detail.order.total_amount)}
                {detail.order.rider_name ? ` · Rider ${detail.order.rider_name} (${detail.order.rider_phone})` : ' · No rider assigned'}
              </p>
              <ol data-testid="order-timeline" style={{ paddingLeft: '1.2rem' }}>
                {detail.timeline.map((t, i) => (
                  <li key={i} data-source={t.source}><strong>{t.status}</strong> — {t.detail} <span style={S.muted}>{when(t.timestamp)}</span></li>
                ))}
              </ol>
              <div style={{ ...S.row, marginTop: '0.8rem' }}>
                <input aria-label="Intervention reason" placeholder="Reason (required)" style={{ ...S.input, minWidth: '16rem' }} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                <input aria-label="Refund amount" placeholder="Refund ₹ (blank = all remaining)" style={S.input} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                <button style={S.ghost} onClick={() => run(() => fetchJson(`${C}/orders/${open}/refund`, json('POST', { amount: form.amount ? Number(form.amount) : undefined, reason: form.reason })).then((r) => { after(); return r; }), (r) => r.message)}>Refund to wallet</button>
                <button style={S.danger} onClick={() => run(() => fetchJson(`${C}/orders/${open}/cancel`, json('POST', { reason: form.reason })).then(after), 'Order cancelled')}>Force cancel</button>
              </div>
              <div style={{ ...S.row, marginTop: '0.6rem' }}>
                <select aria-label="Reassign to rider" style={S.input} value={form.rider} onChange={(e) => setForm({ ...form, rider: e.target.value })}>
                  <option value="">Return to ready queue</option>
                  {(fleet.data || []).filter((r) => truthy(r.is_online)).map((r) => <option key={r.user_id} value={r.user_id}>{r.full_name} ({r.status})</option>)}
                </select>
                <button style={S.ghost} onClick={() => run(() => fetchJson(`${C}/orders/${open}/reassign`, json('POST', { riderUserId: form.rider || null })).then(after), (r) => (r && r.message) || 'Reassigned')}>Reassign</button>
              </div>
            </>
          )}
        </div>
      )}

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>SLA breaches (open &gt; 30 min)</h3>
      <Err error={sla.error} />
      {sla.data && sla.data.length === 0 && <Empty>No orders are past their SLA.</Empty>}
      {sla.data && sla.data.length > 0 && (
        <ul data-testid="sla-breaches">
          {sla.data.map((o) => <li key={o.id}>{String(o.id).slice(0, 8)} · {o.shop_name} · {o.order_status} since {when(o.created_at)}</li>)}
        </ul>
      )}
    </section>
  );
}

// ── A5 ─────────────────────────────────────────────────────────────────────
function DisputesSection() {
  const disputes = useResource(() => get(`${C}/disputes?status=open`).then((r) => r.data));
  const returns = useResource(() => get(`${API_BASE}/orders/returns/pending-review`).then((r) => r.data));
  const [form, setForm] = useState({});
  const [notes, setNotes] = useState({});
  const [run, msg] = useAction();
  const resolve = (d, resolution) => run(
    () => fetchJson(`${C}/disputes/${d.id}/resolve`, json('PUT', { resolution, refundAmount: Number((form[d.id] || {}).amount) || 0 })).then(() => disputes.reload()),
    resolution === 'refund_customer' ? 'Dispute resolved with a refund' : 'Dispute resolved'
  );
  return (
    <section data-testid="ops-disputes" style={S.card}>
      <h3 style={S.h3}>Dispute queue</h3>
      {msg}
      <Err error={disputes.error} />
      {disputes.data && disputes.data.length === 0 && <Empty>No open disputes.</Empty>}
      {disputes.data && disputes.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Customer</th><th style={S.th}>Shop</th><th style={S.th}>Complaint</th><th style={S.th}>Resolution</th></tr></thead>
          <tbody>
            {disputes.data.map((d) => (
              <tr key={d.id} data-testid={`dispute-row-${d.id}`}>
                <td style={S.td}>{d.customer_name || '—'}<div style={S.muted}>Order {String(d.order_id || '').slice(0, 8)}</div></td>
                <td style={S.td}>{d.shop_name || '—'}</td>
                <td style={S.td}><strong>{d.type}</strong><div>{d.description}</div></td>
                <td style={S.td}>
                  <div style={S.row}>
                    <input aria-label={`Refund amount for dispute ${d.id}`} placeholder="Refund ₹" style={{ ...S.input, width: '7rem' }}
                      value={(form[d.id] || {}).amount || ''} onChange={(e) => setForm({ ...form, [d.id]: { amount: e.target.value } })} />
                    <button style={S.btn} onClick={() => resolve(d, 'refund_customer')}>Refund customer</button>
                    <button style={S.ghost} onClick={() => resolve(d, 'reject')}>Reject claim</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>Returns awaiting review</h3>
      <Err error={returns.error} />
      {returns.data && returns.data.length === 0 && <Empty>No returns are waiting for review.</Empty>}
      {returns.data && returns.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Order</th><th style={S.th}>Customer</th><th style={S.th}>Reason &amp; evidence</th><th style={S.th}>Refund</th><th style={S.th}>Decision</th></tr></thead>
          <tbody>
            {returns.data.map((r) => (
              <tr key={r.id} data-testid={`return-row-${r.id}`}>
                <td style={S.td}>{String(r.order_id).slice(0, 8)}<div style={S.muted}>{r.shop_name}</div></td>
                <td style={S.td}>{r.customer_name}<div style={S.muted}>{r.customer_phone}</div></td>
                <td style={S.td}>
                  <strong>{r.return_type}</strong>: {r.reason}
                  <div>{(r.evidence_urls || []).map((u, i) => <a key={u} href={u} target="_blank" rel="noopener noreferrer" style={{ marginRight: '0.5rem' }}>Photo {i + 1}</a>)}</div>
                </td>
                <td style={S.td}>{inr(r.refund_amount)}<div style={S.muted}>{r.payment_method}</div></td>
                <td style={S.td}>
                  <input aria-label={`Return decision note for ${r.id}`} placeholder="Reason (required to reject)" style={{ ...S.input, width: '100%', marginBottom: '0.4rem' }}
                    value={notes[r.id] || ''} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
                  <div style={S.row}>
                    <button style={S.btn} onClick={() => run(() => fetchJson(`${API_BASE}/orders/returns/${r.id}/verify`, json('PUT', { action: 'approve', notes: notes[r.id] || '' })).then(() => returns.reload()), 'Return approved and refunded')}>Approve refund</button>
                    <button style={S.danger} onClick={() => run(() => fetchJson(`${API_BASE}/orders/returns/${r.id}/verify`, json('PUT', { action: 'reject', rejectionReason: notes[r.id] || '' })).then(() => returns.reload()), 'Return rejected')}>Reject</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A6 ─────────────────────────────────────────────────────────────────────
function PayoutsSection() {
  const commission = useResource(() => get(`${C}/commission`));
  const payouts = useResource(() => get(`${C}/payouts`).then((r) => r.data));
  const cash = useResource(() => get(`${C}/fleet/cash-summary`).then((r) => r.data));
  const [rate, setRate] = useState('');
  const [period, setPeriod] = useState({ start: '', end: '' });
  const [run, msg] = useAction();
  return (
    <section data-testid="ops-payouts" style={S.card}>
      <h3 style={S.h3}>Commission</h3>
      {msg}
      <Err error={commission.error} />
      {commission.data && <p data-testid="default-commission">Default platform commission: <strong>{commission.data.defaultCommissionPercent}%</strong></p>}
      <div style={S.row}>
        <input aria-label="Default commission percent" placeholder="0–50" style={{ ...S.input, width: '6rem' }} value={rate} onChange={(e) => setRate(e.target.value)} />
        <button style={S.btn} onClick={() => run(() => fetchJson(`${C}/commission`, json('PUT', { defaultCommissionPercent: Number(rate) })).then(() => commission.reload()), 'Commission updated')}>Save commission</button>
      </div>

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>Seller payout batches</h3>
      <div style={{ ...S.row, marginBottom: '0.6rem' }}>
        <input aria-label="Payout period start" type="date" style={S.input} value={period.start} onChange={(e) => setPeriod({ ...period, start: e.target.value })} />
        <input aria-label="Payout period end" type="date" style={S.input} value={period.end} onChange={(e) => setPeriod({ ...period, end: e.target.value })} />
        <button style={S.ghost} onClick={() => run(() => fetchJson(`${API_BASE}/admin/payouts/calculate`, json('POST', { period_start: period.start, period_end: period.end })).then((r) => { payouts.reload(); return r; }), (r) => (r && r.message) || 'Calculated')}>Calculate payouts</button>
      </div>
      <Err error={payouts.error} />
      {payouts.data && payouts.data.length === 0 && <Empty>No payout batches yet.</Empty>}
      {payouts.data && payouts.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Shop</th><th style={S.th}>Period</th><th style={S.th}>GMV</th><th style={S.th}>Commission</th><th style={S.th}>Net payout</th><th style={S.th}>Status</th><th style={S.th} /></tr></thead>
          <tbody>
            {payouts.data.map((p) => (
              <tr key={p.id} data-testid={`payout-row-${p.id}`}>
                <td style={S.td}>{p.shop_name}</td>
                <td style={S.td}>{p.period_start} → {p.period_end}</td>
                <td style={S.td}>{inr(p.gross_gmv)}</td>
                <td style={S.td}>{inr(p.platform_commission)} ({p.commission_rate}%)</td>
                <td style={S.td}>{inr(p.net_payout)}</td>
                <td style={S.td}>{p.payout_status}</td>
                <td style={S.td}>{String(p.payout_status) === 'calculated' && (
                  <button style={S.ghost} onClick={() => run(() => fetchJson(`${API_BASE}/admin/payouts/${p.id}/approve`, json('PUT')).then(() => payouts.reload()), 'Payout approved')}>Approve</button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>COD settlement</h3>
      <Err error={cash.error} />
      {cash.data && (
        <p data-testid="cod-settlement">
          Cash held by riders: <strong>{inr(cash.data.totalCashHeld)}</strong> across {cash.data.totalAgents} riders;
          {' '}{cash.data.ridersOverLimit} at or over the {inr(cash.data.floatingLimitThreshold)} limit.
        </p>
      )}
    </section>
  );
}

// ── A7 ─────────────────────────────────────────────────────────────────────
function PromotionsSection() {
  const coupons = useResource(() => get(`${C}/coupons`).then((r) => r.data));
  const banners = useResource(() => get(`${C}/banners`).then((r) => r.data));
  const [cp, setCp] = useState({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscountAmount: '', usageLimit: '' });
  const [bn, setBn] = useState({ title: '', imageUrl: '', actionUrl: '', priority: '' });
  const [run, msg] = useAction();
  return (
    <section data-testid="ops-promotions" style={S.card}>
      <h3 style={S.h3}>Platform coupons</h3>
      {msg}
      <form style={{ ...S.row, marginBottom: '0.8rem' }} onSubmit={(e) => { e.preventDefault(); run(() => fetchJson(`${C}/coupons`, json('POST', cp)).then(() => coupons.reload()), `Coupon ${cp.code.toUpperCase()} created`); }}>
        <input aria-label="Coupon code" placeholder="CODE" style={{ ...S.input, width: '8rem' }} value={cp.code} onChange={(e) => setCp({ ...cp, code: e.target.value })} />
        <select aria-label="Discount type" style={S.input} value={cp.discountType} onChange={(e) => setCp({ ...cp, discountType: e.target.value })}>
          <option value="percentage">% off</option><option value="flat">₹ off</option>
        </select>
        <input aria-label="Discount value" placeholder="Value" style={{ ...S.input, width: '5rem' }} value={cp.discountValue} onChange={(e) => setCp({ ...cp, discountValue: e.target.value })} />
        <input aria-label="Minimum order" placeholder="Min order ₹" style={{ ...S.input, width: '7rem' }} value={cp.minOrderAmount} onChange={(e) => setCp({ ...cp, minOrderAmount: e.target.value })} />
        <input aria-label="Maximum discount" placeholder="Max discount ₹" style={{ ...S.input, width: '8rem' }} value={cp.maxDiscountAmount} onChange={(e) => setCp({ ...cp, maxDiscountAmount: e.target.value })} />
        <input aria-label="Usage budget" placeholder="Uses budget" style={{ ...S.input, width: '7rem' }} value={cp.usageLimit} onChange={(e) => setCp({ ...cp, usageLimit: e.target.value })} />
        <button type="submit" style={S.btn}>Create coupon</button>
      </form>
      <Err error={coupons.error} />
      {coupons.data && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Code</th><th style={S.th}>Discount</th><th style={S.th}>Min order</th><th style={S.th}>Used / budget</th><th style={S.th}>Scope</th></tr></thead>
          <tbody>
            {coupons.data.map((c) => (
              <tr key={c.id} data-testid={`coupon-row-${c.code}`}>
                <td style={S.td}><strong>{c.code}</strong></td>
                <td style={S.td}>{c.discount_type === 'percentage' ? `${c.discount_value}%` : inr(c.discount_value)}{c.max_discount_amount ? ` (max ${inr(c.max_discount_amount)})` : ''}</td>
                <td style={S.td}>{inr(c.min_order_amount)}</td>
                <td style={S.td}>{c.current_uses || 0} / {c.max_uses || '∞'}</td>
                <td style={S.td}>{c.shop_id ? 'Shop' : 'Platform'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>Homepage banners</h3>
      <form style={{ ...S.row, marginBottom: '0.8rem' }} onSubmit={(e) => { e.preventDefault(); run(() => fetchJson(`${C}/banners`, json('POST', bn)).then(() => banners.reload()), `Banner ${bn.title} published`); }}>
        <input aria-label="Banner title" placeholder="Title" style={S.input} value={bn.title} onChange={(e) => setBn({ ...bn, title: e.target.value })} />
        <input aria-label="Banner image URL" placeholder="https://…/image.jpg" style={S.input} value={bn.imageUrl} onChange={(e) => setBn({ ...bn, imageUrl: e.target.value })} />
        <input aria-label="Banner target URL" placeholder="/shops?category=…" style={S.input} value={bn.actionUrl} onChange={(e) => setBn({ ...bn, actionUrl: e.target.value })} />
        <input aria-label="Banner priority" placeholder="Priority" style={{ ...S.input, width: '5rem' }} value={bn.priority} onChange={(e) => setBn({ ...bn, priority: e.target.value })} />
        <button type="submit" style={S.btn}>Publish banner</button>
      </form>
      <Err error={banners.error} />
      {banners.data && banners.data.length === 0 && <Empty>No banners.</Empty>}
      {banners.data && banners.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Title</th><th style={S.th}>Target</th><th style={S.th}>Priority</th><th style={S.th} /></tr></thead>
          <tbody>
            {banners.data.map((b) => (
              <tr key={b.id} data-testid={`banner-row-${b.id}`}>
                <td style={S.td}>{b.title}</td>
                <td style={S.td}>{b.action_url || '—'}</td>
                <td style={S.td}>{b.priority}</td>
                <td style={S.td}><button style={S.ghost} onClick={() => run(() => fetchJson(`${C}/banners/${b.id}`, json('DELETE')).then(() => banners.reload()), `Banner ${b.title} removed`)}>Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A8 ─────────────────────────────────────────────────────────────────────
function AuditSection() {
  const logs = useResource(() => get(`${C}/audit-logs?limit=100`).then((r) => r.data));
  return (
    <section data-testid="ops-audit" style={S.card}>
      <div style={{ ...S.row, justifyContent: 'space-between' }}>
        <h3 style={S.h3}>Admin audit log</h3>
        <button style={S.ghost} onClick={logs.reload}>Refresh</button>
      </div>
      <p style={S.muted}>Append-only. Every console action is recorded with the admin, IP address, time and the change made.</p>
      <Err error={logs.error} />
      {logs.data && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>When</th><th style={S.th}>Admin</th><th style={S.th}>Action</th><th style={S.th}>Target</th><th style={S.th}>IP</th><th style={S.th}>Details</th></tr></thead>
          <tbody>
            {logs.data.map((l) => (
              <tr key={l.id} data-testid="audit-row" data-action={l.action}>
                <td style={S.td}>{when(l.created_at)}</td>
                <td style={S.td}>{l.admin_name || String(l.admin_id || '').slice(0, 8)}</td>
                <td style={S.td}>{l.action}</td>
                <td style={S.td}>{l.target_type}{l.target_id ? ` ${String(l.target_id).slice(0, 8)}` : ''}</td>
                <td style={S.td}>{l.ip_address}</td>
                <td style={{ ...S.td, maxWidth: '28rem', wordBreak: 'break-word' }}><code style={{ fontSize: '0.75rem' }}>{typeof l.details === 'string' ? l.details : JSON.stringify(l.details)}</code></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A9 ─────────────────────────────────────────────────────────────────────
function ZonesSection() {
  const zones = useResource(() => get(`${C}/zones`).then((r) => r.data));
  const waitlist = useResource(() => get(`${C}/zones/waitlist`).then((r) => r.data));
  const [run, msg] = useAction();
  return (
    <section data-testid="ops-zones" style={S.card}>
      <h3 style={S.h3}>Serviceability zones</h3>
      <p style={S.muted}>Zone polygons are drawn in Territory Control; this switches a zone on or off for ordering.</p>
      {msg}
      <Err error={zones.error} />
      {zones.data && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Zone</th><th style={S.th}>Pincode</th><th style={S.th}>Radius</th><th style={S.th}>Status</th><th style={S.th} /></tr></thead>
          <tbody>
            {zones.data.map((z) => (
              <tr key={z.id} data-testid={`zone-row-${z.name}`}>
                <td style={S.td}>{z.name}<div style={S.muted}>{[z.city, z.district].filter(Boolean).join(', ')}</div></td>
                <td style={S.td}>{z.pincode || '—'}</td>
                <td style={S.td}>{z.radius_km ? `${z.radius_km} km` : '—'}</td>
                <td style={S.td}>{truthy(z.is_active) ? 'Active' : 'Inactive'}</td>
                <td style={S.td}>
                  <button style={truthy(z.is_active) ? S.danger : S.btn}
                    onClick={() => run(() => fetchJson(`${C}/zones/${z.id}/toggle`, json('PUT', { isActive: !truthy(z.is_active) })).then(() => zones.reload()), `${z.name} ${truthy(z.is_active) ? 'deactivated' : 'activated'}`)}>
                    {truthy(z.is_active) ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div style={{ ...S.row, justifyContent: 'space-between', marginTop: '1.5rem' }}>
        <h3 style={S.h3}>Unserviceable waitlist</h3>
        <button style={S.ghost} onClick={() => run(() => download(`${C}/zones/waitlist?format=csv`, 'unserviceable_waitlist.csv'), 'Waitlist exported')}>Export CSV</button>
      </div>
      <Err error={waitlist.error} />
      {waitlist.data && waitlist.data.length === 0 && <Empty>Nobody is waiting.</Empty>}
      {waitlist.data && waitlist.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>When</th><th style={S.th}>Pincode</th><th style={S.th}>Contact</th><th style={S.th}>Address</th></tr></thead>
          <tbody>
            {waitlist.data.map((w) => (
              <tr key={w.id} data-testid="waitlist-row">
                <td style={S.td}>{when(w.created_at)}</td>
                <td style={S.td}>{w.pincode || '—'}</td>
                <td style={S.td}>{w.phone_number || w.email || '—'}</td>
                <td style={S.td}>{w.address || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A10 ────────────────────────────────────────────────────────────────────
function FleetSection() {
  const fleet = useResource(() => get(`${C}/fleet/live`).then((r) => r.data));
  const cash = useResource(() => get(`${API_BASE}/admin/delivery/cash`));
  const [amounts, setAmounts] = useState({});
  const [ledger, setLedger] = useState(null);
  const [run, msg] = useAction();
  const openLedger = async (r) => {
    try { setLedger(await get(`${API_BASE}/admin/delivery/agents/${r.userId}/cash`)); } catch (e) { setLedger({ error: e.message }); }
  };
  return (
    <section data-testid="ops-fleet" style={S.card}>
      <h3 style={S.h3}>Rider fleet</h3>
      {msg}
      <Err error={fleet.error} />
      {fleet.data && fleet.data.length === 0 && <Empty>No riders registered.</Empty>}
      {fleet.data && fleet.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Rider</th><th style={S.th}>Vehicle</th><th style={S.th}>Online</th><th style={S.th}>Status</th><th style={S.th}>Last position</th><th style={S.th}>Cash held</th></tr></thead>
          <tbody>
            {fleet.data.map((r) => (
              <tr key={r.id} data-testid={`fleet-row-${r.user_id}`}>
                <td style={S.td}>{r.full_name}<div style={S.muted}>{r.phone_number}</div></td>
                <td style={S.td}>{r.vehicle_type} {r.vehicle_number}</td>
                <td style={S.td}>{truthy(r.is_online) ? 'Online' : 'Offline'}</td>
                <td style={S.td}>{r.status}</td>
                <td style={S.td}>{r.current_lat != null ? `${Number(r.current_lat).toFixed(4)}, ${Number(r.current_lng).toFixed(4)}` : '—'}<div style={S.muted}>{when(r.updated_at)}</div></td>
                <td style={S.td}>{inr(r.cash_in_hand)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>COD cash reconciliation</h3>
      <Err error={cash.error} />
      {cash.data && (
        <>
          <p data-testid="cash-outstanding">Outstanding: <strong>{inr(cash.data.totalOutstanding)}</strong> · limit {inr(cash.data.limit)}</p>
          {cash.data.riders.length === 0 && <Empty>No rider is holding cash.</Empty>}
          {cash.data.riders.length > 0 && (
            <table style={S.table}>
              <thead><tr><th style={S.th}>Rider</th><th style={S.th}>Holding</th><th style={S.th}>Record deposit</th><th style={S.th} /></tr></thead>
              <tbody>
                {cash.data.riders.map((r) => (
                  <tr key={r.id} data-testid={`cash-row-${r.userId}`}>
                    <td style={S.td}>{r.name}{r.overLimit && <strong style={{ color: 'var(--danger)', marginLeft: '0.4rem' }}>Over limit</strong>}</td>
                    <td style={S.td}>{inr(r.cashInHand)}</td>
                    <td style={S.td}><div style={S.row}>
                      <input aria-label={`Deposit amount for ${r.name}`} placeholder="₹" style={{ ...S.input, width: '6rem' }} value={amounts[r.id] || ''} onChange={(e) => setAmounts({ ...amounts, [r.id]: e.target.value })} />
                      <button style={S.btn} onClick={() => run(() => fetchJson(`${API_BASE}/admin/delivery/agents/${r.id}/cash-deposit`, json('POST', { amount: Number(amounts[r.id]), note: 'Deposited at counter' })).then(() => { cash.reload(); fleet.reload(); if (ledger) openLedger(r); }), `Deposit recorded for ${r.name}`)}>Record deposit</button>
                    </div></td>
                    <td style={S.td}><button style={S.ghost} onClick={() => openLedger(r)}>Ledger</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
      {ledger && (
        <div data-testid="cash-ledger" style={{ marginTop: '0.8rem' }}>
          <Err error={ledger.error} />
          {ledger.rider && (
            <>
              <strong>{ledger.rider.name}: {inr(ledger.rider.cashInHand)} held</strong>
              <ul>{ledger.ledger.map((e) => <li key={e.id}>{when(e.created_at)} · {e.entry_type} · {inr(e.amount)}{e.order_id ? ` · order ${String(e.order_id).slice(0, 8)}` : ''}{e.note ? ` · ${e.note}` : ''}</li>)}</ul>
            </>
          )}
        </div>
      )}
    </section>
  );
}

// ── A11 ────────────────────────────────────────────────────────────────────
function GrievanceSection() {
  const [type, setType] = useState('statutory_grievance');
  const tickets = useResource(() => get(`${C}/grievances?type=${type}`).then((r) => r.data), [type]);
  const [replies, setReplies] = useState({});
  const [run, msg] = useAction();
  const update = (t, body, label) => run(() => fetchJson(`${C}/grievances/${t.id}`, json('PUT', body)).then(() => tickets.reload()), label);
  const breached = (tickets.data || []).filter((t) => t.isBreached48h).length;
  return (
    <section data-testid="ops-grievances" style={S.card}>
      <div style={{ ...S.row, justifyContent: 'space-between' }}>
        <h3 style={S.h3}>Grievance register</h3>
        <select aria-label="Ticket type" style={S.input} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="statutory_grievance">Statutory grievances</option>
          <option value="support">Support tickets</option>
          <option value="all">All</option>
        </select>
      </div>
      {msg}
      <Err error={tickets.error} />
      {tickets.data && <p data-testid="grievance-sla" style={S.muted}>{tickets.data.length} ticket(s); {breached} past the 48-hour acknowledgement deadline.</p>}
      {tickets.data && tickets.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Ticket</th><th style={S.th}>Customer</th><th style={S.th}>Status</th><th style={S.th}>48h SLA</th><th style={S.th}>Reply / resolve</th></tr></thead>
          <tbody>
            {tickets.data.map((t) => (
              <tr key={t.id} data-testid={`ticket-row-${t.id}`}>
                <td style={S.td}><strong>{t.subject}</strong><div>{t.description}</div><div style={S.muted}>{when(t.created_at)}</div></td>
                <td style={S.td}>{t.customer_name || '—'}<div style={S.muted}>{t.customer_phone}</div></td>
                <td style={S.td}>{t.status}{t.resolution && <div style={S.muted}>“{t.resolution}”</div>}</td>
                <td style={S.td}>{t.isAcknowledged ? `Acknowledged in ${t.ackHours}h` : t.isBreached48h ? <strong style={{ color: 'var(--danger)' }}>Breached ({t.ackHours}h)</strong> : `Open ${t.ackHours}h`}</td>
                <td style={S.td}>
                  <textarea aria-label={`Reply to ${t.subject}`} rows={2} style={{ ...S.input, width: '100%' }} value={replies[t.id] || ''} onChange={(e) => setReplies({ ...replies, [t.id]: e.target.value })} />
                  <div style={S.row}>
                    {!t.isAcknowledged && <button style={S.ghost} onClick={() => update(t, { acknowledge: true, status: 'in_progress' }, 'Acknowledged')}>Acknowledge</button>}
                    <button style={S.ghost} onClick={() => update(t, { resolution: replies[t.id], status: 'in_progress' }, 'Reply sent')}>Send reply</button>
                    <button style={S.btn} onClick={() => update(t, { resolution: replies[t.id], status: 'resolved' }, 'Grievance resolved')}>Resolve</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

// ── A12 ────────────────────────────────────────────────────────────────────
function FlagsSection() {
  const flags = useResource(() => get(`${C}/feature-flags`).then((r) => r.data.registry));
  const [run, msg] = useAction();
  const groups = {};
  for (const f of flags.data || []) (groups[f.scope] = groups[f.scope] || []).push(f);
  return (
    <section data-testid="ops-flags" style={S.card}>
      <h3 style={S.h3}>Feature flags &amp; vertical kill switches</h3>
      <p style={S.muted}>Switches take effect at once for the API, and reach the web and app navigation through GET /features. They survive restarts.</p>
      {msg}
      <Err error={flags.error} />
      {Object.entries(groups).map(([scope, list]) => (
        <div key={scope} style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: '0.5rem 0', textTransform: 'capitalize' }}>{scope}</h4>
          <table style={S.table}>
            <tbody>
              {list.map((f) => (
                <tr key={f.key} data-testid={`flag-row-${f.key}`}>
                  <td style={S.td}><strong>{f.name}</strong><div style={S.muted}>{f.description}</div></td>
                  <td style={S.td}>{f.enabled ? 'On' : 'Off'}{f.overridden && <span style={S.muted}> (console override; default {f.defaultEnabled ? 'on' : 'off'})</span>}</td>
                  <td style={S.td}>
                    {f.switchable
                      ? <button aria-label={`${f.enabled ? 'Switch off' : 'Switch on'} ${f.name}`} style={f.enabled ? S.danger : S.btn}
                          onClick={() => run(() => fetchJson(`${C}/feature-flags`, json('PUT', { features: { [f.key]: !f.enabled } })).then(() => flags.reload()), `${f.name} switched ${f.enabled ? 'off' : 'on'}`)}>
                          {f.enabled ? 'Switch off' : 'Switch on'}
                        </button>
                      : <span style={S.muted}>Always on</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </section>
  );
}

// ── A13 ────────────────────────────────────────────────────────────────────
function ReportsSection() {
  const [run, msg] = useAction();
  const reports = [
    ['standard', 'Orders & sales (CSV)', 'orders_sales_report.csv'],
    ['tcs_statutory', 'GST Section 52 TCS (CSV, for the CA)', 'gst_tcs_section_52_report.csv'],
    ['seller_reconciliation', 'Seller sales & payout reconciliation (CSV)', 'seller_payout_reconciliation.csv'],
  ];
  return (
    <section data-testid="ops-reports" style={S.card}>
      <h3 style={S.h3}>Financial &amp; tax exports</h3>
      {msg}
      <div style={S.row}>
        {reports.map(([format, label, file]) => (
          <button key={format} style={S.ghost} onClick={() => run(() => download(`${C}/reports/export?format=${format}`, file), `${label} downloaded`)}>{label}</button>
        ))}
      </div>
    </section>
  );
}

// ── A14 ────────────────────────────────────────────────────────────────────
function BroadcastSection() {
  const zones = useResource(() => get(`${C}/zones`).then((r) => r.data));
  const history = useResource(() => get(`${C}/broadcasts`).then((r) => r.data));
  const [form, setForm] = useState({ title: '', body: '', targetZoneId: '', targetRole: 'customer', deepLink: '' });
  const [run, msg] = useAction();
  const send = (e) => {
    e.preventDefault();
    run(() => fetchJson(`${C}/broadcasts`, json('POST', { ...form, targetZoneId: form.targetZoneId || undefined })).then((r) => { history.reload(); return r; }), (r) => (r && r.message) || 'Sent');
  };
  return (
    <section data-testid="ops-broadcasts" style={S.card}>
      <h3 style={S.h3}>Broadcast notification</h3>
      <p style={S.muted}>Only users who have granted marketing consent receive it (DPDP Act 2023).</p>
      {msg}
      <form onSubmit={send} style={{ display: 'grid', gap: '0.5rem', maxWidth: '40rem' }}>
        <input aria-label="Broadcast title" placeholder="Title" style={S.input} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea aria-label="Broadcast message" placeholder="Message" rows={3} style={S.input} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
        <div style={S.row}>
          <select aria-label="Broadcast zone" style={S.input} value={form.targetZoneId} onChange={(e) => setForm({ ...form, targetZoneId: e.target.value })}>
            <option value="">All zones</option>
            {(zones.data || []).map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
          <select aria-label="Broadcast audience" style={S.input} value={form.targetRole} onChange={(e) => setForm({ ...form, targetRole: e.target.value })}>
            <option value="customer">Customers</option><option value="seller">Sellers</option><option value="rider">Riders</option><option value="all">Everyone</option>
          </select>
          <input aria-label="Broadcast link" placeholder="Link (optional)" style={S.input} value={form.deepLink} onChange={(e) => setForm({ ...form, deepLink: e.target.value })} />
          <button type="submit" style={S.btn}>Send broadcast</button>
        </div>
      </form>
      <h3 style={{ ...S.h3, marginTop: '1.5rem' }}>History</h3>
      <Err error={history.error} />
      {history.data && history.data.length === 0 && <Empty>No broadcasts sent yet.</Empty>}
      {history.data && history.data.length > 0 && (
        <table style={S.table}>
          <thead><tr><th style={S.th}>Sent</th><th style={S.th}>Title</th><th style={S.th}>Audience</th><th style={S.th}>Delivered</th><th style={S.th}>No consent</th></tr></thead>
          <tbody>
            {history.data.map((b) => (
              <tr key={b.id} data-testid="broadcast-row">
                <td style={S.td}>{when(b.created_at)}</td>
                <td style={S.td}>{b.title}</td>
                <td style={S.td}>{b.audience.role || '—'} · {b.audience.zoneName || 'All zones'}</td>
                <td style={S.td}>{b.success_count ?? 0} of {b.audience.eligible ?? '—'}</td>
                <td style={S.td}>{b.audience.skippedNoConsent ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

export const COMMERCE_SECTIONS = [
  ['kpis', 'KPIs', KpiSection],
  ['sellers', 'Sellers & KYC', SellersSection],
  ['catalog', 'Catalog', CatalogSection],
  ['orders', 'Orders', OrdersSection],
  ['disputes', 'Disputes & returns', DisputesSection],
  ['payouts', 'Payouts & commission', PayoutsSection],
  ['promotions', 'Promotions & CMS', PromotionsSection],
  ['audit', 'Audit log', AuditSection],
  ['zones', 'Zones', ZonesSection],
  ['fleet', 'Fleet & cash', FleetSection],
  ['grievances', 'Grievances', GrievanceSection],
  ['flags', 'Feature flags', FlagsSection],
  ['reports', 'Reports', ReportsSection],
  ['broadcasts', 'Broadcasts', BroadcastSection],
];

export default function CommerceOpsTab() {
  const [section, setSection] = useState('kpis');
  useEffect(() => {
    try {
      const s = new URLSearchParams(window.location.search).get('section');
      if (s && COMMERCE_SECTIONS.some(([id]) => id === s)) setSection(s);
    } catch { /* prerender */ }
  }, []);
  const pick = (id) => {
    setSection(id);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'commerce');
      url.searchParams.set('section', id);
      window.history.replaceState(null, '', url);
    } catch { /* prerender */ }
  };
  const Active = (COMMERCE_SECTIONS.find(([id]) => id === section) || COMMERCE_SECTIONS[0])[2];
  return (
    <div>
      <nav aria-label="Commerce operations" role="tablist" style={{ ...S.row, marginBottom: '1.25rem' }}>
        {COMMERCE_SECTIONS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={section === id} onClick={() => pick(id)}
            style={section === id ? S.btn : S.ghost}>{label}</button>
        ))}
      </nav>
      <Active key={section} />
    </div>
  );
}
