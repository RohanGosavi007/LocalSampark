import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon path issues in Next.js
const shopIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const driverIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function OrderMap({ coords, status }) {
  if (!coords || !coords.shop || !coords.user) return null;

  const center = coords.driver || coords.shop;
  
  // Create a polyline path from Shop -> Driver -> User
  const path = status === 'out_for_delivery' && coords.driver 
    ? [coords.shop, coords.driver, coords.user]
    : [coords.shop, coords.user];

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%', zIndex: 10 }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      
      <Marker position={coords.shop} icon={shopIcon}>
        <Popup>
          <strong>Shop Location</strong>
        </Popup>
      </Marker>
      
      <Marker position={coords.user} icon={userIcon}>
        <Popup>
          <strong>Delivery Location</strong>
        </Popup>
      </Marker>
      
      {status === 'out_for_delivery' && coords.driver && (
          <Marker position={coords.driver} icon={driverIcon}>
            <Popup>
              <strong>Driver Location</strong>
            </Popup>
          </Marker>
      )}

      <Polyline positions={path} color="#10b981" weight={4} dashArray="10, 10" />
    </MapContainer>
  );
}
