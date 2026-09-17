/**
 * Cart multi-shop isolation.
 *
 * An order goes to one shop, so the cart holds one shop's items. The guard for
 * that existed and worked — but it failed in a way nobody could see:
 *
 *  - `addItem` returned nothing, so a caller could not tell a refusal from a
 *    success. The customer tapped Add, nothing appeared, and nothing said why.
 *  - The backend sync at the end of `addItem` ran regardless of whether the
 *    item had been accepted, so the server cart received an item the local cart
 *    had just rejected. The two carts then disagreed, and the one the customer
 *    could see was the one that was wrong.
 *
 * The second is the one that matters: cart state that diverges between device
 * and server resurfaces at checkout as items the customer never added.
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

describe('adding from a different shop', () => {
  test('is refused, and says which shop is blocking', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { shop_name: 'Anand Kirana' }));

    const result = useCartStore.getState().addItem(productFrom('shop-b'));

    expect(result.added).toBe(false);
    expect(result.reason).toBe('different_shop');
    // The caller needs the name to explain the refusal to the customer.
    expect(result.currentShopName).toBe('Anand Kirana');
  });

  test('leaves the existing cart untouched', () => {
    useCartStore.getState().addItem(productFrom('shop-a', { id: 'p-1' }));
    useCartStore.getState().addItem(productFrom('shop-b', { id: 'p-2' }));

    const state = useCartStore.getState();
    expect(state.items).toHaveLength(1);
    expect(state.items[0].id).toBe('p-1');
    expect(state.currentShopId).toBe('shop-a');
  });

  test('does not reach the server', async () => {
    useCartStore.getState().addItem(productFrom('shop-a'));
    await flush();
    global.fetch.mockClear();

    useCartStore.getState().addItem(productFrom('shop-b'));
    await flush();

    // The defect: the rejected item was posted to the server cart anyway, so
    // the device and the server disagreed about what the customer had chosen.
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('an accepted item does reach the server', async () => {
    useCartStore.getState().addItem(productFrom('shop-a'));
    await flush();

    expect(global.fetch).toHaveBeenCalled();
  });

  test('clearing the cart releases the shop lock', () => {
    useCartStore.getState().addItem(productFrom('shop-a'));
    useCartStore.getState().clearCart();

    // The "clear and add" path the shop screen offers.
    const result = useCartStore.getState().addItem(productFrom('shop-b'));
    expect(result.added).toBe(true);
    expect(useCartStore.getState().currentShopId).toBe('shop-b');
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
