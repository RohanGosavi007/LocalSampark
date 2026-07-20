'use client';
import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Map, MapPin, Truck, Navigation, Search } from 'lucide-react';

export default function AdminLiveDeliveryMap() {
  const [activeDeliveries, setActiveDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulated fetching from admin API for active deliveries
    setTimeout(() => {
      setActiveDeliveries([
        { id: 'DEL-101', agent: 'Ramesh K.', status: 'en_route', eta: '10 mins', origin: 'Sharma Store', dest: 'Galaxy Apt' },
        { id: 'DEL-102', agent: 'Suresh M.', status: 'picking_up', eta: '-- mins', origin: 'Fresh Bites', dest: 'Lotus Society' },
        { id: 'DEL-103', agent: 'Rahul D.', status: 'en_route', eta: '5 mins', origin: 'QuickMeds', dest: 'Park Street' },
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg z-10 relative">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4"><Map className="w-5 h-5 text-primary"/> Live Tracking</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search agent or order..." className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loading ? (
              <div className="flex justify-center p-8"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div></div>
            ) : (
              activeDeliveries.map(del => (
                <div key={del.id} className="p-3 bg-white border border-gray-200 rounded-xl hover:border-primary/50 cursor-pointer transition-all shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-gray-900 text-sm">{del.agent}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${del.status === 'en_route' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {del.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600 mb-1">
                    <MapPin className="w-3 h-3 text-red-500" /> {del.origin} <span className="text-gray-300">→</span> {del.dest}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary">
                    <Navigation className="w-3 h-3" /> ETA: {del.eta}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Area */}
        <div className="flex-1 relative bg-blue-50/50 flex items-center justify-center">
          {/* Simulated Map Background - normally you'd use react-leaflet or google-maps */}
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cartographer.png')]"></div>
          
          <div className="z-10 text-center">
            <Map className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-400">Interactive Map View</h3>
            <p className="text-gray-400 text-sm max-w-sm mx-auto mt-2">
              (Map rendering requires Google Maps API or Leaflet. Simulated for prototype.)
            </p>
          </div>

          {/* Simulated Pins */}
          {!loading && (
            <>
              <div className="absolute top-[30%] left-[40%] animate-bounce">
                <Truck className="w-8 h-8 text-blue-600 fill-white" />
                <div className="bg-white text-[10px] font-bold px-1 rounded shadow-md text-center mt-1">Ramesh K.</div>
              </div>
              <div className="absolute top-[60%] left-[55%] animate-bounce" style={{animationDelay: '0.2s'}}>
                <Truck className="w-8 h-8 text-blue-600 fill-white" />
                <div className="bg-white text-[10px] font-bold px-1 rounded shadow-md text-center mt-1">Rahul D.</div>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
