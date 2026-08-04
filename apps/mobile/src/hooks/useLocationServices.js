/**
 * ═══════════════════════════════════════════════════════════════════════
 * useLocationServices — Expo GPS → Territory Resolution Hook
 * ═══════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import { useTerritoryStore } from '../store/useTerritoryStore';
import { API_URL } from '../lib/api';

let Location = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('[useLocationServices] expo-location not available');
}

export function useLocationServices() {
  const {
    territoryId, isLocked, isOutOfBounds, isLoading,
    lockTerritory, setOutOfBounds, restore
  } = useTerritoryStore();

  const [gpsLoading, setGpsLoading] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState(null);

  // Restore saved territory on first mount
  useEffect(() => {
    restore();
  }, []);

  /**
   * Resolve GPS coordinates → territory via backend /zones/resolve
   */
  const resolveFromGPS = useCallback(async () => {
    if (!Location) {
      setOutOfBounds(true);
      return null;
    }

    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== 'granted') {
        setOutOfBounds(true);
        setGpsLoading(false);
        return null;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy?.Balanced || 3,
        timeout: 10000,
      });

      const lat = loc.coords.latitude;
      const lng = loc.coords.longitude;

      const res = await fetch(`${API_URL}/zones/resolve?lat=${lat}&lng=${lng}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();

      if (data.success && !data.outOfBounds && data.territory) {
        await lockTerritory(data.territory);
        setGpsLoading(false);
        return data.territory;
      } else {
        setOutOfBounds(true);
        setGpsLoading(false);
        return null;
      }
    } catch (err) {
      console.warn('[useLocationServices] GPS resolve failed:', err.message);
      setOutOfBounds(true);
      setGpsLoading(false);
      return null;
    }
  }, [lockTerritory, setOutOfBounds]);

  /**
   * Resolve by pincode (manual entry)
   */
  const resolveFromPincode = useCallback(async (pincode) => {
    try {
      const res = await fetch(`${API_URL}/zones/resolve?pincode=${pincode}`, {
        headers: { 'Accept': 'application/json' },
      });
      const data = await res.json();

      if (data.success && !data.outOfBounds && data.territory) {
        await lockTerritory(data.territory);
        return data.territory;
      } else {
        Alert.alert('Location Not Found', 'This pincode is not yet serviceable.');
        return null;
      }
    } catch (err) {
      console.warn('[useLocationServices] Pincode resolve failed:', err.message);
      Alert.alert('Error', 'Could not resolve location. Please try again.');
      return null;
    }
  }, [lockTerritory]);

  /**
   * Auto-detect on first launch if no territory is locked
   */
  const autoDetect = useCallback(async () => {
    if (isLocked) return; // Already have a territory
    await resolveFromGPS();
  }, [isLocked, resolveFromGPS]);

  return {
    territoryId,
    isLocked,
    isOutOfBounds,
    isLoading: isLoading || gpsLoading,
    permissionStatus,
    resolveFromGPS,
    resolveFromPincode,
    autoDetect,
  };
}
