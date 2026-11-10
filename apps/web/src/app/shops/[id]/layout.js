/**
 * Server-rendered metadata and structured data for a shop page (P7).
 *
 * The page itself is a client component, so it could not export metadata:
 * every shop shared the site-wide title and description, and declared the
 * homepage as its canonical URL. This layout renders on the server, so
 * crawlers and link previews get the shop's own title, description, Open
 * Graph image, canonical URL and JSON-LD (LocalBusiness with its catalogue
 * as Product/Offer, plus breadcrumbs) without running any JavaScript.
 */
import { API_BASE } from '../../../lib/apiUrl.js';
import { SITE_URL, shopSchema, breadcrumbSchema, jsonLdString } from '../../../lib/seo.js';

async function getJson(path) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch(`${API_BASE}${path}`, { signal: controller.signal, next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadShop(id) {
  const [shop, products] = await Promise.all([
    getJson(`/shops/${encodeURIComponent(id)}`),
    getJson(`/shops/${encodeURIComponent(id)}/products`),
  ]);
  const list = Array.isArray(products) ? products : (products && Array.isArray(products.data) ? products.data : []);
  return { shop: shop && shop.id ? shop : null, products: list };
}

const photoOf = (shop) => {
  let photos = shop.photo_urls;
  if (typeof photos === 'string') {
    try { photos = JSON.parse(photos); } catch { photos = [photos]; }
  }
  return Array.isArray(photos) && photos.length ? photos[0] : null;
};

export async function generateMetadata({ params }) {
  const { id } = await params;
  const canonical = `/shops/${encodeURIComponent(id)}`;
  const { shop } = await loadShop(id);
  if (!shop) {
    return { title: 'Shop not found | LocalSampark', alternates: { canonical }, robots: { index: false, follow: true } };
  }
  const where = [shop.address, shop.pincode].filter(Boolean).join(', ');
  const description = (shop.description || `${shop.name}${shop.category ? `, ${shop.category}` : ''} on LocalSampark`)
    .concat(where ? ` — ${where}` : '')
    .slice(0, 160);
  const image = photoOf(shop);
  return {
    title: `${shop.name}${shop.category ? ` · ${shop.category}` : ''} | LocalSampark`,
    description,
    alternates: { canonical },
    openGraph: {
      type: 'website',
      url: `${SITE_URL}${canonical}`,
      title: shop.name,
      description,
      siteName: 'LocalSampark',
      locale: 'en_IN',
      ...(image ? { images: [{ url: image, alt: shop.name }] } : {}),
    },
    twitter: { card: image ? 'summary_large_image' : 'summary', title: shop.name, description },
  };
}

export default async function ShopLayout({ children, params }) {
  const { id } = await params;
  const { shop, products } = await loadShop(id);
  const graph = shop
    ? [
      shopSchema(shop, products),
      breadcrumbSchema([['Home', '/'], ['Shops', '/shops'], [shop.name, `/shops/${encodeURIComponent(shop.id)}`]]),
    ]
    : [];
  return (
    <>
      {graph.map((data, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdString(data) }} />
      ))}
      {children}
    </>
  );
}
