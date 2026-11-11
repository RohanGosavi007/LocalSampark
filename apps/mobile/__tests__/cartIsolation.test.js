/**
 * The app's cart, and keeping it in step with the server's (C6).
 *
 * Decision D6 is a multi-shop cart: one checkout, an order per shop. The cart
 * used to refuse a second shop's item ('different_shop'); these tests used to
 * pin that refusal and now pin the D6 behaviour (FINDINGS F-149).
 *
 * What still matters from the original concern: the device and the server
 * must agree. Cart state that diverges resurfaces at checkout as items the
 * customer never added. So every change is checked for what reaches the
 * server, with the line's full quantity (POST /cart sets it, it does not add).
 */

process.env.EXPO_PUBLIC_API_URL = 'http://test.local/api';

let useCartStore;
let AsyncStorage;

const productFrom = (shopId, overrides = {}) => ({
  id: overrides.id || `p-${shopId}`,
  name: overrides.name || 'Test Product',
  price: overrides.price ?? 100,
  shop_id: shopId,
  shop_name: overrides.shop_name || `Shop ${shopId}`,
  shop_category: 'grocery-supermarkets',
  ...overrides,
});

/**
 * Drains the pending async work.
 *
 * syncToBackend is fire-and-forget: addItem does not await it, and apiPost
 * awaits auth headers before it ever reaches fetch. One microtask tick is not
 * enough to see the call, so a test that checks fetch after `await
 * Promise.resolve()` reads the previous add's sync instead of this one's.
 */
const flush = () => new Promise((resolve) => setImmediate(resolve));

function jsonResponse(body) {
  return {
    ok: true,
    status: 200,
    headers: { get: (n) => (String(n).toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  jest.resetModules();
  global.fetch = jest.fn().mockResolvedValue(jsonResponse({ success: true }));

  AsyncStorage = require('./__mocks__/asyncStorage');
  AsyncStorage.__store.clear();

  ({ useCartStore } = require('../src/store/cartStore'));
  useCartStore.setState({ items: [], currentShopId: null, currentShopName: null });
});

describe('adding from one shop', () => {
  test('the first item sets the cart’s shop', () => {
    const result = useCartStore.getState().addItem(productFrom('shop-a'));

    expect(result.added).toBe(true);
    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.currentShopId).toBe('shop-a');
  });

  test('a second item from the same shop is added', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }));
    const result = useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-2' }));

    expect(result.added).toBe(true);
    expect(useCartStore.getState().items).toHaveLength(2);
  });

  test('re-adding the same product increments rather than duplicating', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 2);
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 3);

    const items = useCartStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].quantity).toBe(5);
  });

  test('the same product with different options is a separate line', () => {
    // A large coffee and a small coffee are not the same cart line.
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 1, { size: 'S' });
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 1, { size: 'L' });

    expect(useCartStore.getState().items).toHaveLength(2);
  });
});

/** The JSON body of the last POST /cart call. */
const lastCartPost = () => {
  const calls = global.fetch.mock.calls.filter(([url, init]) => String(url).endsWith('/cart') && init && init.method === 'POST');
  const last = calls[calls.length - 1];
  return last ? JSON.parse(last[1].body) : null;
};

describe('adding from a different shop (D6)', () => {
  test('[C6.13] is accepted beside the first shop, and the cart groups by shop', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1', shop_name: 'Anand Kirana' }));

    const result = useCartStore.getState().addItem(productFrom('shop-b', { id: 'p-2', shop_name: 'Bharat Medical' }));

    expect(result.added).toBe(true);
    const state = useCartStore.getState();
    expect(state.items.map((i) => i.id)).toEqual(['p-1', 'p-2']);
    expect(state.shopGroups().map((g) => g.shopName)).toEqual(['Anand Kirana', 'Bharat Medical']);
  });

  test('[C6.14] what reaches the server is the line\'s full quantity, for every shop', async () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 2);
    await flush();
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 1);
    await flush();
    // POST /cart sets the quantity; sending the 1 just added left the server at 1.
    expect(lastCartPost()).toMatchObject({ productId: 'p-1', quantity: 3 });

    useCartStore.getState().addItem(productFrom('shop-b', { id: 'p-2' }));
    await flush();
    expect(lastCartPost()).toMatchObject({ productId: 'p-2', quantity: 1 });
  });

  test('[C6.15] a stock refusal sets the line to what the shop can supply, and says so', async () => {
    global.fetch.mockImplementation(async (url, init) => {
      const body = init && init.body ? JSON.parse(init.body) : {};
      if (String(url).endsWith('/cart') && init.method === 'POST' && body.quantity > 2) {
        return { ...jsonResponse({ error: 'Insufficient inventory', available: 2 }), ok: false, status: 400 };
      }
      return jsonResponse({ success: true });
    });

    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1', name: 'Rice' }), 5);
    await flush();
    await flush();

    const state = useCartStore.getState();
    expect(state.items[0].quantity).toBe(2);
    expect(state.notices).toEqual([{ type: 'stock', name: 'Rice', available: 2 }]);
    expect(lastCartPost()).toMatchObject({ productId: 'p-1', quantity: 2 });
  });

  test('[C6.16] clearing the cart empties the server copy too', async () => {
    useCartStore.getState().addItem(productFrom('shop-a'));
    useCartStore.getState().addItem(productFrom('shop-b'));
    await flush();
    global.fetch.mockClear();

    useCartStore.getState().clearCart();
    await flush();

    expect(useCartStore.getState().items).toEqual([]);
    const [url, init] = global.fetch.mock.calls[0];
    expect(String(url)).toMatch(/\/cart$/);
    expect(init.method).toBe('DELETE');
  });
});

describe('the server cart follows the customer', () => {
  const serverLine = (id, shop, quantity, extra = {}) => ({
    id: `row-${id}`, quantity, price: 100, availableStock: 10, isOutOfStock: false, customOptions: null,
    product: { id, name: `Product ${id}`, price: 100, imageUrl: null, shop: { id: shop, name: `Shop ${shop}`, category: 'Grocery' } },
    ...extra,
  });

  test('[C6.17] on sign-in the guest cart is merged, then the customer’s whole cart is pulled', async () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }));
    // Added offline: never reached the server.
    useCartStore.setState((st) => ({ items: [...st.items, { ...productFrom('shop-c', { id: 'p-7' }), quantity: 2, options: {} }] }));
    await flush();
    const calls = [];
    global.fetch.mockImplementation(async (url, init = {}) => {
      calls.push(`${init.method || 'GET'} ${String(url).replace(/^.*\/api(\/v1)?/, '')}`);
      if (String(url).endsWith('/cart') && (init.method || 'GET') === 'GET') {
        // p-9 was added on the web earlier; p-1 came across in the merge.
        return jsonResponse({ cartItems: [serverLine('p-1', 'shop-a', 1), serverLine('p-9', 'shop-b', 2)] });
      }
      return jsonResponse({ success: true, mergedCount: 1 });
    });

    await expect(useCartStore.getState().mergeAfterLogin()).resolves.toBe(true);

    expect(calls).toEqual(['POST /cart/merge', 'GET /cart', 'POST /cart']);
    expect(lastCartPost()).toMatchObject({ productId: 'p-7', quantity: 2 });
    const state = useCartStore.getState();
    expect(state.items.map((i) => [i.id, i.quantity, i.shop_id])).toEqual([['p-1', 1, 'shop-a'], ['p-9', 2, 'shop-b'], ['p-7', 2, 'shop-c']]);
    expect(state.signedIn).toBe(true);

    // Run again (an interrupted sign-in resumes): nothing is added twice.
    calls.length = 0;
    global.fetch.mockImplementation(async (url, init = {}) => {
      calls.push(`${init.method || 'GET'} ${String(url).replace(/^.*\/api(\/v1)?/, '')}`);
      return String(url).endsWith('/cart') && (init.method || 'GET') === 'GET'
        ? jsonResponse({ cartItems: [serverLine('p-1', 'shop-a', 1), serverLine('p-9', 'shop-b', 2), serverLine('p-7', 'shop-c', 2)] })
        : jsonResponse({ success: true, mergedCount: 0 });
    });
    await useCartStore.getState().mergeAfterLogin();
    expect(calls).toEqual(['POST /cart/merge', 'GET /cart']);
    expect(useCartStore.getState().items.map((i) => [i.id, i.quantity])).toEqual([['p-1', 1], ['p-9', 2], ['p-7', 2]]);
  });

  test('[C6.18] a pull reports a new price and a shortage, and signing out clears the device copy', async () => {
    useCartStore.setState({ items: [{ ...productFrom('shop-a', { id: 'p-1', name: 'Product p-1', price: 90 }), quantity: 3, options: {} }] });
    global.fetch.mockResolvedValue(jsonResponse({
      cartItems: [serverLine('p-1', 'shop-a', 3, { price: 100, availableStock: 1, isOutOfStock: true })],
    }));

    await useCartStore.getState().pullFromServer();

    const state = useCartStore.getState();
    expect(state.items[0]).toMatchObject({ price: 100, isOutOfStock: true, availableStock: 1 });
    expect(state.notices.map((n) => n.type).sort()).toEqual(['price', 'stock']);

    const before = state.sessionId;
    useCartStore.getState().resetForLogout();
    expect(useCartStore.getState().items).toEqual([]);
    expect(useCartStore.getState().signedIn).toBe(false);
    expect(useCartStore.getState().sessionId).not.toBe(before);
  });
});

describe('totals', () => {
  test('sums price by quantity', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1', price: 250 }), 2);
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-2', price: 99.5 }), 1);

    expect(useCartStore.getState().getCartTotal()).toBeCloseTo(599.5, 2);
  });

  test('counts items by quantity, not by line', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }), 3);
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-2' }), 2);

    expect(useCartStore.getState().getItemCount()).toBe(5);
  });

  test('an empty cart totals zero rather than NaN', () => {
    expect(useCartStore.getState().getCartTotal()).toBe(0);
    expect(useCartStore.getState().getItemCount()).toBe(0);
  });
});
