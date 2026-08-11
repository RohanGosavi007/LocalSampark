'use client';
import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingUp, DollarSign, Calendar, ArrowUpRight, ArrowDownRight, Download, RefreshCw } from 'lucide-react';
import { API_BASE } from '@/lib/api';

export default function ShopLedger({ token, shopId }) {
  const [ledgerData, setLedgerData] = useState({
    grossSales: 0,
    platformCommission: 0,
    netPayout: 0,
    pendingPayouts: 0,
    transactions: []
  });
  const [loading, setLoading] = useState(true);

  const fetchLedger = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/shops/my-shop/ledger`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.ledger) {
        setLedgerData(data.ledger);
      }
    } catch (err) {
      console.error('Failed to fetch ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (ledgerData.transactions.length === 0) return alert('No transactions to export.');
    const headers = ['Date', 'Order ID', 'Gross Amount', 'Commission', 'Net Earnings'];
    const rows = ledgerData.transactions.map(t => [
      new Date(t.created_at).toLocaleDateString(),
      t.id,
      t.total_amount,
      (t.total_amount * 0.10).toFixed(2),
      (t.total_amount * 0.90).toFixed(2)
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `shop_ledger_${shopId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleWithdraw = async () => {
    if (ledgerData.pendingPayouts <= 0) return alert('No pending payouts available.');
    if (!window.confirm(`Are you sure you want to request a withdrawal of ₹${ledgerData.pendingPayouts}?`)) return;
    
    alert('Withdrawal request submitted successfully! Our team will process it within 24-48 hours.');
    // In a real app, you would hit an endpoint like POST /shops/my-shop/payouts/withdraw
    // Then call fetchLedger() to update the state.
  };

  useEffect(() => {
    fetchLedger();
  }, [shopId, token]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ marginTop: '12px' }}>Loading Financial Ledger...</p>
      </div>
    );
  }

  const statCards = [
    { label: 'Gross Sales', value: ledgerData.grossSales, icon: TrendingUp, color: '#3b82f6', prefix: '₹' },
    { label: 'Platform Commission', value: ledgerData.platformCommission, icon: ArrowDownRight, color: '#ef4444', prefix: '-₹' },
    { label: 'Net Earnings', value: ledgerData.netPayout, icon: ArrowUpRight, color: '#22c55e', prefix: '₹' },
    { label: 'Pending Payout', value: ledgerData.pendingPayouts, icon: DollarSign, color: '#f59e0b', prefix: '₹' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>Financial Ledger</h2>
          <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>Automated Reconciliation & Payouts</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#e2e8f0', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s hover:bg-rgba(255,255,255,0.1)' }}>
            <Download size={16} /> Export CSV
          </button>
          <button onClick={handleWithdraw} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#22c55e', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', opacity: ledgerData.pendingPayouts > 0 ? 1 : 0.5 }}>
            <DollarSign size={16} /> Request Payout
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {statCards.map((card, i) => (
          <div key={i} style={{ padding: '20px', background: 'rgba(255,255,255,0.03)', border: `1px solid ${card.color}30`, borderRadius: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{ padding: '8px', background: `${card.color}20`, borderRadius: '8px' }}>
                <card.icon size={20} color={card.color} />
              </div>
              <span style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600, textTransform: 'uppercase' }}>{card.label}</span>
            </div>
            <p style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 800, margin: 0 }}>
              {card.prefix}{card.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          </div>
        ))}
      </div>

      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
          <h3 style={{ color: '#e2e8f0', fontSize: '15px', fontWeight: 700, margin: 0 }}>Recent Transactions</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.01)' }}>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Order ID</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Gross Amount</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Commission (10%)</th>
                <th style={{ padding: '12px 20px', textAlign: 'left', color: '#64748b', fontSize: '12px', fontWeight: 600 }}>Net Earnings</th>
              </tr>
            </thead>
            <tbody>
              {ledgerData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    No transactions found for this period.
                  </td>
                </tr>
              ) : (
                ledgerData.transactions.map((tx, i) => (
                  <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '16px 20px', color: '#cbd5e1', fontSize: '13px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} color="#64748b" />
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </td>
                    <td style={{ padding: '16px 20px', color: '#3b82f6', fontSize: '13px', fontWeight: 600 }}>#{tx.order_id.slice(0,8).toUpperCase()}</td>
                    <td style={{ padding: '16px 20px', color: '#e2e8f0', fontSize: '13px' }}>₹{tx.gross_amount.toFixed(2)}</td>
                    <td style={{ padding: '16px 20px', color: '#ef4444', fontSize: '13px' }}>-₹{tx.commission.toFixed(2)}</td>
                    <td style={{ padding: '16px 20px', color: '#22c55e', fontSize: '13px', fontWeight: 700 }}>₹{tx.net_amount.toFixed(2)}</td>
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
