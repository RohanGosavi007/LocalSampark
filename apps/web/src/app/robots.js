export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.com';

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
        '/api/'
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
