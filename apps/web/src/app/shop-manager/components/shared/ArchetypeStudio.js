'use client';
import React, { useState } from 'react';

import UnifiedCatalogueManager from './UnifiedCatalogueManager';
import AppointmentManagementPanel from './AppointmentManagementPanel';
import OrderManagementPanel from './OrderManagementPanel';
import ShopStaffManager from './ShopStaffManager';
import ShopAnalyticsManager from './ShopAnalyticsManager';
import ShopSettingsManager from './ShopSettingsManager';
import ShopReviewsManager from './ShopReviewsManager';

/**
 * Seller Studio shell for the non-retail archetypes (salon, clinic, tutor,
 * tailor, tiffin, home-visit, consultant, events).
 *
 * Each archetype used to ship its own screens with hard-coded sample rows —
 * invented courses, fabric stock, membership tiers, rate cards — and
 * "coming soon" placeholder tabs. A merchant could not tell their data from
 * the samples, and nothing they did there was saved. Every tab now renders one
 * of the shared panels, which read and write the real shop APIs:
 *
 *   catalogue    UnifiedCatalogueManager     /shops/:id/products (services and items)
 *   bookings     AppointmentManagementPanel  /shops/my-shop/appointments
 *   orders       OrderManagementPanel        /shops/my-shop/orders
 *   staff        ShopStaffManager            /shops/my-shop/staff
 *   analytics    ShopAnalyticsManager        shop analytics from real orders
 *   reviews      ShopReviewsManager          shop reviews and replies
 *   settings     ShopSettingsManager         /shops/:id/settings
 *
 * `tabs` is a list of { id, label, icon, panel } where `panel` is one of the
 * keys above.
 */
const PANELS = {
  catalogue: UnifiedCatalogueManager,
  bookings: AppointmentManagementPanel,
  orders: OrderManagementPanel,
  staff: ShopStaffManager,
  analytics: ShopAnalyticsManager,
  reviews: ShopReviewsManager,
  settings: ShopSettingsManager,
};

export default function ArchetypeStudio({ token, shopId, tabs, accent = '#6366f1', accentTo }) {
  const [active, setActive] = useState(tabs[0] && tabs[0].id);
  const current = tabs.find((t) => t.id === active) || tabs[0];
  const Panel = current ? PANELS[current.panel] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div
        role="tablist"
        style={{
          display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px',
          background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {tabs.map((tab) => {
          const isActive = current && current.id === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? `linear-gradient(135deg, ${accent}, ${accentTo || accent})` : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}
            >
              {Icon ? <Icon size={16} /> : null} {tab.label}
            </button>
          );
        })}
      </div>

      {Panel ? <Panel token={token} shopId={shopId} /> : null}
    </div>
  );
}
