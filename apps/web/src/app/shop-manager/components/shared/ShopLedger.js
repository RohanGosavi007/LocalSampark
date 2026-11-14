'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { TrendingUp, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Download, RefreshCw, Landmark } from 'lucide-react';
import { API_BASE } from '@/lib/api';

/**
 * S4: the shop's earnings and its settlements.
 *
 * "Request Payout" used to say "Withdrawal request submitted successfully!"
 * without contacting the server: nothing was recorded, and the seller was told
 * their money was on its way. Shops are not paid by request — LocalSampark
 * calculates and settles each shop's earnings to its bank account
 * (shop_payouts, /shops/:shopId/payouts). So this shows what is awaiting
 * settlement and the real settlement history instead of a button that did
 * nothing.
 *
 * The commission column said "(10%)" whatever the shop was charged; each row
 * now shows the amount the server recorded, and marks an estimate (no
 * commission row yet) as one.
 */
const money = (n) => (Number(n) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_LABEL = {
  calculated: 'Being prepared',
  approved: 'Approved — on its way',
  paid: 'Paid',
  failed: 'Failed',
};

export default function ShopLedger({ token, shopId }) {
  const [ledgerData, setLedgerData] = useState({
    grossSales: 0, platformCommission: 0, netPayout: 0, settledPayouts: 0, pendingPayouts: 0, transactions: [],
  });
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchLedger = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const res = await fetch(`${API_BASE}/shops/my-shop/ledger`, { headers });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success || !data.ledger) throw new Error(data.error || 'Your ledger could not be loaded.');
      setLedgerData(data.ledger);

      if (shopId) {
        const pr = await fetch(`${API_BASE}/shops/${shopId}/payouts`, { headers });
        const pd = await pr.json().catch(() => ({}));
        setPayouts(pr.ok && Array.isArray(pd.payouts) ? pd.payouts : []);
      }
    } catch (err) {
      setError(err.message || 'Your ledger could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [shopId, token]);

  useEffect(() => { if (token) fetchLedger(); }, [token, fetchLedger]);

  const handleExportCSV = () => {
    if (ledgerData.transactions.length === 0) return;
    const headers = ['Date', 'Order ID', 'Gross Amount', 'Commission', 'Net Earnings', 'Commission source'];
    const rows = ledgerData.transactions.map((t) => [
      new Date(t.created_at).toLocaleDateString('en-IN'),
      t.order_id,
      Number(t.gross_amount).toFixed(2),
      Number(t.commission).toFixed(2),
      Number(t.net_amount).toFixed(2),
      t.source === 'estimated' ? 'estimated' : 'recorded',
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `shop_ledger_${shopId || 'mine'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '12px' }}>Loading Financial Ledger...</p>
      </div>
    );
  }

  const statCards = [
    { id: 'gross', label: 'Gross Sales', value: ledgerData.grossSales, icon: TrendingUp, color: '#3b82f6', prefix: '₹' },
    { id: 'commission', label: 'Platform Commission', value: ledgerData.platformCommission, icon: ArrowDownRight, color: '#ef4444', prefix: '-₹' },
    { id: 'net', label: 'Net Earnings', value: ledgerData.netPayout, icon: ArrowUpRight, color: '#22c55e', prefix: '₹' },
    { id: 'pending', label: 'Awaiting Settlement', value: ledgerData.pendingPayouts, icon: DollarSign, color: '#f59e0b', prefix: '₹' },
  ];

  const th = { padding: '12px 20px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600 };
  const td = { padding: '16px 20px', color: '#cbd5e1', fontSize: '13px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>Financial Ledger</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>Your earnings and settlements</p>
        </div>
        <button onClick={handleExportCSV} disabled={ledgerData.transactions.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          <Download size={16} /> Export CSV
        </button>
      </div>

      {error && <p role="alert" style={{ color: '#ef4444', margin: 0 }}>{error}</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {statCards.map((card) => (
          <div key={card.id} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}30`, borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: `${card.color}20`, borderRadius: '8px' }}>
                <card.icon size={20} color={card.color} />
              </div>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>{card.label}</span>
            </div>
            <p data-testid={`ledger-${card.id}`} style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 800, margin: 0 }}>
              {card.prefix}{money(card.value)}
            </p>
          </div>
        ))}
      </div>

      <section aria-labelledby="settlements-heading" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '16px 20px' }}>
        <h3 id="settlements-heading" style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Landmark size={16} /> Settlements
        </h3>
        <p data-testid="settlement-note" style={{ color: '#94a3b8', fontSize: '13px', margin: '6px 0 12px' }}>
          LocalSampark settles your earnings to your registered bank account — there is nothing to request.
          {' '}₹{money(ledgerData.settledPayouts)} settled so far; ₹{money(ledgerData.pendingPayouts)} awaiting settlement.
        </p>
        {payouts.length === 0 ? (
          <p role="status" style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>No settlements yet.</p>
        ) : (
          <ul aria-label="Settlement history" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {payouts.map((p) => (
              <li key={p.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', color: '#cbd5e1', fontSize: '13px' }}>
                <span>{String(p.period_start || '').slice(0, 10)} – {String(p.period_end || '').slice(0, 10)}</span>
                <span>₹{money(p.net_payout)}</span>
                <span>{STATUS_LABEL[p.payout_status] || p.payout_status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, margin: 0 }}>Recent Transactions</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                <th style={th}>Date</th>
                <th style={th}>Order ID</th>
                <th style={th}>Gross Amount</th>
                <th style={th}>Commission</th>
                <th style={th}>Net Earnings</th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No delivered orders yet.
                  </td>
                </tr>
              ) : (
                ledgerData.transactions.map((tx) => (
                  <tr key={tx.order_id} style={{ borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="#64748b" />
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ ...td, color: '#3b82f6', fontWeight: 600 }}>#{String(tx.order_id).slice(0, 8).toUpperCase()}</td>
                    <td style={{ ...td, color: '#e2e8f0' }}>₹{money(tx.gross_amount)}</td>
                    <td style={{ ...td, color: '#ef4444' }}>
                      -₹{money(tx.commission)}
                      {tx.source === 'estimated' && <span title="No commission was recorded for this order yet; this is your shop's current rate." style={{ color: '#94a3b8', fontSize: '11px', marginLeft: 6 }}>(estimated)</span>}
                    </td>
                    <td style={{ ...td, color: '#22c55e', fontWeight: 700 }}>₹{money(tx.net_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
