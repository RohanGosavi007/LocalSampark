'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Clock, MapPin, Percent, Timer, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../components/ui/Toast';

export default function HappyHoursPage() {
  const { dispatch } = useCart();
  const { addToast } = useToast();
  
  // Calculate time until midnight
  const [timeLeft, setTimeLeft] = useState('');
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }
      const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
      const m = Math.floor((diff / 1000 / 60) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  const deals = [
    {
      id: 'HH-101',
      shop: 'Pune Baking Co.',
      product: { id: 'P-501', name: 'Assorted Pastries (Box of 4)', price: 150, originalPrice: 400 },
      distance: '1.2 km',
      left: 3,
      image: 'https://via.placeholder.com/300'
    },
    {
      id: 'HH-102',
      shop: 'Green Grocers',
      product: { id: 'P-502', name: 'Fresh Spinach & Coriander Bundle', price: 20, originalPrice: 60 },
      distance: '0.8 km',
      left: 12,
      image: 'https://via.placeholder.com/300'
    }
  ];

  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...product, quantity: 1 } });
    addToast(`Added ${product.name} at Happy Hour price!`);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white pb-20">
      <Header />
      
      {/* Hero Section */}
      <div className="pt-24 pb-12 bg-gradient-to-b from-purple-900/40 to-slate-950 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-purple-500/20 text-purple-400 font-bold px-4 py-2 rounded-full mb-6 border border-purple-500/30">
            <Clock size={16} /> Late Night Clearance
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Local <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500">Happy Hours</span></h1>
          <p className="text-slate-300 text-lg max-w-xl mx-auto mb-8">
            Help local bakeries and grocers clear their daily fresh inventory before closing. Save up to 70% on premium items!
          </p>
          
          <div className="inline-flex flex-col items-center p-4 bg-slate-900 border-2 border-purple-500/50 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.2)]">
            <span className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><Timer size={14} /> Deals End In</span>
            <span className="text-3xl font-black text-purple-400 font-mono">{timeLeft}</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4">
        
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Percent className="text-purple-500" /> Live Deals Near You
          </h2>
          <span className="text-slate-400 text-sm">Showing 2 results</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {deals.map(deal => {
            const discount = Math.round(((deal.product.originalPrice - deal.product.price) / deal.product.originalPrice) * 100);
            return (
              <div key={deal.id} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-xl hover:border-purple-500/50 transition-colors group">
                <div className="h-48 relative overflow-hidden">
                  <img src={deal.image} alt={deal.product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-4 left-4 bg-red-500 text-white font-black text-sm px-3 py-1 rounded-full shadow-lg">
                    {discount}% OFF
                  </div>
                  <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <MapPin size={12} className="text-purple-400" /> {deal.distance}
                  </div>
                </div>
                
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{deal.shop}</p>
                      <h3 className="text-lg font-bold text-white leading-tight">{deal.product.name}</h3>
                    </div>
                  </div>
                  
                  <div className="flex items-end gap-3 mb-6 mt-4">
                    <span className="text-3xl font-black text-purple-400">₹{deal.product.price}</span>
                    <span className="text-slate-500 font-medium line-through mb-1">₹{deal.product.originalPrice}</span>
                  </div>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mr-4">
                      <div 
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full"
                        style={{ width: `${(deal.left / 20) * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-red-400 text-xs font-bold whitespace-nowrap">Only {deal.left} left</span>
                  </div>

                  <button 
                    onClick={() => handleAddToCart(deal.product)}
                    className="w-full bg-white hover:bg-slate-200 text-black font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={18} /> Claim Deal
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
