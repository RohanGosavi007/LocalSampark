'use client';
import React, { useEffect, useRef, useState } from 'react';
import Header from '../../components/Header';
import { Map as MapIcon, Users, Store, TrendingUp, AlertTriangle } from 'lucide-react';


export default function TerritoryManager() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [territories, setTerritories] = useState([]);

  useEffect(() => {
    // 1. Fetch Territories Data
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    fetch(`${BACKEND_URL}/api/v1/territory/map`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setTerritories(data.territories);
        }
      });

    // 2. Initialize Mapbox via CDN
    const initMapbox = () => {
      if (typeof window === 'undefined' || !window.mapboxgl) return;
      
      // We use a public default token for demo purposes (Replace with env variable in production)
      window.mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || 'YOUR_MAPBOX_TOKEN_HERE'; // Demo token or prompt user to add theirs

      if (map.current) return; // initialize map only once
      map.current = new window.mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [73.8567, 18.5204], // Pune coords
        zoom: 11
      });

      map.current.on('load', () => {
        // Draw territories once loaded
        territories.forEach((t, i) => {
          if (!map.current.getSource(`territory-${t.id}`)) {
            map.current.addSource(`territory-${t.id}`, {
              type: 'geojson',
              data: {
                type: 'Feature',
                geometry: {
                  type: 'Polygon',
                  coordinates: [t.polygon]
                }
              }
            });
            map.current.addLayer({
              id: `territory-fill-${t.id}`,
              type: 'fill',
              source: `territory-${t.id}`,
              layout: {},
              paint: {
                'fill-color': t.color,
                'fill-opacity': 0.3
              }
            });
            map.current.addLayer({
              id: `territory-line-${t.id}`,
              type: 'line',
              source: `territory-${t.id}`,
              layout: {},
              paint: {
                'line-color': t.color,
                'line-width': 3
              }
            });
          }
        });
      });
    };

    // Load Mapbox GL JS Script dynamically
    if (!document.getElementById('mapbox-gl-js')) {
      const script = document.createElement('script');
      script.id = 'mapbox-gl-js';
      script.src = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js';
      script.onload = initMapbox;
      document.head.appendChild(script);

      const link = document.createElement('link');
      link.href = 'https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    } else {
      initMapbox();
    }
  }, [territories]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex pt-16">
        
        {/* Sidebar */}
        <div className="w-96 bg-card-bg border-r border-border p-6 overflow-y-auto flex flex-col">
          <h1 className="text-2xl font-bold text-text mb-6 flex items-center gap-2">
            <MapIcon className="text-blue-500" /> Territory Manager
          </h1>
          
          <div className="space-y-4">
            {territories.map(t => (
              <div key={t.id} className="bg-background border border-border rounded-xl p-4 hover:border-slate-600 transition-colors cursor-pointer group">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }}></div>
                  <h3 className="font-bold text-text text-lg">{t.name}</h3>
                </div>
                <p className="text-text-muted text-sm mb-4">Franchise: <span className="text-slate-200">{t.franchiseOwner}</span></p>
                
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-background-alt rounded-lg p-2 text-center">
                    <Store size={14} className="mx-auto text-blue-400 mb-1" />
                    <p className="text-text font-bold text-sm">{t.stats.shops}</p>
                  </div>
                  <div className="bg-background-alt rounded-lg p-2 text-center">
                    <TrendingUp size={14} className="mx-auto text-green-400 mb-1" />
                    <p className="text-text font-bold text-sm">{t.stats.orders}</p>
                  </div>
                  <div className="bg-background-alt rounded-lg p-2 text-center">
                    <Users size={14} className="mx-auto text-purple-400 mb-1" />
                    <p className="text-text font-bold text-sm">{t.stats.revenue}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button className="mt-auto bg-card-bg hover:bg-background-alt text-text font-bold py-4 rounded-xl border border-border transition-colors">
            + Define New Territory
          </button>
        </div>

        {/* Mapbox Container */}
        <div className="flex-1 relative bg-background-alt">
          <div ref={mapContainer} className="absolute inset-0" />
          
          {/* Overlay Stats */}
          <div className="absolute top-6 right-6 bg-card-bg/90 backdrop-blur-md border border-border rounded-xl p-4 shadow-2xl pointer-events-none">
            <h4 className="text-text-muted text-xs font-bold uppercase tracking-wider mb-2">Network Health</h4>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                <span className="text-text font-bold">All Systems Nominal</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
