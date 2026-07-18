"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

const ZoneContext = createContext(null);

export const ZoneProvider = ({ children }) => {
  const [activeZone, setActiveZone] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    // On mount, check if there's a saved zone
    const savedZone = localStorage.getItem('ls_active_zone');
    if (savedZone) {
      try {
        setActiveZone(JSON.parse(savedZone));
      } catch (e) {
        console.error('Failed to parse saved zone', e);
      }
    } else {
      // Default fallback
      setActiveZone({
        id: '1',
        name: 'Dhanori',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411015',
        lat: 18.5753,
        lng: 73.8938
      });
    }
  }, []);

  const changeZone = (zoneData) => {
    setActiveZone(zoneData);
    localStorage.setItem('ls_active_zone', JSON.stringify(zoneData));
  };

  const autoDetectZone = () => {
    setIsLocating(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const { latitude, longitude } = position.coords;
            // Here we would call our backend to match the closest region in our DB
            // const res = await fetch(`/api/v1/regions/nearest?lat=${latitude}&lng=${longitude}`);
            // const zoneData = await res.json();
            
            // For now, mock a successful detection to Dhanori if they are near Pune
            const detected = {
              id: '1',
              name: 'Detected Zone (Dhanori)',
              city: 'Pune',
              state: 'Maharashtra',
              pincode: '411015',
              lat: latitude,
              lng: longitude
            };
            changeZone(detected);
          } catch (error) {
            console.error('Zone auto-detection failed:', error);
          } finally {
            setIsLocating(false);
          }
        },
        (error) => {
          console.error('Geolocation error:', error);
          setIsLocating(false);
        }
      );
    } else {
      setIsLocating(false);
    }
  };

  return (
    <ZoneContext.Provider value={{ activeZone, changeZone, autoDetectZone, isLocating }}>
      {children}
    </ZoneContext.Provider>
  );
};

export const useZone = () => useContext(ZoneContext);
