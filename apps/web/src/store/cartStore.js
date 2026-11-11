import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_URL, getAuthHeaders } from '../lib/api';
import { addLine, sameLine, groupByShop, reconcile } from '../lib/cartModel';

/**
 * The web cart (C6).
 *
 * What was wrong with it:
 *   - adding an item from a second shop offered to throw the first shop's
 *     items away. Decision D6 is a multi-shop cart with one checkout;
 *   - every change was posted to the server with the anonymous session id
 *     only, never the customer's token, so the server cart was never the
 *     customer's: it did not follow them to the app or another browser, and
 *     the guest cart was never merged in on sign-in;
 *   - the server's answer was ignored. "Insufficient inventory" left the
 *     quantity on screen that the shop could not supply;
 *   - emptying the cart after an order left the server copy behind.
 *
 * Now the server cart (GET /cart) is the truth once the customer is signed in.
 * components/CartSync.js pulls it on sign-in and page load and merges the guest
 * cart in; each change is posted with the token and the session id, and a
 * refusal puts the line back to what the shop can supply.
 */

const generateSessionId = () =>
  'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const headersFor = (sessionId) => ({ ...getAuthHeaders(), 'X-Session-Id': sessionId });

/** The shop the cart most recently added from: used for theming and labels. */
const shopOf = (items) => {
  const last = items[items.length - 1];
  return last
    ? { currentShopId: last.shop_id ?? null, currentShopName: last.shop_name || null, currentShopCategory: last.shop_category || null }
    : { currentShopId: null, currentShopName: null, currentShopCategory: null };
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      currentShopId: null,
      currentShopName: null,
      currentShopCategory: null,
      sessionId: generateSessionId(),
      // Whether this cart is the signed-in customer's (merged) or still a guest's.
      signedIn: false,
      // What changed when the cart was last checked against the server.
      notices: [],

      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      dismissNotices: () => set({ notices: [] }),

      /**
       * Sets one line's quantity on the server (0 removes it). On a refusal
       * for stock, the local line is set to what is available.
       */
      syncToBackend: async (productId, quantity, customOptions = {}) => {
        try {
          const res = await fetch(`${API_URL}/api/v1/cart`, {
            method: 'POST',
            headers: headersFor(get().sessionId),
            body: JSON.stringify({ sessionId: get().sessionId, productId, quantity, customOptions }),
          });
          if (res.status === 400) {
            const body = await res.json().catch(() => ({}));
            if (body && body.available !== undefined) {
              const available = Math.max(0, Number(body.available) || 0);
              const line = get().items.find((i) => sameLine(i, { id: productId, options: customOptions }));
              const name = line ? line.name : 'An item';
              if (available > 0) {
                await get().syncToBackend(productId, available, customOptions);
              }
              set((state) => {
                const items = available > 0
                  ? state.items.map((i) => (sameLine(i, { id: productId, options: customOptions }) ? { ...i, quantity: available } : i))
                  : state.items.filter((i) => !sameLine(i, { id: productId, options: customOptions }));
                return {
                  items,
                  ...shopOf(items),
                  notices: [...state.notices, available > 0
                    ? { type: 'stock', name, available }
                    : { type: 'stock', name, available: 0 }],
                };
              });
            }
          }
        } catch (e) {
          console.error('Failed to sync cart to backend', e);
        }
      },

      /** Adds an item. Items from different shops sit side by side (D6). */
      addItem: (product, quantity = 1, customOptions = {}) => {
        const items = addLine(get().items, product, quantity, customOptions);
        set({ items, ...shopOf(items), isOpen: true });
        const line = items.find((i) => sameLine(i, { id: product.id, options: customOptions }));
        if (line) get().syncToBackend(product.id, line.quantity, customOptions);
      },

      removeItem: (productId, options = null) => {
        const removed = get().items.filter((i) =>
          options !== null ? sameLine(i, { id: productId, options }) : String(i.id) === String(productId));
        const items = get().items.filter((i) => !removed.includes(i));
        set({ items, ...shopOf(items) });
        for (const line of removed) get().syncToBackend(line.id, 0, line.options || {});
      },

      updateQuantity: (productId, quantity, options = null) => {
        const newQty = Math.max(0, Math.floor(Number(quantity) || 0));
        if (newQty === 0) {
          get().removeItem(productId, options);
          return;
        }
        const matches = (i) => (options !== null ? sameLine(i, { id: productId, options }) : String(i.id) === String(productId));
        set((state) => ({ items: state.items.map((i) => (matches(i) ? { ...i, quantity: newQty } : i)) }));
        for (const line of get().items.filter(matches)) get().syncToBackend(line.id, newQty, line.options || {});
      },

      /** Empties the cart here and on the server (after an order, or by choice). */
      clearCart: () => {
        const { sessionId } = get();
        set({ items: [], notices: [], ...shopOf([]) });
        fetch(`${API_URL}/api/v1/cart`, { method: 'DELETE', headers: headersFor(sessionId) }).catch(() => {});
      },

      /**
       * Replaces the local cart with the server's (signed in) and records what
       * changed: a new price, an item out of stock, a line the server dropped.
       * Returns false when the server could not be asked.
       */
      pullFromServer: async () => {
        try {
          const res = await fetch(`${API_URL}/api/v1/cart`, { headers: headersFor(get().sessionId) });
          if (!res.ok) return false;
          const serverCart = await res.json();
          const { items, changes } = reconcile(get().items, serverCart);
          set({ items, ...shopOf(items), notices: changes.filter((c) => c.type !== 'removed') });
          return true;
        } catch {
          return false;
        }
      },

      /**
       * On sign-in: the guest cart (already on the server under this session)
       * is merged into the customer's, and the result pulled back.
       *
       * Safe to run twice. The login page reloads straight after signing in,
       * which can cut this off; `signedIn` stays false until it finishes, so
       * the next page load runs it again. The server only moves rows nobody
       * owns, so a second merge cannot double anything. A guest line that
       * never reached the server (its sync failed) is put back afterwards as
       * the customer's own.
       */
      mergeAfterLogin: async () => {
        const { sessionId, items: guestItems } = get();
        try {
          if (guestItems.length) {
            const res = await fetch(`${API_URL}/api/v1/cart/merge`, {
              method: 'POST',
              headers: headersFor(sessionId),
              body: JSON.stringify({ sessionId }),
            });
            if (!res.ok) return false;
          }
          if (!(await get().pullFromServer())) return false;
          const missing = guestItems.filter((g) => !get().items.some((i) => sameLine(i, g)));
          for (const g of missing) {
            const items = addLine(get().items, g, g.quantity, g.options || {});
            set({ items, ...shopOf(items) });
            await get().syncToBackend(g.id, g.quantity, g.options || {});
          }
          set({ signedIn: true });
          return true;
        } catch (e) {
          console.error('Failed to merge the guest cart', e);
          return false;
        }
      },

      /** Signed out: the customer's cart stays theirs on the server, not on this screen. */
      resetForLogout: () => set({ items: [], notices: [], ...shopOf([]), sessionId: generateSessionId(), signedIn: false }),

      getCartTotal: () => get().items.reduce((total, item) => total + Number(item.price || 0) * item.quantity, 0),
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      getGroupedItems: () => get().items,
      shopGroups: () => groupByShop(get().items),
    }),
    {
      name: 'localsampark-cart',
      // Notices are about this visit; the open/closed drawer is not worth keeping.
      partialize: (s) => ({
        items: s.items,
        sessionId: s.sessionId,
        signedIn: s.signedIn,
        currentShopId: s.currentShopId,
        currentShopName: s.currentShopName,
        currentShopCategory: s.currentShopCategory,
      }),
    }
  )
);
