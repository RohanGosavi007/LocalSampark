'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Heart, MessageCircle, Share2, ShoppingCart, Music, MoreVertical, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LocalReelsPage() {
  const [currentReel, setCurrentReel] = useState(0);
  
  const reels = [
    {
      id: 1,
      shop: 'Pune Baking Co.',
      shopImage: 'https://via.placeholder.com/100',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4',
      description: 'Fresh out of the oven! Our signature chocolate croissants are ready for the weekend. 🥐✨ #baking #fresh #pune',
      song: 'Original Audio - Pune Baking Co.',
      likes: '12.4K',
      comments: '342',
      product: { name: 'Chocolate Croissant (Pack of 2)', price: 180, image: 'https://via.placeholder.com/150' }
    },
    {
      id: 2,
      shop: 'Balaji SuperMart',
      shopImage: 'https://via.placeholder.com/100',
      videoUrl: 'https://www.w3schools.com/html/mov_bbb.mp4', // Mock video
      description: 'New stock of exotic fruits just arrived! Grab them before they run out. 🥭🍓 #fresh #grocery',
      song: 'Trending Track - Viral Hits',
      likes: '8.9K',
      comments: '128',
      product: { name: 'Exotic Fruit Basket', price: 450, image: 'https://via.placeholder.com/150' }
    }
  ];

  const handleScroll = (e) => {
    // Simple scroll snapping logic for demo
    const index = Math.round(e.target.scrollTop / window.innerHeight);
    setCurrentReel(index);
  };

  return (
    <div className="fixed inset-0 bg-black z-50 font-sans text-white overflow-hidden flex justify-center">
      
      {/* Top Nav Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent">
        <Link href="/resident" className="text-white hover:text-slate-300">
          <ArrowLeft size={28} />
        </Link>
        <div className="flex gap-6 font-bold text-lg drop-shadow-md">
          <span className="text-slate-400">Following</span>
          <span className="text-white relative">
            Local Reels
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full"></div>
          </span>
        </div>
        <button className="text-white hover:text-slate-300">
          <Search size={28} />
        </button>
      </div>

      {/* Infinite Scroll Container */}
      <div 
        className="w-full h-full md:max-w-md bg-black relative snap-y snap-mandatory overflow-y-scroll scrollbar-hide"
        onScroll={handleScroll}
      >
        {reels.map((reel, index) => (
          <div key={reel.id} className="w-full h-full relative snap-start">
            
            {/* Video Player */}
            <video 
              src={reel.videoUrl} 
              autoPlay={currentReel === index}
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover"
            />
            
            {/* Overlay Gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
            
            {/* Right Sidebar Actions */}
            <div className="absolute right-4 bottom-32 flex flex-col items-center gap-6 z-10">
              <div className="w-12 h-12 rounded-full border-2 border-white overflow-hidden relative mb-4">
                <img src={reel.shopImage} alt={reel.shop} className="w-full h-full object-cover" />
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold border border-white">
                  +
                </div>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:text-red-500 transition-colors">
                  <Heart size={24} fill={index === 0 ? "white" : "none"} />
                </button>
                <span className="text-xs font-bold shadow-black drop-shadow-md">{reel.likes}</span>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                  <MessageCircle size={24} />
                </button>
                <span className="text-xs font-bold shadow-black drop-shadow-md">{reel.comments}</span>
              </div>
              
              <div className="flex flex-col items-center gap-1">
                <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
                  <Share2 size={24} />
                </button>
                <span className="text-xs font-bold shadow-black drop-shadow-md">Share</span>
              </div>
              
              <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white mt-2">
                <MoreVertical size={24} />
              </button>
            </div>

            {/* Bottom Content Area */}
            <div className="absolute bottom-4 left-4 right-20 z-10">
              <h3 className="font-bold text-lg mb-2 shadow-black drop-shadow-md">@{reel.shop}</h3>
              <p className="text-sm mb-4 line-clamp-2 shadow-black drop-shadow-md">{reel.description}</p>
              
              <div className="flex items-center gap-2 mb-6">
                <Music size={14} className="animate-spin-slow" />
                <span className="text-sm shadow-black drop-shadow-md overflow-hidden whitespace-nowrap overflow-ellipsis max-w-[200px]">
                  {reel.song}
                </span>
              </div>

              {/* Shoppable Tag */}
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 pr-4 flex items-center gap-3 animate-fade-in shadow-2xl group cursor-pointer hover:bg-white/20 transition-colors">
                <div className="w-12 h-12 bg-slate-800 rounded-xl overflow-hidden shrink-0">
                  <img src={reel.product.image} alt={reel.product.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-white text-sm line-clamp-1">{reel.product.name}</h4>
                  <span className="text-white font-black text-sm">₹{reel.product.price}</span>
                </div>
                <button className="bg-white text-black w-8 h-8 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg">
                  <ShoppingCart size={14} />
                </button>
              </div>

            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
