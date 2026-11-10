// The dedicated admin console (apps/admin, port 3001 in development) owns the
// modules below. Their /admin-dashboard/* pages in this app were placeholder
// screens ("Module Provisioned", invented KPI cards), so they now send the
// admin to the console tab that has the real implementation.
//
// Shared by next.config.mjs (server-side redirects) and AdminConsoleRedirect
// (client fallback), so the two can never disagree.

export const ADMIN_CONSOLE_URL = (process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001').replace(/\/+$/, '');

/** /admin-dashboard/<key> -> admin console tab id (apps/admin/src/app/page.js navItems). */
export const ADMIN_CONSOLE_TABS = {
  'ai-analytics': 'ai-analytics',
  chef: 'chef',
  community: 'community',
  events: 'events',
  finance: 'revenue',
  'fleet-assets': 'delivery',
  fraud: 'audit',
  gtm: 'leads-crm',
  'leads-crm': 'leads-crm',
  logistics: 'delivery',
  payouts: 'revenue',
  properties: 'properties',
  revenue: 'revenue',
  rewards: 'rewards',
  saas: 'subscriptions',
  'skilled-dispatch': 'home-services',
  subscriptions: 'subscriptions',
  territory: 'territory',
};

export function adminConsoleUrl(moduleKey) {
  const tab = ADMIN_CONSOLE_TABS[moduleKey];
  return tab ? `${ADMIN_CONSOLE_URL}/?tab=${encodeURIComponent(tab)}` : `${ADMIN_CONSOLE_URL}/`;
}

/** Retired /franchise/<key> placeholders -> the wired franchise dashboard page. */
export const FRANCHISE_REDIRECTS = {
  dashboard: '/franchise-dashboard',
  revenue: '/franchise-dashboard/revenue',
  shops: '/franchise-dashboard/shops',
  approvals: '/franchise-dashboard/shops',
  providers: '/franchise-dashboard/shops',
  users: '/franchise-dashboard',
  agents: '/franchise-dashboard',
  posts: '/franchise-dashboard',
  settings: '/franchise-dashboard',
};
