'use client';
import React, { useEffect, useState } from 'react';
import Header from '../components/Header';
import { DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { apiFetch } from '@/lib/api';

const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

// The signed-in person's own wallet ledger. This page used to show a fixed table of
// invented transactions and hard-coded totals for "franchise / shop / rider" views.
export default function PayoutsDashboard() {
  const [state, setState] = useState({ loading: true, error: null, balance: 0, transactions: [] });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await apiFetch('/wallet/history');
        if (alive) setState({ loading: false, error: null, balance: data.balance || 0, transactions: data.transactions || [] });
      } catch (e) {
        if (alive) setState((s) => ({ ...s, loading: false, error: e.message || 'Could not load your transactions' }));
      }
    })();
    return () => { alive = false; };
  }, []);

  const credits = state.transactions.filter((t) => t.type === 'credit').reduce((a, t) => a + Math.abs(Number(t.amount) || 0), 0);
  const debits = state.transactions.filter((t) => t.type !== 'credit').reduce((a, t) => a + Math.abs(Number(t.amount) || 0), 0);
  const stats = [
    { label: 'Wallet balance', value: rupees(state.balance), icon: DollarSign, color: '#3b82f6' },
    { label: 'Received (last 200)', value: rupees(credits), icon: ArrowUpRight, color: '#22c55e' },
    { label: 'Spent / paid out (last 200)', value: rupees(debits), icon: ArrowDownRight, color: '#a855f7' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-6 pt-24">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text">Financial Ledger</h1>
          <p className="text-text-muted mt-1">Your wallet transactions</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card-bg border border-border rounded-2xl p-6">
              <div className="mb-3" style={{ color: stat.color }}><stat.icon size={24} /></div>
              <h3 className="text-3xl font-black text-text">{state.loading ? '…' : stat.value}</h3>
              <p className="text-text-muted font-bold mt-1 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-card-bg border border-border rounded-2xl p-6">
          <h2 className="text-xl font-bold text-text mb-6">Recent Transactions</h2>
          {state.error ? (
            <p className="text-red-400" role="alert">{state.error}</p>
          ) : state.loading ? (
            <p className="text-text-muted">Loading…</p>
          ) : state.transactions.length === 0 ? (
            <p className="text-text-muted">No transactions yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-background-alt/50 text-text-muted text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Date &amp; Time</th>
                    <th className="px-6 py-4">Purpose</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-muted">
                  {state.transactions.map((t) => (
                    <tr key={t.id}>
                      <td className="px-6 py-4">{t.created_at ? new Date(t.created_at).toLocaleString('en-IN') : '—'}</td>
                      <td className="px-6 py-4">{t.purpose || t.type}</td>
                      <td className={`px-6 py-4 font-bold ${t.type === 'credit' ? 'text-green-400' : 'text-red-400'}`}>
                        {t.type === 'credit' ? '+' : '-'}{rupees(Math.abs(Number(t.amount) || 0))}
                      </td>
                      <td className="px-6 py-4">{t.status || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
