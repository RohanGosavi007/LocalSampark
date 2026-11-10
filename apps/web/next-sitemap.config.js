// Modules that are off at launch are served as /coming-soon by src/middleware.js
// (prefix -> feature key mirrors src/lib/featureRoutes.mjs). Their URLs stay
// out of the sitemap until the module is switched on with
// NEXT_PUBLIC_ENABLED_FEATURES.
const GATED = {
  krishi: ['/krishi'], carpool: ['/carpool'], jobs: ['/jobs'], properties: ['/properties', '/real-estate'],
  medical: ['/medical', '/health'], emergency_sos: ['/sos-dashboard'], scrap: ['/scrap'], chef: ['/chef'],
  equipment_rental: ['/equipment'], community_events: ['/events'], townsquare: ['/townsquare'],
  donations_volunteer: ['/donations', '/volunteer'], pets: ['/pets'], premium_saas: ['/premium', '/subscriptions'],
  wallet_coins: ['/wallet', '/earn', '/rewards'],
  society_management: ['/society', '/society-admin', '/society-admin-dashboard', '/society-registration', '/resident', '/gatekeeper', '/security-dashboard'],
};
const enabled = new Set((process.env.NEXT_PUBLIC_ENABLED_FEATURES || '').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean));
const gatedExcludes = Object.entries(GATED)
  .filter(([key]) => !enabled.has(key))
  .flatMap(([, prefixes]) => prefixes.flatMap((p) => [p, `${p}/*`]));

/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.in',
  generateRobotsTxt: false, // We will use a custom static robots.txt
  exclude: ['/investor-demo', "/admin","/admin/*","/admin-dashboard","/admin-dashboard/*","/profile","/profile/*","/dashboard","/dashboard/*","/delivery-dashboard","/delivery-dashboard/*","/field-dashboard","/field-dashboard/*","/franchise-dashboard","/franchise-dashboard/*","/moderator-dashboard","/moderator-dashboard/*","/security-dashboard","/security-dashboard/*","/service-dashboard","/service-dashboard/*","/shop-dashboard","/shop-dashboard/*","/society-admin","/society-admin/*","/society-admin-dashboard","/society-admin-dashboard/*","/sos-dashboard","/sos-dashboard/*","/wallet","/wallet/*","/checkout","/checkout/*","/payouts","/payouts/*","/login","/login/*","/register","/register/*","/unauthorized","/unauthorized/*","/resident","/resident/*","/franchise","/franchise/*","/*/dashboard", "/coming-soon", ...gatedExcludes], // private or account-only routes
  generateIndexSitemap: false,
};
