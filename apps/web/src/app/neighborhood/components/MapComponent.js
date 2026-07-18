'use client';
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const mockShops = [
  { id: 1, name: 'Sharma Grocery & Daily Needs', type: 'grocery', lat: 18.5793, lng: 73.8780, status: 'open' },
  { id: 2, name: 'QuickFix Garage', type: 'services', lat: 18.5750, lng: 73.8800, status: 'busy' },
  { id: 3, name: 'Sanjeevani Pharmacy', type: 'health', lat: 18.5710, lng: 73.8820, status: 'open' },
  { id: 4, name: 'Cafe Coffee Day', type: 'food', lat: 18.5800, lng: 73.8750, status: 'promo' },
];

export default function MapComponent({ filter }) {
  // Dhanori center coordinates
  const position = [18.5793, 73.8780];

  const filteredShops = filter === 'all' 
    ? mockShops 
    : mockShops.filter(shop => shop.type === filter);

  return (
    <MapContainer 
      center={position} 
      zoom={14} 
      style={{ height: '100%', width: '100%', zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" // Clean modern map style
      />
      
      {filteredShops.map(shop => (
        <Marker key={shop.id} position={[shop.lat, shop.lng]}>
          <Popup>
            <div className="font-sans">
              <strong className="block text-sm mb-1">{shop.name}</strong>
              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${
                shop.status === 'open' ? 'bg-green-500' : 
                shop.status === 'busy' ? 'bg-red-500' : 'bg-blue-500'
              }`}>
                {shop.status}
              </span>
              <a href={`/shops/${shop.id}`} className="block mt-2 text-primary font-bold text-xs hover:underline">View Shop →</a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
