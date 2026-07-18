'use client';
import React, { createContext, useState, useEffect, useContext } from 'react';
import { API_URL } from '@/lib/api';

export const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    lat: null,
    lng: null,
    pincode: '',
    addressLabel: 'Detecting...',
    isUsingFallback: false,
    region_id: null
  });

  const [isLocationReady, setIsLocationReady] = useState(false);
  const [hierarchy, setHierarchy] = useState({ STATES: [], DISTRICTS: {}, TERRITORIES: [] });
  const [isHierarchyLoading, setIsHierarchyLoading] = useState(true);

  // Fetch dynamic zones from backend
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_URL}/api/v1/zones/hierarchy`, { signal: controller.signal })
      .then(res => {
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data.success) setHierarchy(data.data);
      })
      .catch(() => {
        // Backend unavailable — use empty defaults silently
      })
      .finally(() => setIsHierarchyLoading(false));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    // Check if user has saved location override in localStorage
    const savedLoc = localStorage.getItem('user_location');
    if (savedLoc) {
      try {
        const parsed = JSON.parse(savedLoc);
        setLocation(parsed);
        setIsLocationReady(true);
        return; // Use saved instead of auto-detect
      } catch(e){}
    }

    // Auto-detect if no saved location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          const newLoc = { lat, lng, pincode: '', addressLabel: 'Current GPS Location', isUsingFallback: false, region_id: null };
          setLocation(newLoc);
          setIsLocationReady(true);
        },
        (error) => {
          console.warn("Geolocation denied. Using fallback.");
          setLocation({
            lat: 18.5793,
            lng: 73.8965,
            pincode: '411015',
            addressLabel: 'Dhanori, Pune (Default)',
            isUsingFallback: true,
            region_id: 'reg_pune_dhanori'
          });
          setIsLocationReady(true);
        }
      );
    } else {
        setLocation({
            lat: 18.5793,
            lng: 73.8965,
            pincode: '411015',
            addressLabel: 'Dhanori, Pune (Default)',
            isUsingFallback: true,
            region_id: 'reg_pune_dhanori'
        });
        setIsLocationReady(true);
    }
  }, []);

  const updateLocation = (newLocation) => {
    const updated = { ...location, ...newLocation, isUsingFallback: false };
    setLocation(updated);
    localStorage.setItem('user_location', JSON.stringify(updated));
  };

  return (
    <LocationContext.Provider value={{ 
      location, 
      isLocationReady, 
      updateLocation,
      STATES: hierarchy.STATES,
      DISTRICTS: hierarchy.DISTRICTS,
      TERRITORIES: hierarchy.TERRITORIES,
      isHierarchyLoading
    }}>
      {children}
    </LocationContext.Provider>
  );
};
