"use client";

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '../../../context/AuthContext';

// Dynamically import the actual map component to avoid SSR issues with Leaflet
const MapComponent = dynamic(() => import('../../../components/LogisticsMap'), { ssr: false });

export default function AdminLogisticsPage() {
  const { user } = useAuth();
  
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Unauthorized</h1>
          <p className="text-gray-600 mt-2">Only administrators can access the Logistics God's Eye view.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-white shadow px-6 py-4 flex items-center justify-between z-10">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logistics God's Eye View</h1>
          <p className="text-sm text-gray-500">Real-time fleet monitoring and telemetry</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-sm text-gray-700">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="text-sm text-gray-700">On Delivery</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="text-sm text-gray-700">Offline</span>
          </div>
        </div>
      </header>
      
      <main className="flex-1 relative">
        <MapComponent />
      </main>
    </div>
  );
}
