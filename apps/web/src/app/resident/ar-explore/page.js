'use client';
import React, { useState, useEffect } from 'react';
import { Camera, MapPin, Navigation, ShoppingBag, X, Zap, ChevronLeft, ChevronRight, Crosshair } from 'lucide-react';
import Link from 'next/link';

export default function ARDiscoveryPage() {
  const [panX, setPanX] = useState(50);
  const [selectedPin, setSelectedPin] = useState(null);

  // Simulated gyroscope/panning effect for desktop demo
  useEffect(() => {
    const handleMouseMove = (e) => {
      const percentage = (e.clientX / window.innerWidth) * 100;
      setPanX(percentage);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const pins = [
    {
      id: 1,
      shop: 'Balaji SuperMart',
      x: 20, // percentage position
      y: 40,
      scale: 1,
      tag: '50% Off Milk Today',
      color: 'bg-blue-600',
      distance: '50m'
    },
    {
      id: 2,
      shop: 'Pune Baking Co.',
      x: 70,
      y: 35,
      scale: 0.8,
      tag: 'Fresh Croissants 🥐',
      color: 'bg-orange-500',
      distance: '120m'
    },
    {
      id: 3,
      shop: 'Apollo Pharmacy',
      x: 90,
      y: 50,
      scale: 0.6,
      tag: 'First Aid Kits',
      color: 'bg-emerald-600',
      distance: '200m'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black z-50 font-sans text-white overflow-hidden">
      
      {/* Background Camera Feed (Simulated with a static street image) */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-75 ease-out"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1517646458010-ea6e714659f8?auto=format&fit=crop&q=80&w=2000")',
          transform: `scale(1.2) translateX(${(panX - 50) * -0.5}px)`
        }}
      ></div>
      
      {/* UI Overlay */}
      <div className="absolute inset-0 bg-black/20 pointer-events-none"></div>

      {/* Top Nav */}
      <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
        <Link href="/resident" className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors shadow-lg pointer-events-auto">
          <X size={24} />
        </Link>
        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold shadow-lg pointer-events-auto">
          <Navigation size={16} className="text-blue-400" />
          Heading: {Math.round(panX * 3.6)}° N
        </div>
        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] pointer-events-auto cursor-pointer animate-pulse">
          <Camera size={24} />
        </div>
      </div>

      {/* Center Crosshair */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-50 text-white flex flex-col items-center">
        <Crosshair size={48} strokeWidth={1} />
        <p className="text-[10px] mt-2 tracking-[0.2em] uppercase font-bold text-center">AR Scanner<br/>Active</p>
      </div>

      {/* Floating AR Pins */}
      <div 
        className="absolute inset-0 transition-transform duration-75 ease-out"
        style={{ transform: `translateX(${(panX - 50) * -1.5}px)` }}
      >
        {pins.map((pin) => (
          <div 
            key={pin.id}
            className={`absolute pointer-events-auto cursor-pointer group`}
            style={{ 
              left: `${pin.x}%`, 
              top: `${pin.y}%`,
              transform: `scale(${pin.scale})`
            }}
            onClick={() => setSelectedPin(pin)}
          >
            {/* The Floating Billboard */}
            <div className={`relative flex flex-col items-center animate-bounce-slow`}>
              
              {/* Distance Tag */}
              <div className="absolute -top-6 bg-black/80 backdrop-blur-md text-white text-[10px] font-black px-2 py-0.5 rounded-full border border-white/20 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity transform -translate-y-2 group-hover:translate-y-0">
                {pin.distance} away
              </div>
              
              {/* Main Billboard */}
              <div className={`${pin.color} text-white px-4 py-2 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col items-center gap-1 backdrop-blur-md bg-opacity-90 transition-transform group-hover:scale-110`}>
                <div className="flex items-center gap-2">
                  <MapPin size={14} />
                  <span className="font-black text-sm whitespace-nowrap">{pin.shop}</span>
                </div>
                <div className="bg-white/20 px-2 py-0.5 rounded text-xs font-bold whitespace-nowrap">
                  {pin.tag}
                </div>
              </div>

              {/* Anchor Line */}
              <div className="w-0.5 h-16 bg-gradient-to-b from-white/80 to-transparent mt-1"></div>
              {/* Ground Anchor Point */}
              <div className="w-6 h-2 bg-black/40 rounded-full blur-[2px] mt-1"></div>
              
            </div>
          </div>
        ))}
      </div>

      {/* Selected Shop Bottom Sheet */}
      {selectedPin && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl rounded-t-[2.5rem] p-8 border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] z-50 animate-[slide-up_0.3s_ease-out] pointer-events-auto">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-6"></div>
          
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                {selectedPin.shop}
                <div className="bg-blue-500/20 text-blue-400 text-[10px] uppercase font-black px-2 py-0.5 rounded border border-blue-500/30">Verified</div>
              </h2>
              <p className="text-slate-400 text-sm flex items-center gap-1">
                <MapPin size={14}/> {selectedPin.distance} • Walk there in 2 mins
              </p>
            </div>
            <button onClick={() => setSelectedPin(null)} className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white">
              <X size={16} />
            </button>
          </div>

          <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <Zap className="text-orange-500 animate-pulse shrink-0" />
            <div>
              <h4 className="text-orange-500 font-bold text-sm">Active AR Deal</h4>
              <p className="text-slate-300 text-xs">{selectedPin.tag} • Valid for next 1 hour</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button className="flex-1 bg-white text-black font-black py-4 rounded-xl hover:bg-slate-200 transition-colors shadow-lg flex items-center justify-center gap-2">
              <ShoppingBag size={18} /> Order Now
            </button>
            <button className="w-14 h-14 bg-slate-800 rounded-xl flex items-center justify-center text-blue-400 hover:bg-slate-700 transition-colors shrink-0 border border-slate-700">
              <Navigation size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Bottom Instructions (Hidden when selected) */}
      {!selectedPin && (
        <div className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 text-sm font-bold flex items-center gap-2 shadow-xl animate-fade-in">
            <ChevronLeft size={16} className="text-slate-400 animate-pulse" />
            Pan your device to explore
            <ChevronRight size={16} className="text-slate-400 animate-pulse" />
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(-5%); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }
          50% { transform: translateY(0); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s infinite;
        }
      `}} />
    </div>
  );
}
