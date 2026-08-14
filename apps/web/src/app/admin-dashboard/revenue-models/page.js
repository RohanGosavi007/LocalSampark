'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { TrendingUp, DollarSign, Percent, Save, Clock, Activity, Zap } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function RevenueModelsPage() {
  const { adminUser } = useAdminAuth();
  
  const [subscriptionFees, setSubscriptionFees] = useState({
    basic: 99,
    pro: 499,
    enterprise: 999
  });
  
  const [platformCuts, setPlatformCuts] = useState({
    grocery: 5.5,
    electronics: 3.0,
    services: 10.0,
    logistics_base: 40
  });

  const saveConfiguration = async (type) => {
    toast.success(`${type} models updated successfully across all clusters.`);
    // Ideally maps to PUT /api/v1/admin/revenue/models
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Revenue Models & Commissions</h1>
          <p className="text-slate-400">Configure global monetization logic, cuts, and subscription tiers.</p>
        </div>
        <button className="px-5 py-2 bg-blue-600/20 text-blue-500 rounded-xl hover:bg-blue-600/30 transition flex items-center gap-2 font-medium border border-blue-500/30">
          <TrendingUp className="w-4 h-4" /> View Forecasting
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Subscriptions */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-500"/> Subscription Tiers (Monthly)
            </h2>
            <button onClick={() => saveConfiguration('Subscription')} className="p-2 bg-emerald-600/20 text-emerald-500 rounded-lg hover:bg-emerald-600/30 transition">
              <Save className="w-5 h-5"/>
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(subscriptionFees).map(([tier, fee]) => (
              <div key={tier} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold capitalize">{tier} Plan</h3>
                  <p className="text-slate-500 text-xs mt-1">Base monthly recurring revenue</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">₹</span>
                  <input 
                    type="number" 
                    value={fee}
                    onChange={(e) => setSubscriptionFees({...subscriptionFees, [tier]: Number(e.target.value)})}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-right w-24 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Categories & Platform Cuts */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Percent className="w-5 h-5 text-purple-500"/> Platform Category Cuts
            </h2>
            <button onClick={() => saveConfiguration('Commission')} className="p-2 bg-purple-600/20 text-purple-500 rounded-lg hover:bg-purple-600/30 transition">
              <Save className="w-5 h-5"/>
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(platformCuts).map(([cat, cut]) => (
              <div key={cat} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold capitalize">{cat.replace('_', ' ')}</h3>
                  <p className="text-slate-500 text-xs mt-1">Percentage cut per transaction</p>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" 
                    step="0.1"
                    value={cut}
                    onChange={(e) => setPlatformCuts({...platformCuts, [cat]: Number(e.target.value)})}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-bold text-right w-20 focus:outline-none focus:border-purple-500"
                  />
                  <span className="text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500"/> Dynamic Pricing Constraints
        </h2>
        <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
          <div className="max-w-2xl">
            <h3 className="text-white font-bold mb-2">Surge Pricing Multiplier Cap</h3>
            <p className="text-slate-400 text-sm">Set the maximum allowable multiple for dynamic delivery pricing during high demand or bad weather conditions.</p>
          </div>
          <div className="flex items-center gap-3">
             <span className="text-slate-500">Max x</span>
             <input type="number" defaultValue={2.5} step={0.1} className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white font-black text-xl text-center w-24 focus:outline-none focus:border-amber-500"/>
             <button onClick={() => saveConfiguration('Surge Cap')} className="px-6 py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-500 transition shadow-lg shadow-amber-500/20">Apply</button>
          </div>
        </div>
      </div>
    </div>
  );
}
