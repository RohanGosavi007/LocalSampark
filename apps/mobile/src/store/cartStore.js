import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPost, apiDelete } from '../lib/api';
import { addLine, sameLine, groupByShop, reconcile } from '../lib/cartModel';

/**
 * The app's cart (C6), mirroring apps/web/src/store/cartStore.js.
 *
 * What changed:
 *   - Decision D6: items from several shops share one cart. Adding from a
 *     second shop used to be refused (`different_shop`);
 *   - each change sent the quantity just added, but POST /cart sets the line's
 *     quantity, so adding 1 to a line of 2 left the server holding 1. The
 *     line's total is sent now;
 *   - the server's stock refusal was ignored; the line is now set to what the
 *     shop can supply, and the customer is told;
 *   - the server cart is pulled on sign-in (with the guest cart merged in) and
 *     on start-up, so the cart follows the customer between the app and the
 *     web (src/components/commerce/CartSync.js);
 *   - emptying the cart after an order now empties the server copy as well.
 */

const generateSessionId = () =>
  'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

const shopOf = (items) => {
  const last = items[items.length - 1];
  return last
    ? { currentShopId: last.shop_id ?? null, currentShopName: last.shop_name || null, currentShopCategory: last.shop_category || null }
    : { currentShopId: null, currentShopName: null, currentShopCategory: null };
};

const buzz = (fn) => { try { fn(); } catch { /* haptics are optional */ } };

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      currentShopId: null,
      currentShopName: null,
      currentShopCategory: null,
      sessionId: generateSessionId(),
      // Whether this cart is the signed-in customer's (merged) or still a guest's.
      signedIn: false,
      notices: [],

      dismissNotices: () => set({ notices: [] }),

      /** Sets one line's quantity on the server (0 removes it). */
      syncToBackend: async (productId, quantity, customOptions = {}) => {
        const { sessionId } = get();
        try {
          await apiPost('/cart', { sessionId, productId, quantity, customOptions }, { headers: { 'X-Session-Id': sessionId } });
        } catch (e) {
          const available = e && e.status === 400 && e.data && e.data.available !== undefined
            ? Math.max(0, Number(e.data.available) || 0)
            : null;
          if (available === null) {
            console.error('Failed to sync cart to backend', e && e.message);
            return;
          }
          const key = { id: productId, options: customOptions };
          const line = get().items.find((i) => sameLine(i, key));
          if (available > 0) await get().syncToBackend(productId, available, customOptions);
          set((state) => {
            const items = available > 0
              ? state.items.map((i) => (sameLine(i, key) ? { ...i, quantity: available } : i))
              : state.items.filter((i) => !sameLine(i, key));
            return { items, ...shopOf(items), notices: [...state.notices, { type: 'stock', name: line ? line.name : 'An item', available }] };
          });
        }
      },

      /**
       * Adds an item; items from different shops sit side by side (D6).
       * Returns `{ added, reason }` as before, so callers keep working.
       */
      addItem: (product, quantity = 1, customOptions = {}) => {
        if (!product || product.id === undefined || product.id === null) {
          return { added: false, reason: 'invalid_product', currentShopName: null };
        }
        buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
        const items = addLine(get().items, product, quantity, customOptions);
        set({ items, ...shopOf(items) });
        const line = items.find((i) => sameLine(i, { id: product.id, options: customOptions }));
        get().syncToBackend(product.id, line.quantity, customOptions);
        return { added: true, reason: null, currentShopName: product.shop_name };
      },

      removeItem: (productId, options = null) => {
        buzz(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
        const matches = (i) => (options !== null ? sameLine(i, { id: productId, options }) : String(i.id) === String(productId));
        const removed = get().items.filter(matches);
        const items = get().items.filter((i) => !matches(i));
        set({ items, ...shopOf(items) });
        for (const line of removed) get().syncToBackend(line.id, 0, line.options || {});
      },

      updateQuantity: (productId, quantity, options = null) => {
        const newQty = Math.max(0, Math.floor(Number(quantity) || 0));
        if (newQty === 0) {
          get().removeItem(productId, options);
          return;
        }
        buzz(() => Haptics.selectionAsync());
        const matches = (i) => (options !== null ? sameLine(i, { id: productId, options }) : String(i.id) === String(productId));
        set((state) => ({ items: state.items.map((i) => (matches(i) ? { ...i, quantity: newQty } : i)) }));
        for (const line of get().items.filter(matches)) get().syncToBackend(line.id, newQty, line.options || {});
      },

      /** Empties the cart here and on the server. */
      clearCart: () => {
        const { sessionId } = get();
        set({ items: [], notices: [], ...shopOf([]) });
        apiDelete('/cart', { headers: { 'X-Session-Id': sessionId } }).catch(() => {});
      },

      /** Replaces the local cart with the server's and records what changed. */
      pullFromServer: async () => {
        try {
          const serverCart = await apiGet('/cart', { headers: { 'X-Session-Id': get().sessionId } });
          const { items, changes } = reconcile(get().items, serverCart);
          set({ items, ...shopOf(items), notices: changes.filter((c) => c.type !== 'removed') });
          return true;
        } catch {
          return false;
        }
      },

      /**
       * On sign-in: the guest cart (already on the server under this session)
       * is merged into the customer's, then pulled back. Safe to repeat: the
       * server moves only rows nobody owns, and `signedIn` stays false until
       * it has finished. A guest line that never reached the server (added
       * offline) is put back afterwards as the customer's own.
       */
      mergeAfterLogin: async () => {
        const { sessionId, items: guestItems } = get();
        try {
          if (guestItems.length) {
            await apiPost('/cart/merge', { sessionId }, { headers: { 'X-Session-Id': sessionId } });
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
          console.error('Failed to merge the guest cart', e && e.message);
          return false;
        }
      },

      /** Signed out: the cart stays the customer's on the server, not on this device. */
      resetForLogout: () => set({ items: [], notices: [], ...shopOf([]), sessionId: generateSessionId(), signedIn: false }),

      getCartTotal: () => get().items.reduce((total, item) => total + Number(item.price || 0) * item.quantity, 0),
      getItemCount: () => get().items.reduce((count, item) => count + item.quantity, 0),
      shopGroups: () => groupByShop(get().items),
    }),
    {
      name: 'localsampark-cart',
      storage: createJSONStorage(() => AsyncStorage),
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
