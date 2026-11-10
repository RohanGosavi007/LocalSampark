'use client';
import React from 'react';
import FranchiseShell, { useFranchiseData, when } from '../components/FranchiseShell';

// The territories this partner holds, with live shop and waitlist counts (GET /franchise/zones).
export default function FranchiseZones() {
  const { data, loading, error, reload } = useFranchiseData('/franchise/zones');
  const zones = (data && data.zones) || [];
  return (
    <FranchiseShell
      title="My Zones"
      subtitle="The pincodes assigned to your franchise."
      active="/franchise-dashboard/zones"
      loading={loading}
      error={error}
      onRetry={reload}
      empty={zones.length === 0}
      emptyText="No territories are assigned to your franchise yet. Contact the LocalSampark team to have one assigned."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {zones.map((z) => (
          <article key={z.id} className="bg-card-bg border border-border rounded-3xl p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-text">{z.name}</h3>
                <p className="text-sm text-text-muted">PIN {z.pincode}</p>
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-emerald-500/10 text-emerald-600">{z.status}</span>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-text-muted">Shops</dt><dd className="text-xl font-black text-text">{z.shops}</dd></div>
              <div><dt className="text-text-muted">Waitlist</dt><dd className="text-xl font-black text-text">{z.waitlist}</dd></div>
              <div><dt className="text-text-muted">Commission</dt><dd className="font-semibold text-text">{z.commissionRate === null ? 'Partner rate' : `${z.commissionRate}%`}</dd></div>
              <div><dt className="text-text-muted">Assigned</dt><dd className="font-semibold text-text">{when(z.assignedAt)}</dd></div>
            </dl>
          </article>
        ))}
      </div>
    </FranchiseShell>
  );
}
