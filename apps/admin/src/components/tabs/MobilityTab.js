import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/mobility/stats (see EcosystemStatsTab).
export default function MobilityTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/mobility/stats`}
      title="🚗 Mobility & Transport"
      subtitle="Fleet vehicles, driver verification and carpool rides."
    />
  );
}
