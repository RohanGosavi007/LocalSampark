'use client';
import React, { useState } from 'react';
import FranchiseShell, { useFranchiseData, inr } from '../components/FranchiseShell';

// Month-by-month activity in the territory (GET /franchise/reports), with a CSV export of the same rows.
export default function FranchiseReports() {
  const [months, setMonths] = useState(6);
  const { data, loading, error, reload } = useFranchiseData(`/franchise/reports?months=${months}`);
  const rows = (data && data.months) || [];
  const totals = rows.reduce((t, m) => ({
    orders: t.orders + m.orders,
    delivered: t.delivered + m.deliveredOrders,
    value: t.value + m.deliveredValue,
    shops: t.shops + m.newShops,
  }), { orders: 0, delivered: 0, value: 0, shops: 0 });

  const exportCsv = () => {
    const lines = [['month', 'orders', 'delivered_orders', 'delivered_value', 'new_shops'].join(',')]
      .concat(rows.map((m) => [m.month, m.orders, m.deliveredOrders, m.deliveredValue, m.newShops].join(',')));
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `franchise-report-${months}m.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <FranchiseShell
      title="Territory Reports"
      subtitle="Orders, delivered value and new shops in your pincodes."
      active="/franchise-dashboard/reports"
      loading={loading}
      error={error}
      onRetry={reload}
      actions={(
        <div className="flex gap-2">
          <label htmlFor="months" className="sr-only">Period</label>
          <select id="months" value={months} onChange={(e) => setMonths(Number(e.target.value))} className="px-3 py-2 bg-card-bg border border-border rounded-xl text-text">
            {[3, 6, 12].map((m) => <option key={m} value={m}>Last {m} months</option>)}
          </select>
          <button onClick={exportCsv} disabled={!rows.length} className="px-4 py-2 rounded-xl bg-card-bg border border-border text-text disabled:opacity-50">Export CSV</button>
        </div>
      )}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[['Orders', totals.orders], ['Delivered', totals.delivered], ['Delivered value', inr(totals.value)], ['New shops', totals.shops]].map(([label, value]) => (
          <div key={label} className="bg-card-bg border border-border rounded-3xl p-5">
            <p className="text-sm text-text-muted">{label}</p>
            <p className="text-2xl font-black text-text">{value}</p>
          </div>
        ))}
      </div>
      <div className="overflow-x-auto bg-card-bg border border-border rounded-3xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="p-4">Month</th><th className="p-4">Orders</th><th className="p-4">Delivered</th>
              <th className="p-4">Delivered value</th><th className="p-4">New shops</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => (
              <tr key={m.month} className="border-b border-border last:border-0">
                <td className="p-4 font-semibold text-text">{m.month}</td>
                <td className="p-4">{m.orders}</td>
                <td className="p-4">{m.deliveredOrders}</td>
                <td className="p-4">{inr(m.deliveredValue)}</td>
                <td className="p-4">{m.newShops}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FranchiseShell>
  );
}
