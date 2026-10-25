/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.in',
  generateRobotsTxt: false, // We will use a custom static robots.txt
  exclude: ['/investor-demo', "/admin","/admin/*","/admin-dashboard","/admin-dashboard/*","/profile","/profile/*","/dashboard","/dashboard/*","/delivery-dashboard","/delivery-dashboard/*","/field-dashboard","/field-dashboard/*","/franchise-dashboard","/franchise-dashboard/*","/moderator-dashboard","/moderator-dashboard/*","/security-dashboard","/security-dashboard/*","/service-dashboard","/service-dashboard/*","/shop-dashboard","/shop-dashboard/*","/society-admin","/society-admin/*","/society-admin-dashboard","/society-admin-dashboard/*","/sos-dashboard","/sos-dashboard/*","/wallet","/wallet/*","/checkout","/checkout/*","/payouts","/payouts/*","/login","/login/*","/register","/register/*","/unauthorized","/unauthorized/*","/resident","/resident/*","/franchise","/franchise/*","/*/dashboard"], // private or account-only routes
  generateIndexSitemap: false,
};
