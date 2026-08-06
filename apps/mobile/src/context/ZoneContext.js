import React, { createContext, useState, useContext, useEffect } from 'react';
let Location = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('[ZoneContext] expo-location not available:', e.message);
}
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';
import { useTerritoryStore } from '../store/useTerritoryStore';

const ZoneContext = createContext();

export function ZoneProvider({ children }) {
  const { authToken, API_URL, user } = useAuth();
  const { territoryId, territoryName, pincode, districtName, lockTerritory, isLocked, isLoading: isTerritoryLoading } = useTerritoryStore();
  
  // Synthesize activeZone from Zustand store to maintain backward compatibility for UI components
  const activeZone = territoryId ? {
    id: territoryId,
    name: territoryName,
    pincode: pincode,
    district: districtName
  } : null;

  const [savedZones, setSavedZones] = useState([]);
  const [allZones, setAllZones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 1. Fetch all available zones
    const fetchAllZones = async () => {
      try {
        const res = await fetch(`${API_URL}/zones`);
        const data = await res.json();
        if (data.success) {
          setAllZones(data.data);
        }
      } catch (err) {
        console.warn('Failed to fetch zones:', err);
      }
    };
    
    fetchAllZones();
  }, [API_URL]);

  useEffect(() => {
    if (authToken && user) {
      loadUserZones();
    } else if (!isTerritoryLoading) {
      setIsLoading(false);
    }
  }, [authToken, user, API_URL, isTerritoryLoading]);

  const loadUserZones = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/saved-zones`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setSavedZones(data.data);
      }

      if (user.active_zone_id || user.region_id) {
        const zoneId = user.active_zone_id || user.region_id;
        if (zoneId !== territoryId) {
          await fetchZoneDetails(zoneId);
        }
      }
    } catch (err) {
      console.error('Failed to load user zones:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchZoneDetails = async (zoneId) => {
    try {
      const res = await fetch(`${API_URL}/zones/${zoneId}`);
      const data = await res.json();
      if (data.success) {
        await lockTerritory({
            id: data.data.id,
            name: data.data.name,
            pincode: data.data.pincode || data.data.pin || '',
            district: data.data.district || '',
        });
      }
    } catch (err) {
      console.warn('Failed to fetch zone details:', err);
    }
  };

  const detectLocation = async () => {
    try {
      if (!Location) return;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      const res = await fetch(`${API_URL}/zones/resolve?lat=${location.coords.latitude}&lng=${location.coords.longitude}`);
      const data = await res.json();
      
      if (data.success && !data.outOfBounds && data.territory) {
        await lockTerritory(data.territory);
      } else {
        const legacyRes = await fetch(`${API_URL}/zones/nearby?lat=${location.coords.latitude}&lng=${location.coords.longitude}&limit=1`);
        const legacyData = await legacyRes.json();
        
        if (legacyData.success && legacyData.data.length > 0) {
          const nearest = legacyData.data[0];
          await switchZone(nearest.id, nearest);
        } else {
          Alert.alert('No nearby zones found for your location.');
        }
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
    }
  };

  const switchZone = async (zoneId, predefinedZone = null) => {
    try {
      let selectedZone = predefinedZone;
      
      if (!selectedZone) {
        selectedZone = allZones.find(z => z.id === zoneId);
        if (!selectedZone) {
          const res = await fetch(`${API_URL}/zones/${zoneId}`);
          const data = await res.json();
          if (data.success) selectedZone = data.data;
        }
      }
      
      if (selectedZone) {
        if (selectedZone.id) {
          await lockTerritory({
            id: selectedZone.id,
            name: selectedZone.name,
            pincode: selectedZone.pincode || selectedZone.pin || '',
            district: selectedZone.district || '',
          });
        }
        
        if (authToken) {
          await fetch(`${API_URL}/users/zone`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ zoneId: selectedZone.id })
          });
        }
      }
    } catch (err) {
      console.error('Failed to switch zone:', err);
      Alert.alert('Error', 'Could not update your active zone.');
    }
  };
  
  const saveZone = async (zoneId, label) => {
      if (!authToken) {
          Alert.alert('Login Required', 'You must be logged in to save zones.');
          return;
      }
      try {
          const res = await fetch(`${API_URL}/users/saved-zones`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ regionId: zoneId, label })
          });
          const data = await res.json();
          if (data.success) {
              loadUserZones();
              Alert.alert('Success', 'Zone saved successfully.');
          } else {
              Alert.alert('Error', data.error || 'Failed to save zone.');
          }
      } catch (err) {
          Alert.alert('Error', 'Failed to save zone.');
      }
  };

  return (
    <ZoneContext.Provider value={{
      activeZone,
      savedZones,
      allZones,
      isLoading,
      switchZone,
      detectLocation,
      saveZone,
      territoryId,
      isLocked
    }}>
      {children}
    </ZoneContext.Provider>
  );
}

export function useZone() {
  return useContext(ZoneContext);
}
