'use client';
import React, { useState, useEffect } from 'react';
import { Heart, HandHeart, ShieldCheck, CheckCircle, XCircle, DollarSign, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function CharityDashboard() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [ngoName, setNgoName] = useState('');
  const [title, setTitle] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCampaigns = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/charity', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCampaigns(data.data);
      }
    } catch (err) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleCreateCampaign = async () => {
    if (!ngoName || !title || !goalAmount) return toast.error('All fields required');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/charity', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ngo_name: ngoName, title, goal_amount: parseFloat(goalAmount) })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setNgoName('');
        setTitle('');
        setGoalAmount('');
        fetchCampaigns();
      } else {
        toast.error(data.error || 'Failed to create campaign');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setSubmitting(false);
    }
  };

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/charity/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleVerification = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/charity/${id}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_ngo: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to update verification');
    }
  };

  const adjustRaisedAmount = async (id, currentAmount) => {
    const amountStr = prompt('Enter new raised amount (Mock Testing):', currentAmount);
    if (amountStr === null) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return toast.error('Invalid amount');
    
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/charity/${id}/raised`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ raised_amount: amount })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchCampaigns();
      }
    } catch (err) {
      toast.error('Failed to adjust amount');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Heart className="text-rose-500" fill="currentColor" /> Charity & NGO
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage fundraising campaigns, verify local NGOs, and track donations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Campaign Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Start Campaign
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>NGO / Organizer Name</label>
                <input 
                  type="text" 
                  value={ngoName}
                  onChange={e => setNgoName(e.target.value)}
                  placeholder="e.g. Save Earth Foundation"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Campaign Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Relief Fund for Local Area"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Goal Amount (₹)</label>
                <input 
                  type="number" 
                  value={goalAmount}
                  onChange={e => setGoalAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleCreateCampaign}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e11d48, #be123c)' }}
              >
                <HandHeart className="w-4 h-4" /> {submitting ? 'Creating...' : 'Launch Campaign'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Campaigns Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Heart className="w-5 h-5 text-rose-500" /> Active Campaigns
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">Loading campaigns...</div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12 text-slate-500 dark:text-slate-400">No active charity campaigns.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {campaigns.map(camp => {
                  const progress = camp.goal_amount > 0 ? Math.min(100, (camp.raised_amount / camp.goal_amount) * 100) : 0;
                  
                  return (
                    <div key={camp.id} className="p-4 border rounded-2xl flex flex-col justify-between relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                      
                      {/* Progress Bar Background */}
                      <div className="absolute top-0 left-0 h-1 bg-rose-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>

                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-2 mt-2">
                          <h4 className="font-bold text-slate-900 dark:text-white truncate max-w-[140px]">{camp.title}</h4>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                            camp.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                          }`}>
                            {camp.status}
                          </span>
                        </div>
                        
                        <p className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 mb-4 flex items-center gap-1">
                          {camp.ngo_name}
                          {camp.verified_ngo ? <ShieldCheck className="w-3 h-3 text-emerald-500" /> : null}
                        </p>

                        <div className="bg-slate-100 dark:bg-slate-800/50 p-3 rounded-xl mb-4 border border-slate-200 dark:border-slate-700/50">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500 dark:text-slate-400">Raised</span>
                            <span className="text-slate-500 dark:text-slate-400">Goal</span>
                          </div>
                          <div className="flex justify-between font-bold">
                            <span className="text-emerald-400 cursor-pointer border-b border-dashed border-emerald-400/50" onClick={() => adjustRaisedAmount(camp.id, camp.raised_amount)}>₹{camp.raised_amount}</span>
                            <span className="text-slate-600 dark:text-slate-300">₹{camp.goal_amount}</span>
                          </div>
                          <div className="w-full bg-slate-700 h-1.5 rounded-full mt-2 overflow-hidden">
                            <div className="bg-rose-500 h-full rounded-full" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>

                        <div className="mt-2 flex gap-2">
                          <button 
                            onClick={() => toggleVerification(camp.id, camp.verified_ngo)}
                            className={`flex-1 text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition border ${camp.verified_ngo ? 'bg-emerald-600/10 text-emerald-500 border-emerald-500/30' : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          >
                            <ShieldCheck className="w-3 h-3"/> {camp.verified_ngo ? 'Verified NGO' : 'Verify NGO'}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/50 relative z-10">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400">
                          {new Date(camp.created_at).toLocaleDateString()}
                        </span>
                        <div className="flex gap-2">
                          {camp.status !== 'active' && (
                            <button onClick={() => updateStatus(camp.id, 'active')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                              Activate
                            </button>
                          )}
                          {camp.status === 'active' && (
                            <button onClick={() => updateStatus(camp.id, 'frozen')} className="px-3 py-1.5 bg-amber-600/20 text-amber-500 rounded text-xs font-bold hover:bg-amber-600/30">
                              Freeze
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
