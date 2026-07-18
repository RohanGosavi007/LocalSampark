import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const medicalIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const bloodIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function SOSMap({ alerts }) {
  // Dhanori center
  const center = [18.5793, 73.8780];

  return (
    <MapContainer center={center} zoom={14} style={{ height: '100%', width: '100%', zIndex: 10 }}>
      {/* Dark theme map tiles for dashboard feel */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; OpenStreetMap contributors &copy; CARTO'
      />
      
      {alerts.map(alert => (
        <React.Fragment key={alert.id}>
            <Marker 
                position={[alert.latitude, alert.longitude]} 
                icon={alert.type === 'Blood' ? bloodIcon : medicalIcon}
            >
                <Popup>
                    <div className="font-bold text-slate-800">{alert.full_name}</div>
                    <div className="text-xs">{alert.type} Emergency</div>
                </Popup>
            </Marker>
            <Circle 
                center={[alert.latitude, alert.longitude]}
                radius={300}
                pathOptions={{ 
                    color: alert.type === 'Blood' ? '#e11d48' : '#ef4444', 
                    fillColor: alert.type === 'Blood' ? '#e11d48' : '#ef4444', 
                    fillOpacity: 0.1 
                }}
            />
        </React.Fragment>
      ))}
    </MapContainer>
  );
}
