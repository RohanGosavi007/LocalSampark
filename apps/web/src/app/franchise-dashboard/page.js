'use client';
import React from 'react';
import Link from 'next/link';
import { Users, Store, Map, IndianRupee } from 'lucide-react';
import FranchiseShell, { useFranchiseData, inr } from './components/FranchiseShell';
import FranchiseIntelligenceWidget from './components/FranchiseIntelligenceWidget';

// Franchise overview. Every figure comes from the API: GET /franchise/dashboard
// (commission, shops, pincodes), /franchise/territory-customers and
// /franchise/reports. The tiles used to carry invented trends ("+15%", "+4")
// and two counts hard-coded to 0, beside chart placeholders that drew nothing.
export default function FranchiseDashboard() {
  const dash = useFranchiseData('/franchise/dashboard');
  const customers = useFranchiseData('/franchise/territory-customers?limit=200');
  const reports = useFranchiseData('/franchise/reports?months=6');

  const d = dash.data || {};
  const months = (reports.data && reports.data.months) || [];
  const maxOrders = Math.max(1, ...months.map((m) => m.orders));
  const customerCount = ((customers.data && customers.data.customers) || []).length;

  const tiles = [
    { label: 'Commission earned', value: inr(d.totalRevenue), note: 'All time', icon: IndianRupee, href: '/franchise-dashboard/revenue' },
    { label: 'Shops in territory', value: Number(d.activeShops || 0), note: 'Registered', icon: Store, href: '/franchise-dashboard/shops' },
    { label: 'Customers', value: customers.loading ? '…' : customerCount >= 200 ? '200+' : customerCount, note: 'Have ordered here', icon: Users, href: '/franchise-dashboard/users' },
    { label: 'Pincodes', value: (d.territoryPincodes || []).length, note: (d.territoryPincodes || []).join(', ') || 'None assigned', icon: Map, href: '/franchise-dashboard/zones' },
  ];

  return (
    <FranchiseShell
      title="Franchise Overview"
      subtitle={d.franchise ? `${d.franchise.territory_name} — ${d.franchise.status}` : 'Your territory at a glance.'}
      active="/franchise-dashboard"
      loading={dash.loading}
      error={dash.error}
      onRetry={dash.reload}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="bg-card-bg border border-border rounded-3xl p-6 hover:border-blue-500 transition">
            <t.icon className="w-6 h-6 text-blue-500 mb-3" aria-hidden="true" />
            <p className="text-text-muted text-sm">{t.label}</p>
            <p className="text-3xl font-black text-text">{t.value}</p>
            <p className="text-xs text-text-muted mt-1 truncate">{t.note}</p>
          </Link>
        ))}
      </div>

      <section aria-labelledby="orders-h" className="bg-card-bg border border-border rounded-3xl p-6 mb-8">
        <h2 id="orders-h" className="text-lg font-bold text-text mb-4">Orders per month</h2>
        {reports.loading ? (
          <div className="h-40 animate-pulse bg-background rounded-2xl" aria-busy="true" />
        ) : reports.error ? (
          <p className="text-text-muted" role="alert">{reports.error.message}</p>
        ) : months.every((m) => m.orders === 0) ? (
          <p className="text-text-muted">No orders in your territory in the last six months.</p>
        ) : (
          <div className="flex items-end gap-3 h-40" role="img" aria-label={months.map((m) => `${m.month}: ${m.orders} orders`).join(', ')}>
            {months.map((m) => (
              <div key={m.month} className="flex-1 flex flex-col items-center justify-end h-full">
                <span className="text-xs font-semibold text-text mb-1">{m.orders}</span>
                <div className="w-full bg-blue-600 rounded-t-lg" style={{ height: `${Math.max((m.orders / maxOrders) * 100, m.orders ? 4 : 0)}%` }} />
                <span className="text-xs text-text-muted mt-1">{m.month.slice(5)}/{m.month.slice(2, 4)}</span>
              </div>
            ))}
          </div>
        )}
        <Link href="/franchise-dashboard/reports" className="text-sm text-blue-600 underline mt-4 inline-block">Full report</Link>
      </section>

      {d.franchise && d.franchise.zone_id && <FranchiseIntelligenceWidget zoneId={d.franchise.zone_id} />}
    </FranchiseShell>
  );
}
