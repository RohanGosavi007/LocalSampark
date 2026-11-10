'use client';
import React from 'react';
import Link from 'next/link';
import FranchiseShell, { useFranchiseData, when } from '../components/FranchiseShell';

// The partnership as recorded (GET /franchise/profile). Commission, territories
// and status are set by LocalSampark administrators, so this page shows them
// rather than offering controls that would save nothing.
export default function FranchiseSettings() {
  const { data, loading, error, reload } = useFranchiseData('/franchise/profile');
  const p = data && data.profile;
  const rows = p ? [
    ['Territory', p.territoryName],
    ['Registered pincode', p.registeredPincode],
    ['Assigned pincodes', p.territoryPincodes && p.territoryPincodes.length ? p.territoryPincodes.join(', ') : 'None assigned yet'],
    ['Status', p.status],
    ['Commission rate', p.commissionRate === null ? null : `${p.commissionRate}%`],
    ['Agreement signed', when(p.agreementSignedAt)],
    ['Partner since', when(p.partnerSince)],
    ['Contact name', p.contact && p.contact.name],
    ['Contact email', p.contact && p.contact.email],
    ['Contact phone', p.contact && p.contact.phone],
  ] : [];

  return (
    <FranchiseShell
      title="Partnership Settings"
      subtitle="Your franchise agreement as LocalSampark has it on record."
      active="/franchise-dashboard/settings"
      loading={loading}
      error={error}
      onRetry={reload}
    >
      <dl className="bg-card-bg border border-border rounded-3xl divide-y divide-border">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-1 sm:grid-cols-3 gap-1 p-4">
            <dt className="text-text-muted text-sm">{label}</dt>
            <dd className="sm:col-span-2 font-semibold text-text break-words">{value || '—'}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-text-muted mt-4">
        Contact details can be changed on your <Link href="/profile" className="underline">profile</Link>. To change
        your territory or commission, contact the LocalSampark partner team.
      </p>
    </FranchiseShell>
  );
}
