'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { Crown, Check, Truck, Zap, Percent, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PlusMembershipPage() {
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState('3-month'); // '1-month' | '3-month'

  const handleSubscribe = () => {
    // In a real app, this would route to a UPI checkout specifically for the subscription.
    // For now, we mock success.
    alert(`Subscribed to ${selectedPlan} LocalSampark Plus!`);
    router.push('/resident');
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text pb-20">
      <Header />

      {/* Hero Section */}
      <div className="pt-24 pb-12 bg-gradient-to-b from-orange-500/20 to-slate-950 text-center px-4">
        <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(249,115,22,0.4)]">
          <Crown size={40} className="text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-text mb-4">LocalSampark <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-500">Plus</span></h1>
        <p className="text-text-muted text-lg md:text-xl max-w-xl mx-auto font-medium">
          Get unlimited free deliveries, skip the surge fees, and unlock exclusive discounts at your favorite Kirana stores.
        </p>
      </div>

      <div className="max-w-4xl mx-auto px-6">

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="bg-background-alt border border-border rounded-3xl p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-blue-500/20 text-blue-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Truck size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Unlimited Free Delivery</h3>
            <p className="text-text-muted text-sm">No delivery fees on any orders above ₹149 from stores within a 3km radius.</p>
          </div>
          <div className="bg-background-alt border border-border rounded-3xl p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-purple-500/20 text-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Zap size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Zero Surge Pricing</h3>
            <p className="text-text-muted text-sm">Raining? High demand? Never pay surge prices. Your delivery fee is always ₹0.</p>
          </div>
          <div className="bg-background-alt border border-border rounded-3xl p-6 text-center shadow-xl">
            <div className="w-12 h-12 bg-green-500/20 text-green-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
              <Percent size={24} />
            </div>
            <h3 className="font-bold text-lg mb-2">Exclusive Discounts</h3>
            <p className="text-text-muted text-sm">Get up to 30% off on select premium products from partnered merchants.</p>
          </div>
        </div>

        {/* Pricing Plans */}
        <div className="bg-background-alt border border-border rounded-3xl p-8 mb-12 shadow-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 bg-orange-500/20 w-64 h-64 blur-3xl -z-10 rounded-full"></div>
          
          <h2 className="text-2xl font-black text-center mb-8">Choose Your Plan</h2>
          
          <div className="flex flex-col md:flex-row gap-6 mb-8 max-w-2xl mx-auto">
            
            {/* 1 Month */}
            <div 
              onClick={() => setSelectedPlan('1-month')}
              className={`flex-1 border-2 rounded-2xl p-6 cursor-pointer transition-all ${selectedPlan === '1-month' ? 'border-orange-500 bg-orange-500/10' : 'border-border bg-background hover:border-slate-500'}`}
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">1 Month</h3>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === '1-month' ? 'border-orange-500 bg-orange-500' : 'border-slate-500'}`}>
                  {selectedPlan === '1-month' && <Check size={14} className="text-white" />}
                </div>
              </div>
              <div className="text-3xl font-black mb-1">₹149<span className="text-base text-text-muted font-medium">/mo</span></div>
              <p className="text-text-muted text-sm">Pays for itself in 3 orders.</p>
            </div>

            {/* 3 Months */}
            <div 
              onClick={() => setSelectedPlan('3-month')}
              className={`flex-1 border-2 rounded-2xl p-6 cursor-pointer transition-all relative ${selectedPlan === '3-month' ? 'border-orange-500 bg-orange-500/10' : 'border-border bg-background hover:border-slate-500'}`}
            >
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                Most Popular • Save 33%
              </div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg">3 Months</h3>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selectedPlan === '3-month' ? 'border-orange-500 bg-orange-500' : 'border-slate-500'}`}>
                  {selectedPlan === '3-month' && <Check size={14} className="text-white" />}
                </div>
              </div>
              <div className="text-3xl font-black mb-1">₹299<span className="text-base text-text-muted font-medium">/3 mo</span></div>
              <p className="text-text-muted text-sm">That's just ₹99 per month!</p>
            </div>

          </div>

          <button 
            onClick={handleSubscribe}
            className="w-full max-w-md mx-auto block bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-400 hover:to-red-400 text-white font-black text-lg py-4 rounded-xl transition-all shadow-[0_0_30px_rgba(249,115,22,0.4)] flex items-center justify-center gap-2"
          >
            Get LocalSampark Plus <ArrowRight size={20} />
          </button>
          <p className="text-center text-text-muted text-xs mt-4">Secure payment via UPI or Cards. Auto-renews, cancel anytime.</p>
        </div>

      </div>
    </div>
  );
}
