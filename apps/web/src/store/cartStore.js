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
      currentShopCategory: null,  // NEW: Track category for theming
      sessionId: generateSessionId(),
      
      toggleCart: () => set({ isOpen: !get().isOpen }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      // Sync with backend API
      syncToBackend: async (productId, quantity, customOptions = {}) => {
        try {
          const { sessionId } = get();
          await fetch(`${API_URL}/api/v1/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sessionId,
              productId,
              quantity,
              customOptions
            })
          });
        } catch (e) {
          console.error("Failed to sync cart to backend", e);
        }
      },

      /**
       * Add item with custom options (modifiers, portions, units)
       * Two items with different customOptions are treated as separate line items
       */
      addItem: (product, quantity = 1, customOptions = {}) => {
        set((state) => {
          if (state.currentShopId && state.currentShopId !== product.shop_id) {
            const confirm = window.confirm(`Your cart contains items from ${state.currentShopName}. Do you want to discard them and start a new order from ${product.shop_name}?`);
            if (!confirm) return state; // Do nothing
            
            return {
              items: [{ ...product, quantity, options: customOptions }],
              currentShopId: product.shop_id,
              currentShopName: product.shop_name,
              currentShopCategory: product.shop_category || null,
              isOpen: true
            };
          }

          // Generate a unique key based on item ID + options
          const optionsKey = JSON.stringify(customOptions || {});
          const existingIndex = state.items.findIndex(
            i => i.id === product.id && JSON.stringify(i.options || {}) === optionsKey
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
              currentShopCategory: product.shop_category || state.currentShopCategory,
              isOpen: true
            };
          }

          return {
            items: [...state.items, { ...product, quantity, options: customOptions }],
            currentShopId: product.shop_id,
            currentShopName: product.shop_name,
            currentShopCategory: product.shop_category || state.currentShopCategory,
            isOpen: true
          };
        });
        
        // Sync to DB
        const state = get();
        const item = state.items.find(i => i.id === product.id);
        if (item) get().syncToBackend(product.id, item.quantity, customOptions);
      },

      removeItem: (productId, options = null) => {
        set((state) => {
          let newItems;
          if (options !== null) {
            // Remove specific variant
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
            currentShopCategory: newItems.length === 0 ? null : state.currentShopCategory,
          };
        });
        // Sync removal to DB (qty 0)
        get().syncToBackend(productId, 0);
      },

      updateQuantity: (productId, quantity, options = null) => {
        const newQty = Math.max(0, quantity);
        if (newQty === 0) {
          get().removeItem(productId, options);
          return;
        }
        set((state) => ({
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
        }));
        get().syncToBackend(productId, newQty);
      },

      clearCart: () => {
        set({ items: [], currentShopId: null, currentShopName: null, currentShopCategory: null });
      },

      getCartTotal: () => {
        return get().items.reduce((total, item) => total + item.price * item.quantity, 0);
      },
      
      getItemCount: () => {
        return get().items.reduce((count, item) => count + item.quantity, 0);
      },

      // NEW: Get items grouped by customization for display
      getGroupedItems: () => {
        return get().items;
      },
    }),
    {
      name: 'localsampark-cart',
    }
  )
);
