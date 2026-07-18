/** @type {import('next-sitemap').IConfig} */
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.in',
  generateRobotsTxt: false, // We will use a custom static robots.txt
  exclude: ['/admin', '/admin/*', '/profile', '/profile/*'], // Do not index private routes
  generateIndexSitemap: false,
};
