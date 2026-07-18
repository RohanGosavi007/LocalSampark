export default function robots() {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/checkout/', '/shop-dashboard/', '/dashboard/'],
    },
    sitemap: 'https://localsampark.com/sitemap.xml',
  }
}
