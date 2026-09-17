import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { apiPost } from '../lib/api';

const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      currentShopId: null,
      currentShopName: null,
      sessionId: generateSessionId(),

      syncToBackend: async (productId, quantity, customOptions = {}) => {
        try {
          const { sessionId } = get();
          await apiPost('/cart', {
            sessionId,
            productId,
            quantity,
            customOptions
          });
        } catch (e) {
          console.error("Failed to sync cart to backend", e);
        }
      },

      /**
       * Adds an item, unless the cart already belongs to another shop.
       *
       * Returns `{ added, reason, currentShopName }`. It used to return
       * nothing, which made the multi-shop guard below invisible in two ways:
       * the caller could not tell the add had been refused, so the user tapped
       * "Add" and simply nothing happened; and the sync at the bottom of this
       * function ran regardless, so the item the local cart had just rejected
       * was still posted to the server cart. The two carts then disagreed, and
       * the one the customer could see was the one that was wrong.
       */
      addItem: (product, quantity = 1, customOptions = {}) => {
        const blockedBy = (() => {
          const state = get();
          return state.currentShopId && state.currentShopId !== product.shop_id
            ? state.currentShopName || 'another shop'
            : null;
        })();

        if (blockedBy) {
          return { added: false, reason: 'different_shop', currentShopName: blockedBy };
        }

        set((state) => {

          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

          const optionsKey = JSON.stringify(customOptions || {});
          const existingIndex = state.items.findIndex(
            (i) => i.id === product.id && JSON.stringify(i.options || {}) === optionsKey
          );

          if (existingIndex > -1) {
            const updated = [...state.items];
            updated[existingIndex] = {
              ...updated[existingIndex],
              quantity: updated[existingIndex].quantity + quantity,
            };
            return {
              items: updated,
              currentShopId: product.shop_id,
              currentShopName: product.shop_name,
              currentShopCategory: product.shop_category || state.currentShopCategory
            };
          }

          return {
            items: [...state.items, { ...product, quantity, options: customOptions }],
            currentShopId: product.shop_id,
            currentShopName: product.shop_name,
            currentShopCategory: product.shop_category || state.currentShopCategory
          };
        });
        
        // Sync only what was actually added. Syncing unconditionally is what
        // let the server cart hold an item the local cart had refused.
        get().syncToBackend(product.id, quantity, customOptions);

        return { added: true, reason: null, currentShopName: product.shop_name };
      },

      removeItem: (productId, options = null) => {
        set((state) => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          let newItems;
          if (options !== null) {
            const optionsKey = JSON.stringify(options || {});
            newItems = state.items.filter(
              i => !(i.id === productId && JSON.stringify(i.options || {}) === optionsKey)
            );
          } else {
            newItems = state.items.filter((i) => i.id !== productId);
          }
          return {
            items: newItems,
            currentShopId: newItems.length === 0 ? null : state.currentShopId,
            currentShopName: newItems.length === 0 ? null : state.currentShopName,
            currentShopCategory: newItems.length === 0 ? null : state.currentShopCategory
          };
        });
        get().syncToBackend(productId, 0);
      },

      updateQuantity: (productId, quantity, options = null) => {
        const newQty = Math.max(0, quantity);
        if (newQty === 0) {
          get().removeItem(productId, options);
          return;
        }
        
        set((state) => {
          Haptics.selectionAsync();
          return {
            items: state.items.map((i) => {
              if (options !== null) {
                const optionsKey = JSON.stringify(options || {});
                if (i.id === productId && JSON.stringify(i.options || {}) === optionsKey) {
                  return { ...i, quantity: newQty };
                }
              } else if (i.id === productId) {
                return { ...i, quantity: newQty };
              }
              return i;
            }),
          };
        });
        get().syncToBackend(productId, newQty, options);
      },

      clearCart: () => {
        set({ items: [], currentShopId: null, currentShopName: null });
      },

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      }
    }),
    {
      name: 'localsampark-cart',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);
