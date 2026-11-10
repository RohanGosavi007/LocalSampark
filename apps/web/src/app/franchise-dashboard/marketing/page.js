'use client';
import React from 'react';
import FranchiseShell, { useFranchiseData, when } from '../components/FranchiseShell';

// Demand signals in the territory: merchant leads (GET /franchise/leads) and
// "notify me" waitlist sign-ups for modules not live yet (GET /franchise/waitlist).
export default function FranchiseMarketing() {
  const leads = useFranchiseData('/franchise/leads?limit=50');
  const waitlist = useFranchiseData('/franchise/waitlist');
  const leadRows = (leads.data && leads.data.leads) || [];
  const waitRows = (waitlist.data && waitlist.data.waitlist) || [];

  return (
    <FranchiseShell
      title="Marketing & Demand"
      subtitle="Merchant leads and customer waitlists in your pincodes."
      active="/franchise-dashboard/marketing"
      loading={leads.loading || waitlist.loading}
      error={leads.error || waitlist.error}
      onRetry={() => { leads.reload(); waitlist.reload(); }}
    >
      <section aria-labelledby="leads-h" className="mb-8">
        <h2 id="leads-h" className="text-xl font-bold text-text mb-3">Merchant leads</h2>
        {leadRows.length === 0 ? (
          <p className="text-text-muted bg-card-bg border border-border rounded-3xl p-6">No leads in your territory yet.</p>
        ) : (
          <div className="overflow-x-auto bg-card-bg border border-border rounded-3xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="p-4">Lead</th><th className="p-4">Source</th><th className="p-4">Status</th><th className="p-4">PIN</th><th className="p-4">Added</th>
                </tr>
              </thead>
              <tbody>
                {leadRows.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="p-4 font-semibold text-text">{l.business_name}</td>
                    <td className="p-4">{l.category}</td>
                    <td className="p-4 capitalize">{l.status || '—'}</td>
                    <td className="p-4">{l.pincode || '—'}</td>
                    <td className="p-4 text-text-muted">{when(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section aria-labelledby="wait-h">
        <h2 id="wait-h" className="text-xl font-bold text-text mb-3">Waitlist sign-ups</h2>
        {waitRows.length === 0 ? (
          <p className="text-text-muted bg-card-bg border border-border rounded-3xl p-6">No waitlist sign-ups in your territory yet.</p>
        ) : (
          <div className="overflow-x-auto bg-card-bg border border-border rounded-3xl">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-muted border-b border-border">
                  <th className="p-4">Module</th><th className="p-4">PIN</th><th className="p-4">Sign-ups</th><th className="p-4">Latest</th>
                </tr>
              </thead>
              <tbody>
                {waitRows.map((w) => (
                  <tr key={`${w.feature}-${w.pincode}`} className="border-b border-border last:border-0">
                    <td className="p-4 font-semibold text-text capitalize">{String(w.feature).replace(/_/g, ' ')}</td>
                    <td className="p-4">{w.pincode}</td>
                    <td className="p-4">{w.count}</td>
                    <td className="p-4 text-text-muted">{when(w.latest)}</td>
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
