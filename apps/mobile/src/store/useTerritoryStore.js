/**
 * ═══════════════════════════════════════════════════════════════════════
 * Territory Store — Zustand with AsyncStorage Persistence
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Central truth for the user's locked territory session in the mobile app.
 * Persisted to AsyncStorage for offline-first behavior.
 * ═══════════════════════════════════════════════════════════════════════
 */

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@localsampark_territory';

export const useTerritoryStore = create((set, get) => ({
  // State
  territoryId: null,
  territoryName: '',
  pincode: '',
  districtName: '',
  talukaName: '',
  stateName: '',
  centroidLat: null,
  centroidLng: null,
  isLocked: false,
  isOutOfBounds: false,
  isLoading: true,

  // Actions
  lockTerritory: async (territory) => {
    const data = {
      territoryId: territory.id,
      territoryName: territory.name,
      pincode: territory.pincode,
      districtName: territory.district || '',
      talukaName: territory.taluka || '',
      stateName: territory.state || 'Maharashtra',
      centroidLat: territory.centroid?.lat || null,
      centroidLng: territory.centroid?.lng || null,
      isLocked: true,
      isOutOfBounds: false,
      isLoading: false,
    };

    set(data);

    // Persist to AsyncStorage
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[TerritoryStore] Persist failed:', e.message);
    }
  },

  clearTerritory: async () => {
    set({
      territoryId: null, territoryName: '', pincode: '',
      districtName: '', talukaName: '', stateName: '',
      centroidLat: null, centroidLng: null,
      isLocked: false, isOutOfBounds: false, isLoading: false,
    });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  },

  setOutOfBounds: (val) => set({ isOutOfBounds: val, isLoading: false }),

  // Restore from AsyncStorage (called on app boot)
  restore: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ ...data, isLoading: false });
        return data.territoryId;
      }
    } catch (e) {
      console.warn('[TerritoryStore] Restore failed:', e.message);
    }
    set({ isLoading: false });
    return null;
  },
}));
