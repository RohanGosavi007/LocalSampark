"use client";

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../context/AuthContext';
import { io } from 'socket.io-client';

// Fix Leaflet's default icon path issues in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Icons for different statuses
const createIcon = (color) => {
  return new L.DivIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
};

const iconOnline = createIcon('#22c55e'); // green
const iconOffline = createIcon('#ef4444'); // red
const iconDelivery = createIcon('#eab308'); // yellow

export default function LogisticsMap() {
  const { API_URL } = useAuth();
  const [agents, setAgents] = useState([]);
  const [demandZones, setDemandZones] = useState([
    { id: 1, lat: 18.5204, lng: 73.8567, intensity: 500, label: 'High Demand Zone' },
    { id: 2, lat: 18.5538, lng: 73.9477, intensity: 300, label: 'Surge: 1.5x' }
  ]); // Mocked surge zones

  useEffect(() => {
    // 1. Initial Fetch (mocked or real)
    // For demo, we'll populate some mock agents
    setAgents([
      { id: 'a1', name: 'Ramesh K.', lat: 18.5254, lng: 73.8517, status: 'online', battery: 85 },
      { id: 'a2', name: 'Suresh D.', lat: 18.5304, lng: 73.8667, status: 'on_delivery', battery: 42 },
      { id: 'a3', name: 'Rahul V.', lat: 18.5104, lng: 73.8467, status: 'offline', battery: 10 }
    ]);

    // 2. Setup WebSocket for Live Telemetry
    const socketUrl = API_URL.replace('/api/v1', '');
    const socket = io(socketUrl, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('admin:logistics:subscribe');
    });

    socket.on('telemetry:update', (data) => {
      // data: { agentId, lat, lng, speed, heading, status }
      setAgents(prev => {
        const existingIndex = prev.findIndex(a => a.id === data.agentId);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = { ...updated[existingIndex], ...data };
          return updated;
        } else {
          return [...prev, data];
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [API_URL]);

  return (
    <div style={{ height: '100%', width: '100%', position: 'absolute', top: 0, left: 0 }}>
      <MapContainer 
        center={[18.5204, 73.8567]} // Pune coordinates
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />

        {/* Render Surge/Demand Zones */}
        {demandZones.map(zone => (
          <Circle
            key={`zone-${zone.id}`}
            center={[zone.lat, zone.lng]}
            radius={zone.intensity}
            pathOptions={{ color: 'red', fillColor: '#ef4444', fillOpacity: 0.2, weight: 0 }}
          >
            <Popup>
              <strong>{zone.label}</strong><br/>
              Radius: {zone.intensity}m
            </Popup>
          </Circle>
        ))}

        {/* Render Live Agent Markers */}
        {agents.map(agent => {
          let icon = iconOffline;
          if (agent.status === 'online') icon = iconOnline;
          else if (agent.status === 'on_delivery') icon = iconDelivery;

          return (
            <Marker 
              key={agent.id} 
              position={[agent.lat, agent.lng]}
              icon={icon}
            >
              <Popup>
                <div className="text-sm">
                  <strong>{agent.name}</strong><br/>
                  Status: <span className="capitalize">{agent.status.replace('_', ' ')}</span><br/>
                  Battery: {agent.battery}%<br/>
                  {agent.speed !== undefined && `Speed: ${agent.speed} km/h`}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
