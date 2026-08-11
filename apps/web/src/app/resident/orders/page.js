'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Star, Package, MapPin, CheckCircle, Clock } from 'lucide-react';

export default function ResidentOrdersPage() {
  const [ratingModal, setRatingModal] = useState(null);
  const [shopRating, setShopRating] = useState(0);
  const [riderRating, setRiderRating] = useState(0);

  const orders = [
    { id: 'ORD-5829', shop: 'Balaji SuperMart', status: 'Delivered', date: 'Today, 1:30 PM', total: 450, rider: 'Rahul (Blue Dart)', rated: false },
    { id: 'ORD-5820', shop: 'Green Leaf Veg', status: 'Delivered', date: 'Yesterday, 6:00 PM', total: 120, rider: 'Amit', rated: true },
    { id: 'ORD-5815', shop: 'Apollo Pharmacy', status: 'Processing', date: 'Aug 10', total: 890, rider: null, rated: false }
  ];

  const submitRating = () => {
    // API Call would go here
    setRatingModal(null);
    setShopRating(0);
    setRiderRating(0);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:bg-slate-900">
      <div className="hidden md:block"><Header /></div>
      
      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-slate-950 md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-slate-800 md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* App Bar */}
        <div className="bg-slate-900 p-6 border-b border-slate-800 z-10 flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Order History</h1>
          <Package className="text-blue-500" />
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {orders.map(order => (
            <div key={order.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{order.shop}</h3>
                  <p className="text-slate-500 text-xs font-mono mt-1">{order.id}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                  order.status === 'Delivered' ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'
                }`}>
                  {order.status === 'Delivered' ? <CheckCircle size={12} /> : <Clock size={12} />}
                  {order.status}
                </div>
              </div>
              
              <div className="flex justify-between items-center border-t border-slate-800 pt-4 mt-4">
                <div>
                  <p className="text-slate-400 text-xs">{order.date}</p>
                  <p className="text-white font-black mt-1">₹{order.total}</p>
                </div>
                
                {order.status === 'Delivered' && !order.rated && (
                  <button 
                    onClick={() => setRatingModal(order)}
                    className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-500 border border-blue-500/30 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
                  >
                    Rate Order
                  </button>
                )}
                {order.status === 'Delivered' && order.rated && (
                  <div className="flex text-yellow-500">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} fill="currentColor" />)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Rating Modal */}
        {ratingModal && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end">
            <div className="bg-slate-900 w-full rounded-t-3xl border-t border-slate-800 p-6 pb-12 animate-slide-up">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Rate your experience</h2>
                <button onClick={() => setRatingModal(null)} className="text-slate-500 hover:text-white">Cancel</button>
              </div>

              <div className="space-y-6">
                {/* Shop Rating */}
                <div>
                  <p className="text-slate-400 text-sm mb-3">How was the quality from <strong className="text-white">{ratingModal.shop}</strong>?</p>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(star => (
                      <button 
                        key={star}
                        onClick={() => setShopRating(star)}
                        className={`p-2 rounded-xl transition-colors ${shopRating >= star ? 'text-yellow-500 bg-yellow-500/10' : 'text-slate-600 bg-slate-800'}`}
                      >
                        <Star size={32} fill={shopRating >= star ? 'currentColor' : 'none'} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Rider Rating */}
                {ratingModal.rider && (
                  <div>
                    <p className="text-slate-400 text-sm mb-3">How was the delivery by <strong className="text-white">{ratingModal.rider}</strong>?</p>
                    <div className="flex gap-2">
                      {[1,2,3,4,5].map(star => (
                        <button 
                          key={star}
                          onClick={() => setRiderRating(star)}
                          className={`p-2 rounded-xl transition-colors ${riderRating >= star ? 'text-yellow-500 bg-yellow-500/10' : 'text-slate-600 bg-slate-800'}`}
                        >
                          <Star size={32} fill={riderRating >= star ? 'currentColor' : 'none'} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={submitRating}
                disabled={shopRating === 0}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl mt-8 shadow-[0_0_20px_rgba(37,99,235,0.3)] transition-all"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
