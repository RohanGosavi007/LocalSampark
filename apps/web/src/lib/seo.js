/**
 * Site URL and schema.org builders for the web app (P7).
 *
 * One SITE_URL for metadata, canonicals, the sitemap, robots.txt and JSON-LD.
 * They used to default to two different domains (localsampark.in in the root
 * layout, localsampark.com in the sitemap, robots.txt and JsonLd.js), so a
 * build without NEXT_PUBLIC_SITE_URL advertised canonicals on one domain and
 * a sitemap on the other. Production is localsampark.in
 * (apps/web/.env.production.example).
 *
 * The builders emit only what the shop record actually holds. The earlier
 * JsonLd.js filled gaps with a placeholder phone number, invented opening
 * hours and default coordinates, which would have been published to search
 * engines as facts about real businesses.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://localsampark.in').replace(/\/+$/, '');

const clean = (obj) => {
  if (Array.isArray(obj)) return obj.map(clean).filter((v) => v !== undefined);
  if (obj && typeof obj === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      const c = clean(v);
      if (c !== undefined && c !== null && c !== '' && !(Array.isArray(c) && c.length === 0)) out[k] = c;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return obj;
};

const firstPhoto = (shop) => {
  let photos = shop.photo_urls;
  if (typeof photos === 'string') {
    try { photos = JSON.parse(photos); } catch { photos = [photos]; }
  }
  return Array.isArray(photos) && photos.length ? photos[0] : undefined;
};

export const shopUrl = (shop) => `${SITE_URL}/shops/${encodeURIComponent(shop.id)}`;

/** The platform itself, as the root layout describes it (a free web app). */
export function organizationSchema() {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'LocalSampark',
    alternateName: 'लोकल संपर्क',
    url: SITE_URL,
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'Web, Android',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'INR' },
    areaServed: { '@type': 'City', name: 'Pune' },
  });
}

/** LocalBusiness for a shop, with its catalogue as Product/Offer items. */
export function shopSchema(shop, products = []) {
  if (!shop) return null;
  const lat = Number(shop.latitude);
  const lng = Number(shop.longitude);
  const rating = Number(shop.rating);
  return clean({
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': shopUrl(shop),
    name: shop.name,
    description: shop.description,
    url: shopUrl(shop),
    image: firstPhoto(shop),
    telephone: shop.phone_number,
    address: {
      '@type': 'PostalAddress',
      streetAddress: shop.address,
      postalCode: shop.pincode,
      addressCountry: 'IN',
    },
    geo: Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0)
      ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lng }
      : undefined,
    aggregateRating: Number.isFinite(rating) && rating > 0 && Number(shop.review_count) > 0
      ? { '@type': 'AggregateRating', ratingValue: rating, reviewCount: Number(shop.review_count) }
      : undefined,
    hasOfferCatalog: products.length
      ? {
        '@type': 'OfferCatalog',
        name: `${shop.name} catalogue`,
        itemListElement: products.slice(0, 50).map((p) => productOffer(p, shop)),
      }
      : undefined,
  });
}

/** A catalogue item as schema.org Offer -> Product. */
export function productOffer(product, shop) {
  const price = Number(product.price);
  const listed = product.is_available === undefined || product.is_available === true || product.is_available === 1 || product.is_available === '1';
  const stock = product.stock_quantity ?? product.inventory_count;
  const inStock = listed && (stock === undefined || stock === null || Number(stock) > 0);
  return clean({
    '@type': 'Offer',
    price: Number.isFinite(price) ? price.toFixed(2) : undefined,
    priceCurrency: 'INR',
    availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: shop ? `${shopUrl(shop)}#product-${product.id}` : undefined,
    itemOffered: {
      '@type': 'Product',
      name: product.name,
      description: product.description,
      image: product.image_url,
      sku: product.sku,
      gtin13: product.barcode && /^\d{13}$/.test(String(product.barcode)) ? String(product.barcode) : undefined,
    },
    seller: shop ? { '@type': 'LocalBusiness', name: shop.name, '@id': shopUrl(shop) } : undefined,
  });
}

export function breadcrumbSchema(items) {
  return clean({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${SITE_URL}${path}`,
    })),
  });
}

/** Serialises JSON-LD for a <script> tag without letting data close the tag. */
export function jsonLdString(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
