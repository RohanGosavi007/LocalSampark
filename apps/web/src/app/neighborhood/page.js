'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Map, Navigation, Filter, MapPin, Store, Utensils, HeartPulse, Sparkles } from 'lucide-react';

const NeighborhoodMap = dynamic(() => import('./components/MapComponent'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-gray-100 animate-pulse flex flex-col items-center justify-center rounded-3xl border border-gray-200">
      <Map className="w-12 h-12 text-text-muted mb-4 animate-bounce" />
      <span className="font-bold text-text-muted">Loading Neighborhood Map...</span>
    </div>
  )
});

export default function NeighborhoodPage() {
  const [activeFilter, setActiveFilter] = useState('all');
  
  const filters = [
    { id: 'all', label: 'All Places', icon: MapPin },
    { id: 'grocery', label: 'Grocery & Retail', icon: Store },
    { id: 'food', label: 'Food & Cafes', icon: Utensils },
    { id: 'health', label: 'Healthcare', icon: HeartPulse },
    { id: 'services', label: 'Services', icon: Sparkles },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Navigation className="w-8 h-8 text-primary" />
              Explore Dhanori
            </h1>
            <p className="text-text-muted mt-2 font-medium">Discover local businesses, services, and live events around you.</p>
          </div>
          
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex gap-1 items-center">
              <Filter className="w-4 h-4 text-text-muted ml-2 shrink-0" />
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              {filters.map(filter => {
                const Icon = filter.icon;
                const isActive = activeFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    onClick={() => setActiveFilter(filter.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors ${
                      isActive 
                        ? 'bg-primary text-white shadow-sm' 
                        : 'bg-transparent text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 min-h-[600px] relative rounded-3xl overflow-hidden shadow-lg border-4 border-white bg-white">
          <NeighborhoodMap filter={activeFilter} />
          
          {/* Floating Action / Legend */}
          <div className="absolute bottom-6 left-6 right-6 md:right-auto bg-white/90 backdrop-blur p-4 rounded-2xl shadow-xl border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-3">Live in your area</h3>
            <div className="grid grid-cols-2 gap-3 text-sm font-medium">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div> Open Now</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-500"></div> High Demand</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Promotions</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-purple-500"></div> New Shops</div>
            </div>
          </div>
        </div>

      </main>
      
      <Footer />
    </div>
  );
}
