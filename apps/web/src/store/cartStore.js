import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { API_URL } from '../lib/api';

// Generate a random UUID for session
const generateSessionId = () => {
  return 'sess_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      currentShopId: null,
      currentShopName: null,
      sessionId: generateSessionId(),
      
      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // Sync with backend API
      syncToBackend: async (productId, quantity) => {
        try {
          const { sessionId } = get();
          await fetch(`${API_URL}/api/v1/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              productId,
              quantity
            })
          });
        } catch (e) {
          console.error("Failed to sync cart to backend", e);
        }
      },

      addItem: (product, quantity = 1) => {
        set((state) => {
          if (state.currentShopId && state.currentShopId !== product.shop_id) {
            const confirm = window.confirm(`Your cart contains items from ${state.currentShopName}. Do you want to discard them and start a new order from ${product.shop_name}?`);
            if (!confirm) return state; // Do nothing
            
            return {
              items: [{ ...product, quantity }],
              currentShopId: product.shop_id,
              currentShopName: product.shop_name,
              isOpen: true
            };
          }

          const existingItem = state.items.find((i) => i.id === product.id);
          const newQty = existingItem ? existingItem.quantity + quantity : quantity;
          
          return {
            items: existingItem 
              ? state.items.map((i) => i.id === product.id ? { ...i, quantity: newQty } : i)
              : [...state.items, { ...product, quantity }],
            currentShopId: product.shop_id,
            currentShopName: product.shop_name,
            isOpen: true
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
        // Sync removal to DB (qty 0)
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
    }
  )
);
