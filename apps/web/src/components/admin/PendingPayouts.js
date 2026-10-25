'use client';
import React, { useEffect, useState } from 'react';
import { adminGet } from '@/lib/api';

const rupees = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const GROUPS = [
  ['franchise', 'Franchise commissions'],
  ['developer', 'Developer share'],
  ['shopOwner', 'Shop withdrawals'],
  ['skilled', 'Service-provider withdrawals'],
];

/**
 * What is waiting to be paid out, straight from /admin/payouts/pending.
 *
 * Read-only on purpose. The API has no endpoint that executes a payout, and the pages
 * this replaces had "Settle", "Process All Pending" and "Batch Settle" buttons that
 * showed a message and flipped the row to "completed" on screen while moving no money.
 * Totals are summed from the rows; nothing is estimated.
 */
export default function PendingPayouts({ title }) {
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    adminGet('/admin/payouts/pending')
      .then((json) => { if (alive) setState({ loading: false, error: null, data: json.data || {} }); })
      .catch((e) => { if (alive) setState({ loading: false, error: e.message || 'Could not load payouts', data: null }); });
    return () => { alive = false; };
  }, []);

  if (state.loading) return <div className="p-8 text-slate-900 dark:text-white">Loading…</div>;
  if (state.error) return <div role="alert" className="p-8 text-red-500 font-bold">{state.error}</div>;

  const totals = GROUPS.map(([key, label]) => {
    const rows = state.data[key] || [];
    return { key, label, rows, total: rows.reduce((a, r) => a + (parseFloat(r.amount) || 0), 0) };
  });
  const grand = totals.reduce((a, g) => a + g.total, 0);
  const count = totals.reduce((a, g) => a + g.rows.length, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h1>
        <div className="text-right">
          <div className="text-xs text-slate-500 font-bold uppercase">Pending total ({count})</div>
          <div className="text-2xl font-black text-yellow-500">{rupees(grand)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {totals.map((g) => (
          <div key={g.key} className="bg-slate-100 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="text-sm text-slate-500 dark:text-slate-400">{g.label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white">{rupees(g.total)}</div>
            <div className="text-xs text-slate-500">{g.rows.length} pending</div>
          </div>
        ))}
      </div>

      <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto">
        {count === 0 ? (
          <p className="text-slate-500">Nothing is waiting to be paid out.</p>
        ) : (
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-white dark:bg-slate-900">
              <tr>
                <th className="p-3">Payee</th>
                <th className="p-3">Type</th>
                <th className="p-3">Requested</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {totals.flatMap((g) => g.rows).map((r) => (
                <tr key={`${r.type}-${r.id}`} className="border-b border-slate-200 dark:border-slate-700">
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">{r.payee}</td>
                  <td className="p-3">{r.type}</td>
                  <td className="p-3">{r.date ? new Date(r.date).toLocaleString('en-IN') : '—'}</td>
                  <td className="p-3 text-right">{rupees(r.amount)}</td>
                  <td className="p-3">{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-slate-500 mt-4">Settling a payout is not done from this page; the platform has no payout-execution API yet.</p>
      </div>
    </div>
  );
}
