'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { Heart, MessageCircle, Share2, ShoppingCart, Plus, Volume2, VolumeX } from 'lucide-react';
import { useCart } from '../../../context/CartContext';
import { useToast } from '../../components/ui/Toast';

export default function DiscoverReels() {
  const [muted, setMuted] = useState(true);
  const { dispatch } = useCart();
  const { addToast } = useToast();

  // Mock Reels Data
  const reels = [
    {
      id: 1,
      shop: 'Balaji Sweet House',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Fallback video
      description: 'Fresh Hot Jalebis just dropped! Guaranteed delivery in 10 mins. 🤤🔥',
      product: { id: 'P-101', name: 'Hot Jalebi 500g', price: 120, image: 'https://via.placeholder.com/150' },
      likes: 124,
      comments: 12
    },
    {
      id: 2,
      shop: 'Green Leaf Organics',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      description: 'Farm fresh organic avocados arrived this morning! Limited stock! 🥑✨',
      product: { id: 'P-102', name: 'Organic Avocado (2 pcs)', price: 350, image: 'https://via.placeholder.com/150' },
      likes: 89,
      comments: 4
    }
  ];

  const handleAddToCart = (product) => {
    dispatch({ type: 'ADD_ITEM', payload: { ...product, quantity: 1 } });
    addToast(`Added ${product.name} to cart from Discover!`);
  };

  return (
    <div className="min-h-screen bg-black font-sans text-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 z-50">
        <Header />
      </div>
      
      {/* Scrollable Reels Container */}
      <div className="h-screen w-full overflow-y-scroll snap-y snap-mandatory pt-16">
        
        {reels.map((reel) => (
          <div key={reel.id} className="relative h-[calc(100vh-64px)] w-full snap-start snap-always bg-slate-900 flex items-center justify-center">
            
            {/* Video Player */}
            <video 
              src={reel.videoUrl} 
              autoPlay 
              loop 
              muted={muted}
              playsInline
              className="absolute inset-0 w-full h-full object-cover opacity-80"
            />

            {/* Mute Toggle */}
            <button 
              onClick={() => setMuted(!muted)}
              className="absolute top-6 left-6 z-20 w-10 h-10 bg-black/50 backdrop-blur-md rounded-full flex items-center justify-center text-white"
            >
              {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>

            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10 pointer-events-none"></div>

            {/* Bottom Info Section */}
            <div className="absolute bottom-6 left-6 right-20 z-20">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-sm font-bold border border-white/20 shadow-lg">
                  {reel.shop.charAt(0)}
                </div>
                <h3 className="font-bold text-white text-lg shadow-black drop-shadow-md">{reel.shop}</h3>
                <button className="bg-blue-600/80 hover:bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-md transition-colors ml-2">
                  Follow
                </button>
              </div>
              <p className="text-white/90 text-sm mb-6 shadow-black drop-shadow-md line-clamp-2">
                {reel.description}
              </p>

              {/* Shoppable Product Card overlay */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-4 max-w-sm">
                <div className="w-16 h-16 bg-slate-800 rounded-xl overflow-hidden shrink-0">
                  <img src={reel.product.image} alt="Product" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{reel.product.name}</h4>
                  <p className="text-blue-400 font-bold text-sm">₹{reel.product.price}</p>
                </div>
                <button 
                  onClick={() => handleAddToCart(reel.product)}
                  className="bg-white text-black hover:bg-slate-200 w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95"
                >
                  <Plus size={20} className="font-black" />
                </button>
              </div>
            </div>

            {/* Right Action Bar */}
            <div className="absolute bottom-12 right-4 z-20 flex flex-col items-center gap-6">
              <div className="flex flex-col items-center gap-1 group cursor-pointer">
                <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:bg-black/60 transition-colors">
                  <Heart size={24} className="group-hover:text-red-500 transition-colors" />
                </div>
                <span className="text-white text-xs font-bold drop-shadow-md">{reel.likes}</span>
              </div>

              <div className="flex flex-col items-center gap-1 group cursor-pointer">
                <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:bg-black/60 transition-colors">
                  <MessageCircle size={24} />
                </div>
                <span className="text-white text-xs font-bold drop-shadow-md">{reel.comments}</span>
              </div>

              <div className="flex flex-col items-center gap-1 group cursor-pointer">
                <div className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white group-hover:bg-black/60 transition-colors">
                  <Share2 size={24} />
                </div>
                <span className="text-white text-xs font-bold drop-shadow-md">Share</span>
              </div>
            </div>

          </div>
        ))}

      </div>
    </div>
  );
}
