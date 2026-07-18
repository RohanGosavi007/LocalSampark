import { create } from 'zustand';

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,

  // Add a new notification
  addNotification: (notification) => set((state) => {
    const newNotif = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      read: false,
      category: 'general', // 'order' | 'community' | 'promotion' | 'general'
      ...notification,
    };
    return {
      notifications: [newNotif, ...state.notifications].slice(0, 100), // Keep last 100
      unreadCount: state.unreadCount + 1,
    };
  }),

  // Mark single as read
  markAsRead: (id) => set((state) => {
    const notifications = state.notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    );
    return {
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    };
  }),

  // Mark all as read
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount: 0,
  })),

  // Remove notification
  removeNotification: (id) => set((state) => {
    const notifications = state.notifications.filter(n => n.id !== id);
    return {
      notifications,
      unreadCount: notifications.filter(n => !n.read).length,
    };
  }),

  // Clear all
  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  // Get by category
  getByCategory: (category) => {
    return get().notifications.filter(n => n.category === category);
  },
}));
