import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const runnerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function DeliveryMap({ coords }) {
  const [runnerPos, setRunnerPos] = useState([18.5800, 73.8800]);

  useEffect(() => {
    // Simulate runner moving
    const interval = setInterval(() => {
        setRunnerPos(prev => [prev[0] + 0.0001, prev[1] + 0.0001]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  if (!coords || !coords.pickup || !coords.dropoff) {
      return (
          <MapContainer center={[18.57, 73.87]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 10 }}>
            <TileLayer
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                attribution='&copy; OpenStreetMap contributors'
            />
          </MapContainer>
      );
  }

  const center = runnerPos;
  
  // Create a polyline path from Pickup -> Dropoff
  const path = [coords.pickup, coords.dropoff];

  return (
    <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%', zIndex: 10 }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      <Marker position={coords.pickup} icon={pickupIcon}>
        <Popup><strong>Pickup</strong></Popup>
      </Marker>
      
      <Marker position={coords.dropoff} icon={dropoffIcon}>
        <Popup><strong>Dropoff</strong></Popup>
      </Marker>
      
      <Marker position={runnerPos} icon={runnerIcon}>
        <Popup><strong>You are here</strong></Popup>
      </Marker>

      <Polyline positions={path} color="#3b82f6" weight={5} dashArray="5, 10" />
    </MapContainer>
  );
}
