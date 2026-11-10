import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/charity/stats (see EcosystemStatsTab).
export default function CharityTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/charity/stats`}
      title="🤝 Charity & NGO Management"
      subtitle="Donation campaigns, verified NGOs and volunteer tasks."
    />
  );
}
