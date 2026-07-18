"use client";

import React, { useState } from 'react';
import { useZone } from '../context/ZoneContext';

export default function ZoneSelector() {
  const { activeZone, autoDetectZone, isLocating, changeZone } = useZone();
  const [isOpen, setIsOpen] = useState(false);

  // Mock zones for testing
  const availableZones = [
    { id: '1', name: 'Dhanori', city: 'Pune', state: 'Maharashtra', pincode: '411015' },
    { id: '2', name: 'Kothrud', city: 'Pune', state: 'Maharashtra', pincode: '411038' },
    { id: '3', name: 'Andheri West', city: 'Mumbai', state: 'Maharashtra', pincode: '400053' },
  ];

  if (!activeZone) return null;

  return (
    <div className="relative z-50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full transition-colors font-medium text-sm border border-indigo-200"
      >
        <span className="text-lg">📍</span>
        <span>{activeZone.name}, {activeZone.city}</span>
        <span className="text-xs ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-3 bg-gray-50 border-b border-gray-100">
            <button 
              onClick={() => {
                autoDetectZone();
                setIsOpen(false);
              }}
              disabled={isLocating}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-70"
            >
              <span>{isLocating ? 'Locating...' : '🎯 Auto-Detect My Location'}</span>
            </button>
          </div>
          
          <div className="max-h-64 overflow-y-auto p-2">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 pt-2">
              Popular Zones
            </div>
            {availableZones.map(zone => (
              <button
                key={zone.id}
                onClick={() => {
                  changeZone(zone);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                  activeZone.id === zone.id 
                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span>{zone.name}</span>
                  <span className="text-xs text-gray-400">{zone.pincode}</span>
                </div>
                <div className="text-xs text-gray-500">{zone.city}, {zone.state}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
