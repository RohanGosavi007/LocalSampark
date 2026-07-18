import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      token: null,

      login: (userData, token) => set({ 
        user: userData, 
        isAuthenticated: true, 
        token 
      }),

      logout: () => set({ 
        user: null, 
        isAuthenticated: false, 
        token: null 
      }),
      
      updateUser: (data) => set((state) => ({
        user: { ...state.user, ...data }
      }))
    }),
    {
      name: 'localsampark-auth',
    }
  )
);
