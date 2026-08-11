'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Package, MapPin, CheckCircle, Navigation, Phone } from 'lucide-react';
import io from 'socket.io-client';

export default function RiderDashboard() {
  const [rider, setRider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // 1. Mock Register / Login
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    
    async function initRider() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/logistics/riders/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Rahul Delivery', phone: '9876543210' })
        });
        const data = await res.json();
        if (data.success) {
          setRider(data.rider);
          
          // Connect Socket
          const s = io(BACKEND_URL);
          setSocket(s);

          // Mock Live Location Updates
          let lat = 18.5204;
          let lng = 73.8567;
          
          setInterval(() => {
            lat += 0.0001; // simulate movement
            lng += 0.0001;
            fetch(`${BACKEND_URL}/api/v1/logistics/riders/${data.rider.id}/location`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude: lat, longitude: lng, order_id: 'ORD-CURRENT' })
            });
          }, 5000);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    
    initRider();

    return () => {
      if (socket) socket.disconnect();
    };
  }, []);

  if (loading) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Rider Dashboard...</div>;

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <div className="max-w-md mx-auto pt-24 px-4 pb-20">
        
        {/* Profile Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-500/30 text-2xl">
              🚴
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">{rider?.name}</h1>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> Online
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-400">Earnings</p>
            <p className="text-xl font-bold text-green-400">₹450</p>
          </div>
        </div>

        {/* Current Delivery */}
        <h2 className="text-lg font-bold text-white mb-4">Current Delivery</h2>
        <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-6 relative overflow-hidden shadow-[0_0_15px_rgba(59,130,246,0.15)]">
          <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
            Active
          </div>
          
          <div className="mb-6">
            <h3 className="text-xl font-bold text-white">Order #ORD-CURRENT</h3>
            <p className="text-slate-400">Grocery Mart • 2.4 km away</p>
          </div>

          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-3 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-800 mb-6">
            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-slate-900 bg-blue-500 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-800/50">
                <h4 className="font-bold text-white text-sm">Pickup</h4>
                <p className="text-slate-400 text-xs">Shop: Grocery Mart (Sector 4)</p>
              </div>
            </div>

            <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-4 border-slate-900 bg-slate-700 text-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10"></div>
              <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800 bg-slate-900">
                <h4 className="font-bold text-slate-300 text-sm">Drop-off</h4>
                <p className="text-slate-500 text-xs">Customer: Rohit (Apt 402)</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6 pt-6 border-t border-slate-800">
            <button className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
              <Phone size={18} /> Call
            </button>
            <button className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-colors">
              <Navigation size={18} /> Navigate
            </button>
          </div>
          <button className="w-full mt-3 bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 transition-colors">
            <CheckCircle size={20} /> Mark Delivered
          </button>
        </div>

      </div>
    </div>
  );
}
