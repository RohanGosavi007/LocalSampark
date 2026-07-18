import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

      // Sync with backend API
      syncToBackend: async (productId, quantity) => {
        try {
          const { sessionId } = get();
          await apiPost('/cart', {
            sessionId,
            productId,
            quantity
          });
        } catch (e) {
          console.error("Failed to sync cart to backend", e);
        }
      },

      addItem: (product, quantity = 1) => {
        set((state) => {
          if (state.currentShopId && state.currentShopId !== product.shop_id) {
            return state; // In native, handle warnings outside store via alert
          }

          const existingItem = state.items.find((i) => i.id === product.id);
          const newQty = existingItem ? existingItem.quantity + quantity : quantity;
          
          return {
            items: existingItem 
              ? state.items.map((i) => i.id === product.id ? { ...i, quantity: newQty } : i)
              : [...state.items, { ...product, quantity }],
            currentShopId: product.shop_id,
            currentShopName: product.shop_name
          };
        });
        
        // Sync to DB
        const state = get();
        const item = state.items.find(i => i.id === product.id);
        if (item) get().syncToBackend(product.id, item.quantity);
      },

      removeItem: (productId) => {
        set((state) => {
          const newItems = state.items.filter((i) => i.id !== productId);
          return {
            items: newItems,
            currentShopId: newItems.length === 0 ? null : state.currentShopId,
            currentShopName: newItems.length === 0 ? null : state.currentShopName,
          };
        });
        get().syncToBackend(productId, 0);
      },

      updateQuantity: (productId, quantity) => {
        const newQty = Math.max(1, quantity);
        set((state) => ({
          items: state.items.map((i) =>
            i.id === productId ? { ...i, quantity: newQty } : i
          ),
        }));
        get().syncToBackend(productId, newQty);
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
