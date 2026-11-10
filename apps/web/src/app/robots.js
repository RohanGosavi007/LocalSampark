import { SITE_URL } from '../lib/seo.js';

// One site URL with the sitemap and canonicals (it defaulted to .com here).
export default function robots() {
  const baseUrl = SITE_URL;

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/admin-dashboard/',
        '/shop-dashboard/',
        '/shop-manager/',
        '/delivery-dashboard/',
        '/society-admin/',
        '/society-admin-dashboard/',
        '/gatekeeper/',
        '/checkout/',
        '/wallet/',
        '/profile/',
        '/api/',
        // Carried over from the generated public/robots.txt that used to
        // shadow this file (F-145), so no private area becomes crawlable.
        '/dashboard/',
        '/field-dashboard/',
        '/franchise-dashboard/',
        '/moderator-dashboard/',
        '/security-dashboard/',
        '/service-dashboard/',
        '/sos-dashboard/',
        '/payouts/',
        '/login/',
        '/register/',
        '/unauthorized/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
