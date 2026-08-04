import React, { createContext, useState, useContext, useEffect } from 'react';
let Location = null;
try {
  Location = require('expo-location');
} catch (e) {
  console.warn('[ZoneContext] expo-location not available:', e.message);
}
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';
import { useTerritoryStore } from '../store/useTerritoryStore';

const ZoneContext = createContext();

export function ZoneProvider({ children }) {
  const { authToken, API_URL, user } = useAuth();
  const { territoryId, lockTerritory, isLocked } = useTerritoryStore();
  
  const [activeZone, setActiveZone] = useState(null);
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
    } else {
      restorePublicZone();
    }
  }, [authToken, user, API_URL]);

  // Sync territory store with active zone
  useEffect(() => {
    if (territoryId && !activeZone) {
      fetchZoneDetails(territoryId);
    }
  }, [territoryId]);

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
        await fetchZoneDetails(zoneId);
      } else if (isLocked && territoryId) {
        // Use territory store if user has no zone but has locked territory
        await fetchZoneDetails(territoryId);
      } else {
        await restorePublicZone();
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
        setActiveZone(data.data);
        await AsyncStorage.setItem('activeZone', JSON.stringify(data.data));
      }
    } catch (err) {
      console.warn('Failed to fetch zone details:', err);
    }
  };

  const restorePublicZone = async () => {
    try {
      const stored = await AsyncStorage.getItem('activeZone');
      if (stored) {
        setActiveZone(JSON.parse(stored));
      }
    } catch (e) {
      console.warn('AsyncStorage error in ZoneContext:', e);
    }
    setIsLoading(false);
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
      
      // Use the new /zones/resolve endpoint for PiP lookup
      const res = await fetch(`${API_URL}/zones/resolve?lat=${location.coords.latitude}&lng=${location.coords.longitude}`);
      const data = await res.json();
      
      if (data.success && !data.outOfBounds && data.territory) {
        // Lock territory in Zustand store
        await lockTerritory(data.territory);
        // Set active zone for backward compat
        const zoneData = { id: data.territory.id, name: data.territory.name, pincode: data.territory.pincode, district: data.territory.district };
        setActiveZone(zoneData);
        await AsyncStorage.setItem('activeZone', JSON.stringify(zoneData));
      } else {
        // Try legacy nearby endpoint
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
        setActiveZone(selectedZone);
        await AsyncStorage.setItem('activeZone', JSON.stringify(selectedZone));
        
        // Sync to territory store
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
      // Territory routing state (from Zustand)
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
