import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/krishi/stats (see EcosystemStatsTab).
export default function KrishiTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/krishi/stats`}
      title="🌾 Krishi (Agriculture & Rural)"
      subtitle="Krishi listings and waitlist sign-ups. The module is off at launch."
    />
  );
}
