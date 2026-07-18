import React, { createContext, useState, useContext, useEffect } from 'react';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { Alert } from 'react-native';

const ZoneContext = createContext();

export function ZoneProvider({ children }) {
  const { authToken, API_URL, user } = useAuth();
  
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
      // If no user, try to load a public active zone from storage, or fallback to GPS
      restorePublicZone();
    }
  }, [authToken, user, API_URL]);

  const loadUserZones = async () => {
    setIsLoading(true);
    try {
      // Fetch user's saved zones
      const res = await fetch(`${API_URL}/users/saved-zones`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setSavedZones(data.data);
      }

      // Check if user has an active zone on their profile
      if (user.active_zone_id || user.region_id) {
        const zoneId = user.active_zone_id || user.region_id;
        await fetchZoneDetails(zoneId);
      } else {
        // Fallback to AsyncStorage
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
      } else {
        // No stored zone, ask for GPS
        // await detectLocation(); // DISABLED: Aggressive prompt causes permission race condition / crash on Android.
      }
    } catch (e) {
      console.warn('AsyncStorage error in ZoneContext:', e);
    }
  };

  const detectLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      
      const res = await fetch(`${API_URL}/zones/nearby?lat=${location.coords.latitude}&lng=${location.coords.longitude}&limit=1`);
      const data = await res.json();
      
      if (data.success && data.data.length > 0) {
        const nearest = data.data[0];
        await switchZone(nearest.id, nearest);
      } else {
        Alert.alert('No nearby zones found for your location.');
      }
    } catch (err) {
      console.warn('Location detection failed:', err);
    }
  };

  const switchZone = async (zoneId, predefinedZone = null) => {
    try {
      let selectedZone = predefinedZone;
      
      // If we don't have the full object, find it from allZones or fetch it
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
        
        // If logged in, update backend
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
              loadUserZones(); // Refresh the list
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
      saveZone
    }}>
      {children}
    </ZoneContext.Provider>
  );
}

export function useZone() {
  return useContext(ZoneContext);
}
