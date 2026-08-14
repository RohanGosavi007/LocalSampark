'use client';
import React, { useState, useEffect } from 'react';
import { Leaf, Tractor, ShieldCheck, CheckCircle, XCircle, Clock, Plus } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function KrishiDashboard() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('crop');
  const [autoExpire, setAutoExpire] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchListings = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/krishi', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setListings(data.data);
      }
    } catch (err) {
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleCreateListing = async () => {
    if (!title || !price) return toast.error('Title and price required');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/krishi', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, price, type, auto_expire: autoExpire })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setTitle('');
        setDescription('');
        setPrice('');
        fetchListings();
      } else {
        toast.error(data.error || 'Failed to post listing');
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
      const res = await fetch(`${API_BASE}/admin/krishi/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchListings();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleVerification = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/krishi/${id}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_farmer: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchListings();
      }
    } catch (err) {
      toast.error('Failed to update verification');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Leaf className="text-green-500" /> Krishi & Rural
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage agricultural listings, equipment rentals, and farmer verifications.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Posting Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Create Listing
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Listing Type</label>
                <div className="flex gap-2">
                  <button onClick={() => setType('crop')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${type === 'crop' ? 'bg-green-600 border-green-500 text-white' : 'bg-transparent border-slate-700 text-slate-400'}`}>
                    <Leaf className="w-4 h-4 mx-auto mb-1" /> Crops / Seeds
                  </button>
                  <button onClick={() => setType('equipment')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${type === 'equipment' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-transparent border-slate-700 text-slate-400'}`}>
                    <Tractor className="w-4 h-4 mx-auto mb-1" /> Equipment
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Title</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. 50kg Organic Wheat"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Price</label>
                <input 
                  type="text" 
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  placeholder="e.g. ₹2500 per Quintal"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-xl" style={{ borderColor: 'var(--border-color)' }}>
                <div>
                  <h4 className="text-sm font-bold text-white">Auto-Expire</h4>
                  <p className="text-[10px] text-slate-400">Expire after 60 days</p>
                </div>
                <button 
                  onClick={() => setAutoExpire(!autoExpire)}
                  className={`w-12 h-6 rounded-full transition-colors flex items-center px-1 ${autoExpire ? 'bg-green-500 justify-end' : 'bg-slate-700 justify-start'}`}
                >
                  <div className="w-4 h-4 bg-white rounded-full"></div>
                </button>
              </div>

              <button 
                onClick={handleCreateListing}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
              >
                <Plus className="w-4 h-4" /> {submitting ? 'Posting...' : 'Publish Listing'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Krishi Listings Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Leaf className="w-5 h-5 text-green-500" /> Marketplace Overview
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading listings...</div>
            ) : listings.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No active Krishi listings.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {listings.map(item => (
                  <div key={item.id} className="p-4 border rounded-2xl flex flex-col justify-between" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          {item.type === 'crop' ? <Leaf className="w-4 h-4 text-green-500"/> : <Tractor className="w-4 h-4 text-orange-500"/>}
                          <h4 className="font-bold text-white truncate max-w-[120px]">{item.title}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          item.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' :
                          item.status === 'expired' ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mt-3 mb-2">
                        <p className="text-sm font-black text-green-400">{item.price}</p>
                        <button 
                          onClick={() => toggleVerification(item.id, item.verified_farmer)}
                          className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded transition ${item.verified_farmer ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'}`}
                        >
                          <ShieldCheck className="w-3 h-3"/> {item.verified_farmer ? 'Verified Farmer' : 'Unverified'}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <Clock className="w-3 h-3"/> 
                        {item.auto_expire ? 'Auto-Expires in 60d' : 'No Expiry (Manual)'}
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50">
                      <span className="text-[10px] text-slate-500 uppercase font-bold text-ellipsis overflow-hidden whitespace-nowrap max-w-[100px]">
                        By: {item.seller_name || 'System'}
                      </span>
                      <div className="flex gap-2">
                        {item.status !== 'active' && (
                          <button onClick={() => updateStatus(item.id, 'active')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                            Approve
                          </button>
                        )}
                        {item.status === 'active' && (
                          <button onClick={() => updateStatus(item.id, 'rejected')} className="px-3 py-1.5 bg-red-600/20 text-red-500 rounded text-xs font-bold hover:bg-red-600/30">
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
