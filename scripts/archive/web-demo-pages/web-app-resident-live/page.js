'use client';
import React, { useState } from 'react';
import { Heart, MessageCircle, Share2, ShoppingCart, X, Users, Eye } from 'lucide-react';
import Link from 'next/link';

export default function LiveCommercePage() {
  const [messages, setMessages] = useState([
    { id: 1, user: 'Rahul', text: 'Are the strawberries fresh today?' },
    { id: 2, user: 'Priya', text: 'I want 2 boxes!' }
  ]);
  const [inputMsg, setInputMsg] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputMsg.trim()) return;
    setMessages([...messages, { id: Date.now(), user: 'You', text: inputMsg }]);
    setInputMsg('');
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col font-sans text-white">
      
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-8 flex items-center justify-between z-20 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-pink-500 overflow-hidden">
            <img src="https://via.placeholder.com/100" alt="Shop" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="font-bold text-sm shadow-black drop-shadow-md">Green Leaf Organics</h3>
            <p className="text-xs text-pink-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span> LIVE
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold">
            <Eye size={14} /> 241
          </div>
          <Link href="/resident" className="w-8 h-8 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors">
            <X size={20} />
          </Link>
        </div>
      </div>

      {/* Video Background (Simulated) */}
      <div className="absolute inset-0 z-0">
        <video 
          src="https://www.w3schools.com/html/mov_bbb.mp4" 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 pointer-events-none"></div>
      </div>

      {/* Bottom Content Layer */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-20 flex flex-col justify-end">
        
        {/* Shoppable Product Card Overlay */}
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-4 max-w-sm mb-4 animate-fade-in shadow-2xl">
          <div className="w-16 h-16 bg-slate-800 rounded-xl overflow-hidden shrink-0">
            <img src="https://via.placeholder.com/150" alt="Product" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="bg-pink-500 text-white text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded inline-block mb-1">
              Live Sale
            </div>
            <h4 className="font-bold text-white text-sm line-clamp-1">Fresh Strawberries 1 Box</h4>
            <div className="flex items-center gap-2">
              <span className="text-pink-400 font-bold text-sm">₹120</span>
              <span className="text-slate-400 text-xs line-through">₹200</span>
            </div>
          </div>
          <button className="bg-pink-600 hover:bg-pink-500 text-white w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 shadow-[0_0_15px_rgba(236,72,153,0.5)]">
            <ShoppingCart size={18} />
          </button>
        </div>

        {/* Live Chat & Actions */}
        <div className="flex gap-4 items-end">
          
          <div className="flex-1 flex flex-col gap-2">
            {/* Chat Messages */}
            <div className="max-h-48 overflow-y-auto space-y-2 mb-2 scrollbar-hide mask-image-fade">
              {messages.map(msg => (
                <div key={msg.id} className="text-sm">
                  <span className="font-bold text-slate-300 mr-2 drop-shadow-md">{msg.user}</span>
                  <span className="text-white drop-shadow-md">{msg.text}</span>
                </div>
              ))}
            </div>
            
            {/* Input Box */}
            <form onSubmit={handleSend} className="relative">
              <input 
                type="text" 
                placeholder="Ask a question..." 
                value={inputMsg}
                onChange={e => setInputMsg(e.target.value)}
                className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder-slate-400 outline-none focus:border-pink-500 transition-colors"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-500 font-bold text-sm">
                Send
              </button>
            </form>
          </div>

          {/* Side Action Buttons */}
          <div className="flex flex-col items-center gap-4 pb-2">
            <button className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-pink-500/20 hover:text-pink-500 transition-colors group">
              <Heart size={24} className="group-active:scale-125 transition-transform" />
            </button>
            <button className="w-12 h-12 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white hover:bg-black/60 transition-colors">
              <Share2 size={24} />
            </button>
          </div>

        </div>
      </div>
      
    </div>
  );
}
