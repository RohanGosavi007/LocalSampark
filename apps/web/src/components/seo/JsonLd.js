import React from 'react';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.com';

/**
 * Returns raw Organization Schema object
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LocalSampark',
    alternateName: 'लोकल संपर्क',
    url: SITE_URL,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android',
    description: 'Hyperlocal marketplace connecting Dhanori & Pune residents with neighbourhood shops, local services, verified ratings, and lightning-fast delivery.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR'
    },
    author: {
      '@type': 'Organization',
      name: 'LocalSampark Technologies',
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+91-9876543210',
        contactType: 'customer service',
        areaServed: 'IN',
        availableLanguage: ['en', 'hi', 'mr']
      }
    },
    areaServed: {
      '@type': 'City',
      name: 'Pune',
      '@id': 'https://www.wikidata.org/wiki/Q1538'
    }
  };
}

/**
 * Returns raw LocalBusiness Schema object
 */
export function getLocalBusinessSchema(shop) {
  if (!shop) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: shop.name,
    image: shop.banner_url || shop.logo_url || `${SITE_URL}/og-image.jpg`,
    '@id': `${SITE_URL}/shop/${shop.slug || shop.id}`,
    url: `${SITE_URL}/shop/${shop.slug || shop.id}`,
    telephone: shop.phone || '+91-9876543210',
    priceRange: '₹₹',
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address || 'Dhanori',
      addressLocality: 'Pune',
      addressRegion: 'Maharashtra',
      postalCode: shop.pincode || '411015',
      addressCountry: 'IN'
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: Number(shop.latitude || 18.5857),
      longitude: Number(shop.longitude || 73.8913)
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
          'Sunday'
        ],
        opens: shop.opening_time || '08:00',
        closes: shop.closing_time || '22:00'
      }
    ],
    aggregateRating: shop.rating ? {
      '@type': 'AggregateRating',
      ratingValue: Number(shop.rating),
      reviewCount: Number(shop.review_count || 1)
    } : undefined
  };
}

/**
 * Returns raw Product Schema object
 */
export function getProductSchema(product, shop) {
  if (!product) return null;
  const price = Number(product.price || 0);
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.image_url ? [product.image_url] : [`${SITE_URL}/og-image.jpg`],
    description: product.description || `${product.name} available at ${shop?.name || 'Local Store'}`,
    sku: String(product.id || 'PROD'),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/shop/${shop?.slug || shop?.id || 'store'}#p-${product.id}`,
      priceCurrency: 'INR',
      price: price.toFixed(2),
      availability: Number(product.stock_quantity ?? 1) > 0
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      seller: {
        '@type': 'Organization',
        name: shop?.name || 'LocalSampark Verified Merchant'
      }
    }
  };
}

/**
 * Returns raw BreadcrumbList Schema object
 */
export function getBreadcrumbSchema(items = []) {
  if (!items || items.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`
    }))
  };
}

/**
 * Renders an Organization schema.org JSON-LD tag using React.createElement
 */
export function OrganizationJsonLd() {
  const schema = getOrganizationSchema();
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}

/**
 * Renders a LocalBusiness schema.org JSON-LD tag
 */
export function LocalBusinessJsonLd({ shop }) {
  const schema = getLocalBusinessSchema(shop);
  if (!schema) return null;
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}

/**
 * Renders a Product schema.org JSON-LD tag
 */
export function ProductJsonLd({ product, shop }) {
  const schema = getProductSchema(product, shop);
  if (!schema) return null;
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}

/**
 * Renders BreadcrumbList schema.org JSON-LD tag
 */
export function BreadcrumbJsonLd({ items = [] }) {
  const schema = getBreadcrumbSchema(items);
  if (!schema) return null;
  return React.createElement('script', {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(schema) }
  });
}
