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

      addItem: (product, quantity = 1, customOptions = {}) => {
        set((state) => {
          if (state.currentShopId && state.currentShopId !== product.shop_id) {
            return state; // In native, handle warnings outside store via alert
          }

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
        
        // Sync to DB
        const state = get();
        get().syncToBackend(product.id, quantity, customOptions);
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
