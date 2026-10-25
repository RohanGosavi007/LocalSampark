import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { supabase } from '../../../lib/supabase';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const pickupIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const dropoffIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

const runnerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export default function TrackingMap({ pickup, dropoff, runnerStart }) {
  const [runnerPos, setRunnerPos] = useState(runnerStart || [18.5800, 73.8800]);

  useEffect(() => {
    // Subscribe to Supabase Realtime for this order's tracking updates
    const channel = supabase
      .channel('delivery_tracking')
      .on(
        'broadcast',
        { event: 'location_update' },
        (payload) => {
          if (payload.payload && payload.payload.lat && payload.payload.lng) {
            setRunnerPos([payload.payload.lat, payload.payload.lng]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <MapContainer center={runnerPos} zoom={15} style={{ height: '100%', width: '100%', zIndex: 10 }}>
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      
      {pickup && (
          <Marker position={pickup} icon={pickupIcon}>
            <Popup><strong>Shop</strong></Popup>
          </Marker>
      )}
      
      {dropoff && (
          <Marker position={dropoff} icon={dropoffIcon}>
            <Popup><strong>Delivery Location</strong></Popup>
          </Marker>
      )}
      
      <Marker position={runnerPos} icon={runnerIcon}>
        <Popup><strong>Delivery Partner</strong></Popup>
      </Marker>

      {pickup && dropoff && (
          <Polyline positions={[pickup, runnerPos, dropoff]} color="#3b82f6" weight={4} dashArray="5, 10" />
      )}
    </MapContainer>
  );
}
