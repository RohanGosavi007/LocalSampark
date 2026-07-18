import { create } from 'zustand';

export const useAppStore = create((set) => ({
  walletBalance: 0,
  unreadNotifications: 0,
  shops: [],
  categories: [],
  feedItems: [],

  // Actions
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setShops: (shops) => set({ shops }),
  setCategories: (categories) => set({ categories }),
  setFeedItems: (feedItems) => set({ feedItems }),
  
  // Real-time updates
  updateWalletBalance: (newBalance) => set({ walletBalance: newBalance }),
  updateShop: (updatedShop) => set((state) => ({
    shops: state.shops.map(shop => shop.id === updatedShop.id ? updatedShop : shop)
  })),
}));
