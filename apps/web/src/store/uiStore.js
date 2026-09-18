import { create } from 'zustand';

export const useUIStore = create((set) => ({
  // Theme lives in contexts/ThemeContext.js, not here.
  //
  // This store used to carry its own `theme` / `setTheme` / `toggleTheme`
  // slice that wrote the same localStorage key and the same DOM classes as the
  // provider and the pre-hydration script. Three writers meant no single place
  // to reason about which theme was active, and the drift between them is what
  // broke Bright Mode: the provider read a different key and forced dark on
  // every load. Nothing consumed this slice, so it is removed rather than
  // wrapped — `useTheme()` is the only entry point.

  // Language
  language: 'en',
  setLanguage: (language) => set({ language }),

  // Sidebar
  sidebarOpen: false,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Modal
  activeModal: null,
  modalData: null,
  openModal: (modalName, data = null) => set({ activeModal: modalName, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: null }),

  // Search
  searchOpen: false,
  toggleSearch: () => set((state) => ({ searchOpen: !state.searchOpen })),

  // Global loading
  globalLoading: false,
  setGlobalLoading: (loading) => set({ globalLoading: loading }),
}));
