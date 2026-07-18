import { create } from 'zustand';

export const useAppStore = create((set) => ({
  walletBalance: 0,
  samparkCoins: 0,
  walletTransactions: [],
  serviceBookings: [],
  shopDashboardStats: null,
  shopId: null,
  
  unreadNotifications: 0,
  shops: [],
  categories: [],
  feedItems: [],

  // Actions
  setWalletBalance: (balance) => set({ walletBalance: balance }),
  setSamparkCoins: (coins) => set({ samparkCoins: coins }),
  setWalletTransactions: (transactions) => set({ walletTransactions: transactions }),
  setServiceBookings: (bookings) => set({ serviceBookings: bookings }),
  setShopDashboardStats: (stats) => set({ shopDashboardStats: stats }),
  setShopId: (id) => set({ shopId: id }),
  
  setUnreadNotifications: (count) => set({ unreadNotifications: count }),
  setShops: (shops) => set({ shops }),
  setCategories: (categories) => set({ categories }),
  setFeedItems: (feedItems) => set({ feedItems }),
  
  // Real-time updates
  updateWalletBalance: (newBalance) => set({ walletBalance: newBalance }),
  updateSamparkCoins: (newCoins) => set({ samparkCoins: newCoins }),
  updateShop: (updatedShop) => set((state) => ({
    shops: state.shops.map(shop => shop.id === updatedShop.id ? updatedShop : shop)
  })),
}));
