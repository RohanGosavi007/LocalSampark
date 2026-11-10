import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/animal/stats (see EcosystemStatsTab).
export default function AnimalWelfareTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/animal/stats`}
      title="🐾 Animal Welfare & Pets"
      subtitle="Rescue requests and lost/found pet alerts."
    />
  );
}
