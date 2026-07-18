import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useLocationStore = create(
  persist(
    (set) => ({
      currentZone: {
        id: 'Dhanori-1',
        name: 'Dhanori',
        pincode: '411015',
        isActive: true,
      },
      availableZones: [
        { id: 'Dhanori-1', name: 'Dhanori', pincode: '411015', isActive: true },
        { id: 'VimanNagar-1', name: 'Viman Nagar', pincode: '411014', isActive: true },
        { id: 'Kharadi-1', name: 'Kharadi', pincode: '411014', isActive: false },
        { id: 'Wakad-1', name: 'Wakad', pincode: '411057', isActive: false },
      ],
      userAddress: null,

      setZone: (zoneId) => {
        set((state) => {
          const zone = state.availableZones.find(z => z.id === zoneId);
          if (zone) return { currentZone: zone };
          return state;
        });
      },

      setAddress: (address) => set({ userAddress: address }),
    }),
    {
      name: 'localsampark-location',
    }
  )
);
