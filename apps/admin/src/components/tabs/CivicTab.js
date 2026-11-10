import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/civic/stats (see EcosystemStatsTab).
export default function CivicTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/civic/stats`}
      title="🏛️ Civic & Legal Services"
      subtitle="Civic issues reported by residents and their resolution."
    />
  );
}
