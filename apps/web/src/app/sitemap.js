export default async function sitemap() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.com';

  // Static core routes
  const staticRoutes = [
    '',
    '/about',
    '/search',
    '/login',
    '/townsquare',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date().toISOString(),
    changeFrequency: 'daily',
    priority: route === '' ? 1 : 0.8,
  }));

  try {
    // In production, fetch all public active shops to generate dynamic URLs
    // const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/shops`);
    // const shops = await res.json();
    
    const mockShops = [
      { slug: 'balaji-supermart', updated_at: new Date().toISOString() },
      { slug: 'green-leaf-veg', updated_at: new Date().toISOString() }
    ];

    const dynamicRoutes = mockShops.map((shop) => ({
      url: `${baseUrl}/shop/${shop.slug}`,
      lastModified: shop.updated_at,
      changeFrequency: 'hourly',
      priority: 0.9,
    }));

    return [...staticRoutes, ...dynamicRoutes];
  } catch (error) {
    console.error('Failed to generate sitemap', error);
    return staticRoutes;
  }
}
