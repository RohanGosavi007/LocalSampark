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
import territoryResolver from '../services/territoryResolver';

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

  // How the current territory was arrived at. `method` is the server's basis
  // for the answer (boundary / pincode / cached_pincode) and `source` is where
  // the input came from (gps / cache / manual). The UI needs both: "we placed
  // you by GPS" and "we placed you by the postcode you typed" are different
  // claims, and showing the wrong one is how a user ends up trusting an
  // attribution that was really a fallback.
  method: null,
  source: null,
  stale: false,
  offline: false,
  needsManualEntry: false,
  franchise: null,

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
      method: null, source: null, stale: false, offline: false,
      needsManualEntry: false, franchise: null,
    });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
  },

  setOutOfBounds: (val) => set({ isOutOfBounds: val, isLoading: false }),

  /**
   * Resolve the user's territory through the degradation ladder and lock it in.
   *
   * This is the only place the app should decide which franchise serves the
   * user. The store previously exposed `lockTerritory` alone, so each screen
   * was free to invent its own resolution — which is how a screen ends up
   * locking a territory from a stale GPS fix while another uses the typed
   * pincode, and the two disagree about who earns the commission.
   *
   * `pincode` forces the manual branch (the user has just told us where they
   * are). `allowPrompt` permits a permission dialog, so boot can resolve
   * quietly and an explicit "use my location" tap can ask.
   */
  resolveAndLock: async ({ allowPrompt = false, pincode = null } = {}) => {
    set({ isLoading: true });

    let result;
    try {
      result = await territoryResolver.resolveTerritory({ allowPrompt, pincode });
    } catch (e) {
      console.warn('[TerritoryStore] Resolution failed:', e.message);
      set({ isLoading: false, needsManualEntry: true });
      return { resolved: false, reason: 'error', needsManualEntry: true };
    }

    if (!result.resolved || !result.territory) {
      // Not serviceable is not the same as not knowing where the user is, but
      // either way the territory we hold is no longer the right one. Keeping a
      // previously locked territory here would attribute this user's orders to
      // a franchise that does not serve where they now are.
      set({
        isOutOfBounds: true,
        isLoading: false,
        needsManualEntry: result.needsManualEntry !== false,
        method: result.method || 'unresolved',
        source: result.source || null,
      });
      return result;
    }

    const t = result.territory;
    const data = {
      territoryId: t.id,
      territoryName: t.name || '',
      pincode: t.pincode || '',
      districtName: t.district_name || t.district || '',
      talukaName: t.taluka_name || t.taluka || '',
      stateName: t.state_name || t.state || 'Maharashtra',
      centroidLat: t.centroid?.lat ?? null,
      centroidLng: t.centroid?.lng ?? null,
      isLocked: true,
      isOutOfBounds: false,
      isLoading: false,
      method: result.method || null,
      source: result.source || null,
      stale: Boolean(result.stale),
      offline: Boolean(result.offline),
      needsManualEntry: false,
      franchise: result.franchise || null,
    };

    set(data);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[TerritoryStore] Persist failed:', e.message);
    }
    return result;
  },

  /**
   * Re-resolve after the device has moved.
   *
   * Called from a geofence transition or a significant-motion update rather
   * than on a timer — the point of the border check is that crossing one is an
   * event, not something worth polling GPS for. Returns true when the serving
   * territory actually changed, so the caller can tell the user their area
   * changed instead of silently swapping the franchise underneath them.
   */
  refreshOnBorderCross: async () => {
    const before = get().territoryId;
    const result = await get().resolveAndLock({ allowPrompt: false });
    const after = get().territoryId;
    return Boolean(result?.resolved) && before !== after;
  },

  /** Clears the cached fix as well as the store; for sign-out. */
  clearAll: async () => {
    try {
      await territoryResolver.clearCache();
    } catch {}
    await get().clearTerritory();
  },

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
