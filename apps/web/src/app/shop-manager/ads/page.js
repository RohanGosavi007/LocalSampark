'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import { Megaphone, TrendingUp, Target, Plus, BarChart2, DollarSign, X, Play, Pause, AlertCircle, Sparkles, Store } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function AdsManagerPage() {
  const [balance, setBalance] = useState(0);
  const [shop, setShop] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [form, setForm] = useState({
    budget: 500,
    radius_km: 4,
    duration_days: 7,
  });

  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const loadData = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch current shop
      const shopRes = await fetch(`${API_URL}/api/v1/shops/my-shop`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const shopData = await shopRes.json();
      const currentShop = shopData?.shop || shopData?.data || (shopData?.id ? shopData : null);
      setShop(currentShop);

      // 2. Fetch wallet balance
      const walletRes = await fetch(`${API_URL}/api/v1/wallet/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (walletRes.ok) {
        const walletData = await walletRes.json();
        setBalance(Number(walletData.balance || 0));
      }

      // 3. Fetch ad campaigns for this shop
      if (currentShop?.id) {
        const campRes = await fetch(`${API_URL}/api/v1/campaigns/${currentShop.id}/ads`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (campRes.ok) {
          const campData = await campRes.json();
          setCampaigns(campData.campaigns || []);
        }
      }
    } catch (err) {
      console.error('Error fetching ads data:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!token) {
      alert('Please log in to launch a campaign.');
      return;
    }
    if (!shop?.id) {
      alert('No registered shop found. Please register your shop first.');
      return;
    }

    const budgetNum = Number(form.budget);
    if (budgetNum <= 0) {
      alert('Please enter a valid budget amount.');
      return;
    }
    if (balance < budgetNum) {
      alert(`Insufficient wallet balance (₹${balance}). Please recharge your wallet with at least ₹${budgetNum} first.`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/campaigns/purchase`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shop_id: shop.id,
          budget_amount: budgetNum,
          radius_km: Number(form.radius_km),
          duration_days: Number(form.duration_days)
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert('🎉 Ad campaign purchased and activated successfully!');
        setShowNewModal(false);
        setForm({ budget: 500, radius_km: 4, duration_days: 7 });
        loadData();
      } else {
        alert(data.error || 'Failed to purchase campaign.');
      }
    } catch (err) {
      alert(err.message || 'Network error purchasing campaign.');
    } finally {
      setSubmitting(false);
    }
  };

  const totalSpent = campaigns.reduce((acc, c) => acc + (parseFloat(c.spent) || 0), 0);
  const totalImpressions = campaigns.reduce((acc, c) => acc + (parseInt(c.impressions) || 0), 0);
  const totalClicks = campaigns.reduce((acc, c) => acc + (parseInt(c.clicks) || 0), 0);
  const activeCount = campaigns.filter(c => c.status === 'active').length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20 text-slate-900">
      <Header />
      
      {/* Top Gradient Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 text-white pt-16 pb-24 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <Megaphone size={200} />
        </div>
        <div className="max-w-6xl mx-auto relative z-10 flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold mb-3">
              <Store size={14} /> {shop ? shop.name : 'Merchant Portal'}
            </div>
            <h1 className="text-3xl md:text-4xl font-black mb-2 flex items-center gap-3">
              <Megaphone className="text-blue-300" /> Promoted Listing & Ads Manager
            </h1>
            <p className="text-blue-100 max-w-lg">Boost your shop and catalog to the top of LocalSampark search results for nearby residents in your ward/radius.</p>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-6">
            <div>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mb-1">Wallet Balance</p>
              <h2 className="text-3xl font-black">₹{balance.toLocaleString('en-IN')}</h2>
            </div>
            <a href="/wallet" className="bg-white text-blue-700 hover:bg-blue-50 font-bold px-4 py-2 rounded-xl transition-colors shadow-sm text-sm">
              Manage Wallet
            </a>
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
              <h3 className="text-2xl font-black">₹{totalSpent.toFixed(0)}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <EyeIcon />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Impressions</p>
              <h3 className="text-2xl font-black">{totalImpressions.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center shrink-0">
              <Target size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Total Clicks</p>
              <h3 className="text-2xl font-black">{totalClicks.toLocaleString('en-IN')}</h3>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-slate-500 text-sm font-bold">Active Ads</p>
              <h3 className="text-2xl font-black">{activeCount}</h3>
            </div>
          </div>
        </div>

        {/* Campaigns List */}
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-8">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                <BarChart2 className="text-blue-600" /> Promoted Campaigns
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Real-time performance tracked directly from active customer discovery feeds</p>
            </div>
            <button 
              onClick={() => setShowNewModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-blue-600/20 text-sm"
            >
              <Plus size={18} /> New Campaign
            </button>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-slate-400">Loading campaigns...</div>
          ) : campaigns.length === 0 ? (
            <div className="p-12 text-center">
              <Megaphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-700 mb-1">No Active Ad Campaigns</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-5">
                Reach more customers in your neighborhood. Launch a geo-targeted promoted listing starting at just ₹100.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 transition"
              >
                <Plus size={16} /> Create Your First Campaign
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider font-bold">
                    <th className="p-4 pl-6">Campaign Type</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Spent / Budget</th>
                    <th className="p-4">Metrics (Imp / Clicks)</th>
                    <th className="p-4">Radius & Duration</th>
                    <th className="p-4 text-right pr-6">Run Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {campaigns.map(c => {
                    const budget = parseFloat(c.budget) || 1;
                    const spent = parseFloat(c.spent) || 0;
                    const pct = Math.min(100, (spent / budget) * 100);
                    return (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="p-4 pl-6">
                          <p className="font-bold text-slate-900">{c.title || (c.ad_type === 'promoted_listing' ? 'Promoted Store Listing' : c.ad_type)}</p>
                          <p className="text-xs text-slate-500 font-mono">ID: {String(c.id).slice(0, 8)}</p>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                            c.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                            c.status === 'exhausted' ? 'bg-amber-100 text-amber-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {c.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4">
                          <p className="font-bold">₹{spent.toFixed(0)} <span className="text-slate-400 font-normal">/ ₹{budget.toFixed(0)}</span></p>
                          <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="font-medium">{(c.impressions || 0).toLocaleString()} <span className="text-slate-400">/</span> {(c.clicks || 0).toLocaleString()}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-slate-700 font-medium">{c.radius_km || 4} km radius</p>
                          <p className="text-xs text-slate-400">{c.duration_days || 7} days</p>
                        </td>
                        <td className="p-4 pr-6 text-right text-xs text-slate-500">
                          {c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'} to {c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* New Campaign Modal */}
      {showNewModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Launch Promoted Listing</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pay-per-click geo-targeted placement</p>
              </div>
              <button onClick={() => setShowNewModal(false)} className="text-slate-400 hover:text-slate-900">
                <X size={22} />
              </button>
            </div>
            
            <form onSubmit={handleCreateCampaign} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Target Radius (km)</label>
                <select
                  value={form.radius_km}
                  onChange={e => setForm({ ...form, radius_km: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value={2}>2 km — Hyperlocal immediate vicinity</option>
                  <option value={4}>4 km — Standard neighborhood reach (Recommended)</option>
                  <option value={8}>8 km — Suburb & surrounding wards</option>
                  <option value={15}>15 km — City-wide placement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Duration (days)</label>
                <select
                  value={form.duration_days}
                  onChange={e => setForm({ ...form, duration_days: Number(e.target.value) })}
                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm"
                >
                  <option value={3}>3 Days (Flash Weekend Sprint)</option>
                  <option value={7}>7 Days (1 Week Standard)</option>
                  <option value={14}>14 Days (2 Weeks)</option>
                  <option value={30}>30 Days (Full Month Presence)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Total Campaign Budget (₹)</label>
                <input
                  type="number"
                  min={100}
                  step={50}
                  value={form.budget}
                  onChange={e => setForm({ ...form, budget: e.target.value })}
                  placeholder="500"
                  required
                  className="w-full border border-slate-200 rounded-xl p-3 focus:outline-none focus:border-blue-500 text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">₹5 per unique click deduction. Capped at your chosen budget.</p>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700 flex items-start gap-2">
                <Sparkles size={16} className="shrink-0 mt-0.5 text-blue-600" />
                <span>
                  Budget is debited from your merchant wallet. Current wallet balance: <strong>₹{balance}</strong>.
                </span>
              </div>
            
              <div className="pt-2 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20 text-sm disabled:opacity-50"
                >
                  {submitting ? 'Launching...' : 'Confirm & Launch Campaign'}
                </button>
              </div>
            </form>
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
