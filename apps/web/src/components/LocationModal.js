'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from '../../context/LocationContext';
import { API_URL } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Search, X, ChevronRight, Navigation, Loader2 } from 'lucide-react';

/**
 * LocationModal — "Select Your Delivery Location"
 * Shown when user is out-of-bounds, GPS denied, or no territory locked.
 */
export default function LocationModal() {
  const { showLocationModal, setShowLocationModal, resolveByPincode, resolveTerritory } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Debounced search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/zones/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.data || []);
      } catch (e) { console.warn('Search failed:', e); }
      setIsSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = async (zone) => {
    const pincode = zone.pincode || zone.pin;
    if (pincode) {
      await resolveByPincode(pincode);
    }
    setShowLocationModal(false);
  };

  const handleDetectGPS = async () => {
    setIsDetecting(true);
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
      });
      await resolveTerritory(pos.coords.latitude, pos.coords.longitude);
      setShowLocationModal(false);
    } catch (e) {
      alert('Could not detect your location. Please search manually.');
    }
    setIsDetecting(false);
  };

  if (!showLocationModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[9999] flex items-center justify-center"
        style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="relative w-full max-w-md mx-4 rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 25px 50px rgba(0,0,0,0.5)'
          }}
        >
          {/* Header */}
          <div className="p-6 pb-4">
            <button
              onClick={() => setShowLocationModal(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #e94560, #ff6b6b)' }}>
                <MapPin size={20} color="white" />
              </div>
              <div>
                <h2 className="text-white text-lg font-bold">Select Delivery Location</h2>
                <p className="text-white/50 text-sm">Search by pincode or area name</p>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="px-6 pb-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text" autoFocus
                placeholder="Enter pincode or area name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl text-white placeholder-white/40 outline-none"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
              />
              {isSearching && <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 animate-spin" />}
            </div>
          </div>

          {/* GPS Detect Button */}
          <div className="px-6 pb-3">
            <button onClick={handleDetectGPS} disabled={isDetecting}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition hover:bg-white/10"
              style={{ border: '1px dashed rgba(255,255,255,0.2)' }}>
              {isDetecting ? <Loader2 size={18} className="text-blue-400 animate-spin" /> : <Navigation size={18} className="text-blue-400" />}
              <span className="text-blue-400 text-sm font-medium">
                {isDetecting ? 'Detecting location...' : 'Use my current location'}
              </span>
            </button>
          </div>

          {/* Results */}
          <div className="px-6 pb-6 max-h-60 overflow-y-auto">
            {searchResults.map((zone, i) => (
              <motion.button
                key={zone.id || i}
                initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => handleSelectLocation(zone)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 text-left transition hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.05)' }}
              >
                <div>
                  <p className="text-white text-sm font-medium">{zone.name}</p>
                  <p className="text-white/40 text-xs">{zone.district} • {zone.pincode}</p>
                </div>
                <ChevronRight size={16} className="text-white/30" />
              </motion.button>
            ))}
            {searchQuery.length >= 2 && searchResults.length === 0 && !isSearching && (
              <p className="text-center text-white/30 text-sm py-4">No locations found</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
