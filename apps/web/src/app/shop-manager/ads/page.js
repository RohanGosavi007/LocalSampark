'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Megaphone, TrendingUp, Target, Plus, BarChart2, DollarSign, SwitchCamera, Play, Pause, Trash2 } from 'lucide-react';

export default function AdsManagerPage() {
  const [balance, setBalance] = useState(1250);
  const [campaigns, setCampaigns] = useState([
    { id: 'C-101', name: 'Weekend Bakery Boost', status: 'active', spent: 450, impressions: 12400, clicks: 850, conversions: 45, roas: 3.2, budget: 1000 },
    { id: 'C-102', name: 'Fresh Milk Keyword', status: 'paused', spent: 120, impressions: 3200, clicks: 150, conversions: 12, roas: 1.8, budget: 500 }
  ]);

  const [showNewModal, setShowNewModal] = useState(false);

  const toggleCampaign = (id) => {
    setCampaigns(campaigns.map(c => {
      if(c.id === id) return { ...c, status: c.status === 'active' ? 'paused' : 'active' };
      return c;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <Header />
      
      {/* Top Gradient Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Megaphone size={200} />
        </div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
              <Megaphone className="text-blue-300" /> Ads Manager
            </h1>
            <p className="text-blue-100 max-w-lg">Boost your products to the top of LocalSampark search results. Pay only when residents click.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-6">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
              <h2 className="text-3xl font-black">₹{balance}</h2>
            </div>
            <button className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-4 py-2 rounded-xl transition-colors">
              Add Funds
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-20">
        
        {/* Global Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Total Spent</p>
              <h3 className="text-2xl font-black">₹570</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <EyeIcon />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Impressions</p>
              <h3 className="text-2xl font-black">15.6k</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <Target size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Total Clicks</p>
              <h3 className="text-2xl font-black">1,000</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Avg. ROAS</p>
              <h3 className="text-2xl font-black">2.5x</h3>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-xl font-bold flex items-center gap-2"><BarChart2 className="text-blue-600" /> Active Campaigns</h2>
            <button 
              onClick={() => setShowNewModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20"
            >
              <Plus size={18} /> New Campaign
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                  <th className="p-4 pl-6">Campaign Name</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Spent / Budget</th>
                  <th className="p-4">Metrics (Imp / Clicks)</th>
                  <th className="p-4">ROAS</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900">{c.name}</p>
                      <p className="text-xs text-slate-500">{c.id}</p>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {c.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <p className="font-bold">₹{c.spent} <span className="text-slate-400 font-normal">/ ₹{c.budget}</span></p>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: \`\${(c.spent/c.budget)*100}%\` }}></div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="font-medium">{c.impressions.toLocaleString()} <span className="text-slate-400">/</span> {c.clicks.toLocaleString()}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-emerald-600">{c.roas}x</p>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => toggleCampaign(c.id)} className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-blue-100 hover:text-blue-600 transition-colors">
                          {c.status === 'active' ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                        <button className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center hover:bg-red-100 hover:text-red-600 transition-colors">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* New Campaign Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">Create Campaign</h2>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-900"><SwitchCamera size={24} className="rotate-45" /></button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Campaign Name</label>
                <input type="text" placeholder="e.g. Diwali Sweets Promo" className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Target Keywords (comma separated)</label>
                <input type="text" placeholder="e.g. sweets, mithai, diwali" className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Daily Budget (₹)</label>
                <input type="number" placeholder="500" className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20" />
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setShowNewModal(false)} className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>
              <button onClick={() => {
                setCampaigns([{ id: 'C-' + Math.floor(Math.random()*1000), name: 'New Campaign', status: 'active', spent: 0, impressions: 0, clicks: 0, conversions: 0, roas: 0, budget: 500 }, ...campaigns]);
                setShowNewModal(false);
              }} className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20">Launch Campaign</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
