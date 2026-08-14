'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { PackageOpen, Sparkles, Sprout, Cookie, Gift, ArrowRight, CheckCircle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function MysteryBoxPage() {
  const router = useRouter();
  const [selectedBox, setSelectedBox] = useState('veg'); // 'veg' | 'bakery'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const boxes = {
    veg: {
      id: 'veg',
      title: 'Farm Fresh Mystery Box',
      icon: <Sprout size={32} className="text-green-500" />,
      theme: 'bg-green-500',
      shadow: 'shadow-green-500/30',
      price: 399,
      value: 600,
      description: 'A surprise assortment of seasonal, farm-fresh vegetables and exotic greens sourced directly from local mandis.',
      items: ['5-7 types of seasonal veggies', 'Fresh herbs bundle', 'Recipe card included']
    },
    bakery: {
      id: 'bakery',
      title: 'Midnight Cravings Box',
      icon: <Cookie size={32} className="text-orange-500" />,
      theme: 'bg-orange-500',
      shadow: 'shadow-orange-500/30',
      price: 499,
      value: 800,
      description: 'An indulgent collection of premium, freshly baked surplus pastries and artisan breads from top local bakeries.',
      items: ['3-4 premium desserts', 'Artisan bread loaf', 'Surprise gourmet dip']
    }
  };

  const handleSubscribe = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="w-24 h-24 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 border border-blue-500/50 shadow-[0_0_40px_rgba(59,130,246,0.4)]">
          <Gift size={48} className="text-blue-500 animate-bounce" />
        </div>
        <h1 className="text-4xl font-black mb-4">Subscription Activated!</h1>
        <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
          Your <strong>{boxes[selectedBox].title}</strong> will be delivered this Friday evening. Get ready for a delicious surprise!
        </p>
        
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm mb-8 text-left">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="text-emerald-500" size={18} /> Next Delivery
          </h3>
          <p className="text-3xl font-black text-blue-400 mb-1">Friday</p>
          <p className="text-slate-400 text-sm mb-4">Between 6 PM - 9 PM</p>
          
          <div className="border-t border-slate-800 pt-4 flex justify-between items-center text-sm">
            <span className="text-slate-400">Auto-Renews Weekly</span>
            <span className="font-bold text-white">₹{boxes[selectedBox].price}/wk</span>
          </div>
        </div>

        <button onClick={() => router.push('/resident')} className="bg-slate-800 text-white font-bold py-3 px-8 rounded-full hover:bg-slate-700 transition-colors">
          Back to Dashboard
        </button>
      </div>
    );
  }

  const box = boxes[selectedBox];

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white pb-20">
      <Header />
      
      <div className="max-w-5xl mx-auto px-4 pt-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-xl shadow-purple-500/20">
            <PackageOpen size={32} className="text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black mb-4">Weekly <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Mystery Boxes</span></h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Discover local flavors while helping merchants clear premium surplus inventory. High value, total surprise.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          
          {Object.values(boxes).map((b) => (
            <div 
              key={b.id}
              onClick={() => setSelectedBox(b.id)}
              className={`relative cursor-pointer transition-all duration-300 bg-slate-900 rounded-3xl border-2 overflow-hidden ${
                selectedBox === b.id 
                  ? `border-${b.theme.split('-')[1]}-500 shadow-[0_0_40px_rgba(0,0,0,0)] ${b.shadow} scale-[1.02]` 
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className={`h-2 w-full ${b.theme}`}></div>
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800`}>
                    {b.icon}
                  </div>
                  {selectedBox === b.id && (
                    <div className={`${b.theme} text-black text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg`}>
                      <Sparkles size={12} /> SELECTED
                    </div>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold mb-2">{b.title}</h2>
                <p className="text-slate-400 text-sm h-16">{b.description}</p>
                
                <div className="my-6 pt-6 border-t border-slate-800">
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-3 flex items-center gap-1"><Info size={14}/> What to expect</p>
                  <ul className="space-y-2">
                    {b.items.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-slate-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div> {item}
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="mt-8 flex items-end justify-between bg-slate-950 p-4 rounded-2xl border border-slate-800">
                  <div>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Value: ₹{b.value}</p>
                    <p className="text-3xl font-black">₹{b.price}<span className="text-base text-slate-400 font-medium">/wk</span></p>
                  </div>
                </div>
              </div>
            </div>
          ))}

        </div>

        <div className="max-w-xl mx-auto text-center">
          <button 
            onClick={handleSubscribe}
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-black text-lg text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
              box.theme
            } hover:brightness-110 disabled:opacity-50`}
          >
            {loading ? <span className="animate-pulse">Activating Subscription...</span> : <>Subscribe to {box.title} <ArrowRight size={20} /></>}
          </button>
          <p className="text-slate-500 text-xs mt-4 flex items-center justify-center gap-1">
            <Info size={12} /> Billed weekly. Cancel anytime before Thursday 5 PM.
          </p>
        </div>

      </div>
    </div>
  );
}
