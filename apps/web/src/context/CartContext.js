'use client';

import React, { createContext, useContext, useMemo, useCallback } from 'react';
import { useCartStore } from '@/store/cartStore';

/**
 * CartContext
 *
 * Three pages import this module and it did not exist, which was blocking the
 * production build. They use a reducer-style API:
 *
 *   const { dispatch } = useCart();
 *   dispatch({ type: 'ADD_ITEM', payload: { ...product, quantity: 1 } });
 *
 * The application's real cart is the Zustand store in store/cartStore.js. This
 * is an adapter over that store, not a second cart: introducing independent
 * state would let the two disagree about what the user is buying.
 */

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const store = useCartStore();

  const dispatch = useCallback(
    (action) => {
      if (!action || typeof action.type !== 'string') return;
      const payload = action.payload || {};

      switch (action.type) {
        case 'ADD_ITEM': {
          // Quantity travels inside the payload in the reducer style, but the
          // store takes it as its own argument.
          const { quantity = 1, options, ...product } = payload;
          store.addItem(product, quantity, options || {});
          break;
        }
        case 'REMOVE_ITEM':
          store.removeItem(payload.id ?? payload);
          break;
        case 'UPDATE_QUANTITY':
          store.updateQuantity(payload.id, payload.quantity);
          break;
        case 'CLEAR_CART':
          store.clearCart();
          break;
        case 'OPEN_CART':
          store.openCart();
          break;
        case 'CLOSE_CART':
          store.closeCart();
          break;
        default:
          console.warn(`[CartContext] Unhandled action: ${action.type}`);
      }
    },
    [store]
  );

  const value = useMemo(
    () => ({
      dispatch,
      // Exposed so consumers can read state without reaching for the store
      // directly and drifting from this adapter.
      items: store.items,
      isOpen: store.isOpen,
      shopId: store.currentShopId,
      shopName: store.currentShopName,
      count: store.items.reduce((n, i) => n + (i.quantity || 1), 0),
      total: store.items.reduce((sum, i) => sum + Number(i.price || 0) * (i.quantity || 1), 0),
      state: { items: store.items },
    }),
    [dispatch, store.items, store.isOpen, store.currentShopId, store.currentShopName]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);

  // The store is global, so a consumer rendered outside the provider can still
  // be served correctly rather than crashing the page.
  const store = useCartStore();

  if (!ctx) {
    return {
      dispatch: (action) => {
        if (action?.type === 'ADD_ITEM') {
          const { quantity = 1, options, ...product } = action.payload || {};
          store.addItem(product, quantity, options || {});
        }
      },
      items: store.items,
      isOpen: store.isOpen,
      count: store.items.reduce((n, i) => n + (i.quantity || 1), 0),
      total: store.items.reduce((sum, i) => sum + Number(i.price || 0) * (i.quantity || 1), 0),
      state: { items: store.items },
    };
  }

  return ctx;
}

export default CartContext;
