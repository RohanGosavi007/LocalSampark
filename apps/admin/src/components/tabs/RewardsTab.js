import React from 'react';
import EcosystemStatsTab from '../EcosystemStatsTab';

// Real counts from GET /admin/rewards/campaigns (see EcosystemStatsTab).
export default function RewardsTab({ API_BASE, authHeaders }) {
  return (
    <EcosystemStatsTab
      authHeaders={authHeaders}
      url={`${API_BASE}/admin/rewards/campaigns`}
      title="🎁 Earn & Rewards"
      subtitle="Referrals, loyalty wallets and pending reward redemptions."
    />
  );
}
