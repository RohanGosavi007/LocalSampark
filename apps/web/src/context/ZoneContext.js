"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';

const ZoneContext = createContext(null);

/**
 * The visitor's service zone (territory).
 *
 * This defaulted every visitor to "Dhanori, Pune", and "auto-detect" ignored
 * the location it read and set "Detected Zone (Dhanori)" for everyone,
 * wherever they were. Detection now asks the API which territory contains the
 * visitor's position (GET /zones/resolve); outside every territory it says so
 * and offers the nearest. With nothing chosen, there is no zone.
 */
export const ZoneProvider = ({ children }) => {
  const [activeZone, setActiveZone] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [detection, setDetection] = useState(null); // { outOfBounds, nearest, error }

  useEffect(() => {
    try {
      const savedZone = localStorage.getItem('ls_active_zone');
      if (savedZone) setActiveZone(JSON.parse(savedZone));
    } catch (e) {
      localStorage.removeItem('ls_active_zone');
    }
  }, []);

  const changeZone = (zoneData) => {
    setActiveZone(zoneData);
    if (zoneData) localStorage.setItem('ls_active_zone', JSON.stringify(zoneData));
    else localStorage.removeItem('ls_active_zone');
  };

  const autoDetectZone = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setDetection({ error: 'This browser cannot share your location.' });
      return;
    }
    setIsLocating(true);
    setDetection(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await apiGet(`/zones/resolve?lat=${latitude}&lng=${longitude}`);
          if (res.territory) {
            const t = res.territory;
            changeZone({ id: t.id, name: t.name, city: t.district || t.taluka || '', state: t.state || '', pincode: t.pincode, lat: latitude, lng: longitude });
            setDetection({ outOfBounds: false });
          } else {
            setDetection({ outOfBounds: true, nearest: res.nearest || null });
          }
        } catch (error) {
          setDetection({ error: error.message || 'Your zone could not be found.' });
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        setDetection({ error: error && error.code === 1 ? 'Location permission was refused.' : 'Your location could not be found.' });
        setIsLocating(false);
      }
    );
  };

  return (
    <ZoneContext.Provider value={{ activeZone, changeZone, autoDetectZone, isLocating, detection }}>
      {children}
    </ZoneContext.Provider>
  );
};

export const useZone = () => useContext(ZoneContext);
