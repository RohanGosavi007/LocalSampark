'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { useSearchParams } from 'next/navigation';
import { Package, Clock, Truck, CheckCircle, MapPin } from 'lucide-react';
import io from 'socket.io-client';

export default function TrackingPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('order_id');
  
  const [status, setStatus] = useState('accepted'); // pending, accepted, preparing, dispatched, delivered
  const [riderLocation, setRiderLocation] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!orderId) return;

    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const s = io(BACKEND_URL);
    setSocket(s);

    s.emit('join_order_room', orderId);

    s.on('ORDER_STATUS_CHANGED', (data) => {
      setStatus(data.status);
    });

    s.on('RIDER_LOCATION_UPDATE', (data) => {
      setRiderLocation({ lat: data.latitude, lng: data.longitude });
    });

    return () => s.disconnect();
  }, [orderId]);

  const steps = [
    { id: 'accepted', label: 'Order Accepted', icon: CheckCircle },
    { id: 'preparing', label: 'Preparing', icon: Clock },
    { id: 'dispatched', label: 'Out for Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: Package },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === status) >= 0 ? steps.findIndex(s => s.id === status) : 0;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <div className="max-w-2xl mx-auto pt-24 px-4 pb-20">
        
        <h1 className="text-2xl font-bold text-white mb-2">Track Order</h1>
        <p className="text-slate-400 mb-8">#{orderId}</p>

        {/* Progress Tracker */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 mb-8">
          <div className="relative">
            <div className="absolute left-[28px] top-0 bottom-0 w-1 bg-slate-800 rounded"></div>
            <div className="space-y-8 relative">
              {steps.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;
                
                return (
                  <div key={step.id} className="flex items-center gap-6 relative z-10">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center border-4 border-slate-900 transition-colors ${isCompleted ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500'}`}>
                      <Icon size={24} />
                    </div>
                    <div>
                      <h3 className={`text-lg font-bold ${isCompleted ? 'text-white' : 'text-slate-500'}`}>{step.label}</h3>
                      {isCurrent && <p className="text-blue-400 text-sm mt-1">Happening right now</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Live Map Box */}
        {status === 'dispatched' && (
          <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.15)]">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Live Tracking</h2>
              <span className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-900/30 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span> Live
              </span>
            </div>
            
            <div className="w-full h-64 bg-slate-800 rounded-xl relative flex items-center justify-center border border-slate-700 overflow-hidden">
              {/* Mock Map Background */}
              <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
              
              {riderLocation ? (
                <div className="text-center relative z-10">
                  <MapPin size={48} className="text-blue-500 mx-auto animate-bounce" />
                  <p className="mt-4 font-bold text-white bg-slate-900/80 px-4 py-2 rounded-full border border-slate-700">
                    Rider is {Math.floor(Math.random() * 5 + 1)} mins away
                  </p>
                  <p className="text-xs text-slate-400 mt-2">Lat: {riderLocation.lat.toFixed(4)} | Lng: {riderLocation.lng.toFixed(4)}</p>
                </div>
              ) : (
                <div className="text-center relative z-10 text-slate-400">
                  <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                  Waiting for rider location...
                </div>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center text-xl">👤</div>
              <div>
                <p className="font-bold text-white">Rahul (Delivery Partner)</p>
                <p className="text-sm text-slate-400">+91 98765 43210</p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
