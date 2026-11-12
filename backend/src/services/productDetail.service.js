/**
 * The product page (C4): everything a customer is owed before buying one
 * product, from the catalogue and nothing else.
 *
 *   gallery        the main photo and any further photos the seller added
 *   variants       size / weight / colour, each with its own price and stock
 *   price          price, MRP and the discount between them; the most of it one
 *                  order may hold (the seller's limit, and what is in stock)
 *   seller         who sells it: the shop's name and address, and its FSSAI
 *                  licence number when it is a food business
 *   returns        the return window the returns process applies to this shop
 *   legal          the Legal Metrology declarations; any the seller has not
 *                  given are listed as missing rather than filled in
 *   reviews        reviews of the shop, each marked verified only when its
 *                  author has a delivered order from the shop
 */
const { queryOne, queryMany } = require('../config/database');
const rules = require('./catalogRules');

class ProductNotFound extends Error {
  constructor() {
    super('Product not found');
    this.status = 404;
    this.code = 'PRODUCT_NOT_FOUND';
  }
}

const LEGAL_FIELDS = [
  ['genericName', 'generic_name', 'Common or generic name'],
  ['netQuantity', 'net_quantity', 'Net quantity'],
  ['manufacturer', 'manufacturer_details', 'Manufacturer / packer / importer'],
  ['countryOfOrigin', 'country_of_origin', 'Country of origin'],
  ['bestBefore', 'best_before', 'Best before'],
  ['consumerCare', 'consumer_care', 'Consumer care'],
];

const text = (v) => (v === null || v === undefined ? '' : String(v).trim());
const listed = (v) => !(v === 0 || v === '0' || v === false || v === 'false');

function gallery(product) {
  const urls = [];
  if (product.image_url) urls.push(String(product.image_url));
  let more = product.gallery_urls;
  if (typeof more === 'string') {
    try { more = JSON.parse(more); } catch { more = more.split(/\s*,\s*/); }
  }
  for (const u of Array.isArray(more) ? more : []) {
    const url = text(u);
    if (/^https?:\/\//i.test(url) && !urls.includes(url)) urls.push(url);
  }
  return urls;
}

async function getProductDetail(shopId, productId) {
  const product = await queryOne(
    'SELECT * FROM shop_products WHERE CAST(id AS TEXT) = $1 AND CAST(shop_id AS TEXT) = $2',
    [String(productId), String(shopId)]
  );
  if (!product || !listed(product.is_available) || (product.is_active !== undefined && product.is_active !== null && !listed(product.is_active))) {
    throw new ProductNotFound();
  }
  const shop = await queryOne('SELECT * FROM local_shops WHERE CAST(id AS TEXT) = $1', [String(shopId)]);
  if (!shop) throw new ProductNotFound();

  const price = Number(product.price) || 0;
  const mrp = Number(product.mrp) > 0 ? Number(product.mrp) : null;
  const tracked = Number(product.track_inventory) === 1 || product.track_inventory === true;
  const stock = Number(product.inventory_count ?? product.stock_quantity ?? 0);
  const limit = rules.quantityLimit(product);

  const variants = (await queryMany(
    'SELECT * FROM product_variants WHERE CAST(product_id AS TEXT) = $1 ORDER BY created_at ASC',
    [String(product.id)]
  )).map((v) => {
    const vPrice = Math.round((price + (Number(v.price_modifier) || 0)) * 100) / 100;
    const vStock = Number(v.inventory_count ?? 0);
    return {
      id: v.id,
      name: v.variant_name,
      value: v.variant_value,
      price: vPrice,
      mrp,
      discountPercent: rules.discountPercent(vPrice, mrp),
      inStock: !tracked || vStock > 0,
      maxQuantity: tracked ? Math.max(0, Math.min(vStock, limit || vStock)) : limit,
    };
  });

  const legal = {};
  const missing = [];
  for (const [key, col, label] of LEGAL_FIELDS) {
    const value = text(product[col]);
    legal[key] = value || null;
    if (!value) missing.push(label);
  }

  const food = rules.isFoodBusiness(shop.category);
  const windowHours = rules.returnWindowHours(shop.category);

  // Verified: the author has a delivered order from this shop.
  const reviews = (await queryMany(
    `SELECT sr.id, sr.rating, COALESCE(sr.review_text, sr.comment) AS text, sr.reply, sr.created_at,
            sr.user_id, u.full_name,
            (SELECT COUNT(*) FROM orders o WHERE o.user_id = sr.user_id AND o.shop_id = sr.shop_id
                AND COALESCE(o.order_status, o.status) = 'delivered') AS delivered_orders
       FROM shop_reviews sr
       LEFT JOIN users u ON u.id = sr.user_id
      WHERE CAST(sr.shop_id AS TEXT) = $1
      ORDER BY sr.created_at DESC
      LIMIT 20`,
    [String(shop.id)]
  )).map((r) => ({
    id: r.id,
    rating: Number(r.rating) || 0,
    text: r.text || '',
    reply: r.reply || null,
    author: r.full_name ? `${String(r.full_name).trim().split(/\s+/)[0]}` : 'Customer',
    verifiedPurchase: Number(r.delivered_orders) > 0,
    createdAt: r.created_at,
  }));
  const verified = reviews.filter((r) => r.verifiedPurchase);

  return {
    id: product.id,
    shopId: shop.id,
    name: product.name,
    description: product.description || '',
    unit: product.unit || null,
    images: gallery(product),
    price,
    mrp,
    discountPercent: rules.discountPercent(price, mrp),
    inStock: !tracked || stock > 0,
    maxQuantity: tracked ? Math.max(0, Math.min(stock, limit || stock)) : limit,
    quantityLimit: limit,
    variants,
    seller: {
      id: shop.id,
      name: shop.name,
      address: shop.address || null,
      category: shop.category || null,
      // Shown for a food business; null when it has not given one.
      fssaiLicence: food ? (text(shop.fssai_license_number) || null) : undefined,
      foodBusiness: food,
    },
    returns: {
      windowHours,
      summary: windowHours === 48
        ? 'Returns within 48 hours of delivery, for a wrong, damaged or spoiled item.'
        : 'Returns within 7 days of delivery.',
    },
    legal,
    legalMissing: missing,
    reviews: {
      averageRating: verified.length ? Math.round((verified.reduce((s, r) => s + r.rating, 0) / verified.length) * 10) / 10 : null,
      verifiedCount: verified.length,
      items: reviews,
    },
  };
}

module.exports = { getProductDetail, ProductNotFound, LEGAL_FIELDS };
