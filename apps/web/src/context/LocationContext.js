'use client';
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import { API_URL } from '@/lib/api';

export const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({
    lat: null, lng: null, pincode: '',
    addressLabel: 'Detecting...', isUsingFallback: false, region_id: null
  });

  // ── Territory Session State ─────────────────────────────────────────
  const [territoryId, setTerritoryId] = useState(null);
  const [territoryInfo, setTerritoryInfo] = useState(null);
  const [isOutOfBounds, setIsOutOfBounds] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [isLocationReady, setIsLocationReady] = useState(false);
  const [hierarchy, setHierarchy] = useState({ STATES: [], DISTRICTS: {}, TERRITORIES: [] });
  const [isHierarchyLoading, setIsHierarchyLoading] = useState(true);

  // ── Resolve GPS → Territory via /zones/resolve ──────────────────────
  const resolveTerritory = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/zones/resolve?lat=${lat}&lng=${lng}`);
      const data = await res.json();

      if (data.success && !data.outOfBounds && data.territory) {
        setTerritoryId(data.territory.id);
        setTerritoryInfo(data.territory);
        setIsOutOfBounds(false);
        setShowLocationModal(false);

        // Persist to localStorage
        localStorage.setItem('territoryId', data.territory.id);
        localStorage.setItem('territoryInfo', JSON.stringify(data.territory));

        return data.territory;
      } else {
        setIsOutOfBounds(true);
        setShowLocationModal(true);
        return null;
      }
    } catch (e) {
      console.warn('[LocationContext] Territory resolve failed:', e.message);
      setIsOutOfBounds(true);
      setShowLocationModal(true);
      return null;
    }
  }, []);

  // ── Resolve by Pincode ──────────────────────────────────────────────
  const resolveByPincode = useCallback(async (pincode) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/zones/resolve?pincode=${pincode}`);
      const data = await res.json();

      if (data.success && !data.outOfBounds && data.territory) {
        setTerritoryId(data.territory.id);
        setTerritoryInfo(data.territory);
        setIsOutOfBounds(false);
        setShowLocationModal(false);

        const updated = {
          ...location, pincode, addressLabel: `${data.territory.name}, ${data.territory.district}`,
          isUsingFallback: false, region_id: data.territory.id
        };
        setLocation(updated);
        localStorage.setItem('user_location', JSON.stringify(updated));
        localStorage.setItem('territoryId', data.territory.id);
        localStorage.setItem('territoryInfo', JSON.stringify(data.territory));

        return data.territory;
      }
      return null;
    } catch (e) {
      console.warn('[LocationContext] Pincode resolve failed:', e.message);
      return null;
    }
  }, [location]);

  // ── Fetch hierarchy ─────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(`${API_URL}/api/v1/zones/hierarchy`, { signal: controller.signal })
      .then(res => { clearTimeout(timeoutId); if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); })
      .then(data => { if (data.success) setHierarchy(data.data); })
      .catch(() => {})
      .finally(() => setIsHierarchyLoading(false));

    return () => { controller.abort(); clearTimeout(timeoutId); };
  }, []);

  // ── Initialize: restore saved territory or auto-detect ──────────────
  useEffect(() => {
    // Check saved territory first
    const savedTerritoryId = localStorage.getItem('territoryId');
    const savedTerritoryInfo = localStorage.getItem('territoryInfo');
    const savedLoc = localStorage.getItem('user_location');

    if (savedTerritoryId && savedTerritoryInfo) {
      try {
        setTerritoryId(savedTerritoryId);
        setTerritoryInfo(JSON.parse(savedTerritoryInfo));
        setIsOutOfBounds(false);
      } catch (e) {}
    }

    if (savedLoc) {
      try {
        const parsed = JSON.parse(savedLoc);
        setLocation(parsed);
        setIsLocationReady(true);
        // If we have coords but no territory, resolve
        if (!savedTerritoryId && parsed.lat && parsed.lng) {
          resolveTerritory(parsed.lat, parsed.lng);
        }
        return;
      } catch (e) {}
    }

    // Auto-detect GPS
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const newLoc = { lat, lng, pincode: '', addressLabel: 'Current GPS Location', isUsingFallback: false, region_id: null };
          setLocation(newLoc);
          setIsLocationReady(true);

          // Resolve territory from GPS
          const territory = await resolveTerritory(lat, lng);
          if (territory) {
            newLoc.region_id = territory.id;
            newLoc.pincode = territory.pincode;
            newLoc.addressLabel = `${territory.name}, ${territory.district}`;
            setLocation(newLoc);
            localStorage.setItem('user_location', JSON.stringify(newLoc));
          }
        },
        () => {
          // GPS denied — show location picker
          setLocation({
            lat: 18.5793, lng: 73.8965, pincode: '411015',
            addressLabel: 'Select your location', isUsingFallback: true, region_id: null
          });
          setIsLocationReady(true);
          if (!savedTerritoryId) setShowLocationModal(true);
        }
      );
    } else {
      setLocation({
        lat: 18.5793, lng: 73.8965, pincode: '411015',
        addressLabel: 'Select your location', isUsingFallback: true, region_id: null
      });
      setIsLocationReady(true);
      if (!savedTerritoryId) setShowLocationModal(true);
    }
  }, [resolveTerritory]);

  const updateLocation = (newLocation) => {
    const updated = { ...location, ...newLocation, isUsingFallback: false };
    setLocation(updated);
    localStorage.setItem('user_location', JSON.stringify(updated));
  };

  return (
    <LocationContext.Provider value={{
      location, isLocationReady, updateLocation,
      STATES: hierarchy.STATES, DISTRICTS: hierarchy.DISTRICTS,
      TERRITORIES: hierarchy.TERRITORIES, isHierarchyLoading,
      // Territory routing state
      territoryId, territoryInfo, isOutOfBounds,
      showLocationModal, setShowLocationModal,
      resolveTerritory, resolveByPincode
    }}>
      {children}
    </LocationContext.Provider>
  );
};
