/**
 * C4 and C12 in the app: the product screen's rules (variant price, stock,
 * quantity limit, the cart line it adds) and the wishlist / recently viewed.
 */
const fs = require('fs');
const path = require('path');
const {
  loadProduct, offer, cartLine, clampQuantity, listWishlist, saveProduct, unsaveProduct, moveToCart,
  readRecent, recordView, clearRecent, RECENT_MAX,
} = require('../src/services/product');

const PRODUCT = {
  id: 'p1', shopId: 's1', name: 'Cotton T-shirt', price: 400, mrp: 500, discountPercent: 20, inStock: true,
  maxQuantity: 5, quantityLimit: 5, images: ['https://img.example/t.jpg'],
  seller: { name: 'Knit Shop', category: 'Clothing' },
  variants: [
    { id: 'v-s', name: 'Size', value: 'S', price: 400, discountPercent: 20, inStock: false, maxQuantity: 0 },
    { id: 'v-l', name: 'Size', value: 'L', price: 450, discountPercent: 10, inStock: true, maxQuantity: 2 },
  ],
};

function memory() {
  const m = new Map();
  return {
    getItem: async (k) => (m.has(k) ? m.get(k) : null),
    setItem: async (k, v) => { m.set(k, String(v)); },
    removeItem: async (k) => { m.delete(k); },
  };
}

test('[C4.8] the screen asks the server for the product page, and offers what the chosen variant allows', async () => {
  const apiGet = jest.fn().mockResolvedValue({ success: true, product: PRODUCT });
  await expect(loadProduct('s 1', 'p/1', { apiGet })).resolves.toBe(PRODUCT);
  expect(apiGet).toHaveBeenCalledWith('/shops/s%201/products/p%2F1');
  await expect(loadProduct('s1', 'p1', { apiGet: jest.fn().mockResolvedValue({}) })).rejects.toThrow(/not available/);

  expect(offer(PRODUCT, null)).toMatchObject({ mustChoose: true });
  expect(offer(PRODUCT, PRODUCT.variants[1])).toMatchObject({ price: 450, discountPercent: 10, maxQuantity: 2, mustChoose: false });
  expect(offer({ ...PRODUCT, variants: [] }, null)).toMatchObject({ price: 400, maxQuantity: 5, mustChoose: false });
  expect(clampQuantity(9, 2)).toBe(2);
  expect(clampQuantity(0, 2)).toBe(1);
  expect(clampQuantity(7, null)).toBe(7);
});

test('[C4.9] the cart line carries the variant, so checkout prices and stocks it as that variant', () => {
  const { product, options } = cartLine(PRODUCT, PRODUCT.variants[1]);
  expect(product).toMatchObject({ id: 'p1', name: 'Cotton T-shirt (L)', price: 450, shop_id: 's1', shop_name: 'Knit Shop' });
  expect(options).toEqual({ variantId: 'v-l', Size: 'L' });
  expect(cartLine({ ...PRODUCT, variants: [] }, null).options).toEqual({});
  // The cart rules send it with the line (src/lib/cartModel.js).
  const { orderLines, batchLines } = require('../src/lib/cartModel');
  expect(orderLines([{ id: 'p1', quantity: 2, options }])).toEqual([{ productId: 'p1', quantity: 2, variantId: 'v-l' }]);
  expect(batchLines([{ id: 'p1', shop_id: 's1', quantity: 2, options }])).toEqual([{ shop_id: 's1', product_id: 'p1', quantity: 2, variantId: 'v-l' }]);
});

test('[C4.10] the product screen shows every declaration, says when one is missing, and is reachable from the shop', () => {
  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'product', '[shopId]', '[productId].js'), 'utf8');
  for (const key of ['genericName', 'netQuantity', 'manufacturer', 'countryOfOrigin', 'bestBefore', 'consumerCare']) {
    expect(screen).toContain(`'${key}'`);
  }
  expect(screen).toMatch(/Not provided by the seller/);
  expect(screen).toMatch(/fssaiLicence/);
  expect(screen).toMatch(/recordView\(p\)/);
  const shop = fs.readFileSync(path.join(__dirname, '..', 'app', 'modules', 'shop', '[id].js'), 'utf8');
  expect(shop).toMatch(/router\.push\(`\/product\//);
  expect(shop).not.toMatch(/different_shop/);
});

test('[C12.9] the wishlist is the server\'s: listed, saved, removed and moved to the cart', async () => {
  const apiGet = jest.fn().mockResolvedValue({ success: true, items: [{ productId: 'p1' }] });
  await expect(listWishlist({ apiGet })).resolves.toEqual([{ productId: 'p1' }]);
  expect(apiGet).toHaveBeenCalledWith('/wishlist');
  const apiPost = jest.fn().mockResolvedValue({ success: true });
  const apiDelete = jest.fn().mockResolvedValue({ success: true });
  await saveProduct('p1', { apiPost });
  await moveToCart('p1', { apiPost });
  await unsaveProduct('p1', { apiDelete });
  expect(apiPost.mock.calls.map((c) => c[0])).toEqual(['/wishlist/p1', '/wishlist/p1/move-to-cart']);
  expect(apiDelete).toHaveBeenCalledWith('/wishlist/p1');
  const screen = fs.readFileSync(path.join(__dirname, '..', 'app', 'wishlist', 'index.js'), 'utf8');
  expect(screen).toMatch(/pullFromServer\(\)/);
});

test('[C12.10] recently viewed keeps the newest first, one entry per product, at most 20', async () => {
  const store = memory();
  await recordView({ ...PRODUCT, id: 'a' }, store, 1);
  await recordView({ ...PRODUCT, id: 'b' }, store, 2);
  await recordView({ ...PRODUCT, id: 'a', price: 999 }, store, 3);
  expect((await readRecent(store)).map((p) => [p.productId, p.price])).toEqual([['a', 999], ['b', 400]]);
  for (let i = 0; i < 30; i++) await recordView({ ...PRODUCT, id: `p${i}` }, store, 10 + i);
  const list = await readRecent(store);
  expect(list).toHaveLength(RECENT_MAX);
  expect(list[0].productId).toBe('p29');
  await expect(clearRecent(store)).resolves.toEqual([]);
  expect(await readRecent(store)).toEqual([]);
});
