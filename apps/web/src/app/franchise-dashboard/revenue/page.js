'use client';
import React from 'react';
import FranchiseShell, { useFranchiseData, inr, when } from '../components/FranchiseShell';

// Commission and payouts from GET /franchise/dashboard. The tiles used to show
// an invented "+12% this week", a pending payout hard-coded to ₹0 and a
// settlement day nobody had set; the Export button did nothing.
export default function FranchiseRevenue() {
  const { data, loading, error, reload } = useFranchiseData('/franchise/dashboard');
  const earnings = (data && data.earnings) || [];
  const pending = earnings
    .filter((e) => ['pending', 'payout_requested', 'processing'].includes(String(e.status || e.payout_status || '').toLowerCase()))
    .reduce((sum, e) => sum + (Number(e.commission_earned) || 0), 0);

  const exportCsv = () => {
    const header = ['id', 'date', 'source', 'status', 'commission'];
    const lines = [header.join(',')].concat(earnings.map((e) => [
      e.id, e.created_at, e.source_type || '', e.status || e.payout_status || '', Number(e.commission_earned) || 0,
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'franchise-earnings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <FranchiseShell
      title="Revenue"
      subtitle="Your commissions and payouts."
      active="/franchise-dashboard/revenue"
      loading={loading}
      error={error}
      onRetry={reload}
      actions={(
        <button onClick={exportCsv} disabled={!earnings.length} className="px-4 py-2 bg-card-bg text-text rounded-xl border border-border disabled:opacity-50">
          Export CSV
        </button>
      )}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          ['Total commission earned', inr(data && data.totalRevenue), 'All time'],
          ['Wallet balance', inr(data && data.walletBalance), 'Available to claim'],
          ['Payouts in progress', inr(pending), 'Requested, not yet paid'],
        ].map(([label, value, note]) => (
          <div key={label} className="bg-card-bg border border-border rounded-3xl p-6">
            <p className="text-text-muted text-sm">{label}</p>
            <p className="text-3xl font-black text-text">{value}</p>
            <p className="text-xs text-text-muted mt-1">{note}</p>
          </div>
        ))}
      </div>

      <section aria-labelledby="earn-h" className="bg-card-bg border border-border rounded-3xl p-6">
        <h2 id="earn-h" className="text-xl font-bold text-text mb-4">Earning transactions</h2>
        {earnings.length === 0 ? (
          <p className="text-text-muted">No earnings yet. Commissions appear here once orders are delivered in your territory.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[560px]">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="p-3">Reference</th><th className="p-3">Date</th><th className="p-3">Source</th>
                  <th className="p-3">Status</th><th className="p-3 text-right">Commission</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((e) => (
                  <tr key={e.id} className="border-b border-border last:border-0">
                    <td className="p-3 font-mono">{String(e.id).slice(0, 8).toUpperCase()}</td>
                    <td className="p-3 text-text-muted">{when(e.created_at)}</td>
                    <td className="p-3 capitalize">{e.source_type || '—'}</td>
                    <td className="p-3 capitalize">{String(e.status || e.payout_status || '—').replace(/_/g, ' ')}</td>
                    <td className="p-3 text-right font-bold">{inr(e.commission_earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </FranchiseShell>
  );
}
