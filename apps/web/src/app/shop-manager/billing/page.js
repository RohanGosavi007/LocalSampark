'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Check, Star, Zap, Shield, Crown } from 'lucide-react';

export default function ShopBillingPage() {
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly' or 'yearly'

  const plans = [
    {
      id: 'basic',
      name: 'Starter',
      price: { monthly: 0, yearly: 0 },
      description: 'Perfect for small local stores just getting online.',
      icon: Star,
      color: 'text-slate-400',
      bgColor: 'bg-slate-800',
      features: [
        'List up to 50 products',
        'Basic Storefront Page',
        'Manual Order Approval',
        '2% Platform Fee per transaction'
      ],
      cta: 'Current Plan',
      popular: false
    },
    {
      id: 'pro',
      name: 'Professional',
      price: { monthly: 999, yearly: 9990 },
      description: 'For growing businesses needing analytics and reach.',
      icon: Zap,
      color: 'text-blue-500',
      bgColor: 'bg-blue-600',
      features: [
        'Unlimited Products',
        '"Promoted" Search Ad Badge',
        'Advanced Analytics Dashboard',
        'Auto Rider Assignment',
        '1.5% Platform Fee'
      ],
      cta: 'Upgrade to Pro',
      popular: true
    },
    {
      id: 'enterprise',
      name: 'Super Shop',
      price: { monthly: 2499, yearly: 24990 },
      description: 'For large supermarkets and franchise owners.',
      icon: Crown,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500',
      features: [
        'Everything in Pro',
        '0% Platform Fee',
        'Dedicated Account Manager',
        'Staff Roles & Permissions',
        'Multi-store Management'
      ],
      cta: 'Go Enterprise',
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Reused Sidebar from ShopManager (simplified for demo) */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block">
        <div className="p-6">
          <h1 className="text-2xl font-black text-white">LocalSampark</h1>
          <p className="text-xs text-slate-500 font-bold tracking-widest mt-1 uppercase">Merchant Portal</p>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {['Dashboard', 'Orders', 'Inventory', 'Staff', 'Settings'].map((item) => (
            <div key={item} className="px-4 py-3 text-slate-400 font-bold hover:bg-slate-800 rounded-xl cursor-pointer transition-colors">
              {item}
            </div>
          ))}
          <div className="px-4 py-3 bg-blue-600/10 text-blue-400 border border-blue-500/20 font-bold rounded-xl cursor-pointer">
            Billing & Plans
          </div>
        </nav>
      </aside>

      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-8 pt-24 overflow-y-auto">
          <div className="max-w-6xl mx-auto">
            
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h2 className="text-4xl font-black text-white mb-4">Supercharge Your Local Shop</h2>
              <p className="text-slate-400 text-lg mb-8">Unlock advanced analytics, auto-delivery assignments, and premium promoted placements to 10x your hyper-local sales.</p>
              
              {/* Billing Toggle */}
              <div className="inline-flex items-center bg-slate-900 border border-slate-800 p-1 rounded-2xl relative">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-8 py-3 rounded-xl font-bold transition-all relative z-10 ${billingCycle === 'monthly' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                >
                  Monthly
                </button>
                <button 
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-8 py-3 rounded-xl font-bold transition-all relative z-10 ${billingCycle === 'yearly' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
                >
                  Yearly <span className="absolute -top-3 -right-3 bg-green-500 text-white text-[10px] uppercase tracking-wider px-2 py-1 rounded-full shadow-lg">Save 20%</span>
                </button>
                <div 
                  className="absolute top-1 bottom-1 w-1/2 bg-blue-600 rounded-xl transition-all duration-300 ease-out z-0"
                  style={{ left: billingCycle === 'monthly' ? '4px' : 'calc(50% - 4px)' }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {plans.map((plan) => (
                <div 
                  key={plan.id}
                  className={`relative rounded-3xl p-8 transition-transform hover:-translate-y-2 ${
                    plan.popular 
                      ? 'bg-gradient-to-b from-blue-900/50 to-slate-900 border-2 border-blue-500 shadow-[0_0_40px_rgba(37,99,235,0.2)]' 
                      : 'bg-slate-900 border border-slate-800'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-blue-500 text-white text-xs font-black uppercase tracking-widest px-4 py-1 rounded-full">
                      Most Popular
                    </div>
                  )}
                  
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 bg-slate-950 border border-slate-800`}>
                    <plan.icon size={28} className={plan.color} />
                  </div>
                  
                  <h3 className="text-2xl font-bold text-white mb-2">{plan.name}</h3>
                  <p className="text-slate-400 text-sm h-10 mb-6">{plan.description}</p>
                  
                  <div className="flex items-end gap-1 mb-8">
                    <span className="text-5xl font-black text-white">₹{plan.price[billingCycle]}</span>
                    <span className="text-slate-500 font-bold mb-2">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                  </div>

                  <button className={`w-full py-4 rounded-xl font-bold transition-colors mb-8 ${
                    plan.cta === 'Current Plan' 
                      ? 'bg-slate-800 text-slate-400 cursor-default'
                      : `text-white hover:opacity-90 ${plan.bgColor}`
                  }`}>
                    {plan.cta}
                  </button>

                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Features Included</p>
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="mt-0.5"><Check size={18} className="text-green-500" /></div>
                        <span className="text-slate-300 text-sm font-medium">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
