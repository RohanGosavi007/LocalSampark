import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/environment/stats (see EcosystemStatsTab).
export default function EnvironmentTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/environment/stats`}
      title="♻️ Environment & Waste"
      subtitle="Scrap pickup requests and their progress."
    />
  );
}
