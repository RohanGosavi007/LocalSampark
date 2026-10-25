"use client";

import React, { useState } from 'react';
import { useZone } from '../context/ZoneContext';

/**
 * The visitor's zone, and a way to detect it. It listed three hard-coded
 * "popular zones" with made-up ids; zones come from the API now
 * (ZoneContext → GET /zones/resolve).
 */
export default function ZoneSelector() {
  const { activeZone, autoDetectZone, isLocating, detection } = useZone();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative z-50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full transition-colors font-medium text-sm border border-indigo-200"
      >
        <span className="text-lg">📍</span>
        <span>{activeZone ? `${activeZone.name}${activeZone.city ? `, ${activeZone.city}` : ''}` : 'Choose your area'}</span>
        <span className="text-xs ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-100">
            <button
              onClick={autoDetectZone}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-70"
            >
              <span>{isLocating ? 'Locating...' : '🎯 Detect My Location'}</span>
            </button>
          </div>
          <div className="p-3 text-sm text-gray-600">
            {detection && detection.error && <p className="text-red-600">{detection.error}</p>}
            {detection && detection.outOfBounds && (
              <p>
                LocalSampark is not in your area yet.
                {detection.nearest ? ` The nearest area we serve is ${detection.nearest.name} (${detection.nearest.pincode}), about ${Math.round(detection.nearest.distance_km)} km away.` : ''}
              </p>
            )}
            {activeZone && !detection && <p>Showing shops and services in {activeZone.name}{activeZone.pincode ? ` (${activeZone.pincode})` : ''}.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
