'use client';
import React, { useState, useEffect } from 'react';
import { Recycle, MapPin, Truck, CheckCircle, Clock, Trash2, Plus, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function EnvironmentDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [scrapType, setScrapType] = useState('');
  const [estimatedWeight, setEstimatedWeight] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/environment/scrap', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      toast.error('Failed to load scrap requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async () => {
    if (!userName || !phone || !scrapType || !address) return toast.error('Required fields missing');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/environment/scrap', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_name: userName, phone, scrap_type: scrapType, estimated_weight: estimatedWeight, address })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setUserName('');
        setPhone('');
        setScrapType('');
        setEstimatedWeight('');
        setAddress('');
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to create request');
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
      const res = await fetch(`${API_BASE}/admin/environment/scrap/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchRequests();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleDispatch = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/environment/scrap/${id}/dispatch`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dispatched: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchRequests();
      }
    } catch (err) {
      toast.error('Failed to update dispatch status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Recycle className="text-green-500" /> Environment & Waste
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage local Kabaadiwala scrap collections, dispatch agents, and monitor recycling.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Request Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Log Pickup Request
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>User Name</label>
                <input 
                  type="text" 
                  value={userName}
                  onChange={e => setUserName(e.target.value)}
                  placeholder="e.g. Anjali Verma"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. +91 9876543210"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-mono"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>
              
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Scrap Material (Free Text)</label>
                <input 
                  type="text" 
                  value={scrapType}
                  onChange={e => setScrapType(e.target.value)}
                  placeholder="e.g. Old AC & Newspapers"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Estimated Weight</label>
                <input 
                  type="text" 
                  value={estimatedWeight}
                  onChange={e => setEstimatedWeight(e.target.value)}
                  placeholder="e.g. 50 kg"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Pickup Address</label>
                <textarea 
                  rows={2}
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="e.g. 102, Shanti Niwas, Andheri West"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleCreateRequest}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
              >
                <Recycle className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Schedule Pickup'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Requests Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>
              <Trash2 className="w-5 h-5 text-emerald-500" /> Pending Collections
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No pending scrap collections.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(req => (
                  <div key={req.id} className="p-4 border rounded-2xl flex flex-col justify-between" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-white text-lg">{req.user_name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-1"><Phone className="w-3 h-3"/> {req.phone}</span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          req.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 
                          req.status === 'cancelled' ? 'bg-red-500/20 text-red-500' : 'bg-amber-500/20 text-amber-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="bg-slate-800/50 p-3 rounded-xl mt-4 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-300">Material</span>
                          <span className="text-xs font-bold text-emerald-400">{req.estimated_weight || 'Unknown Wt.'}</span>
                        </div>
                        <p className="text-sm font-medium text-slate-400">{req.scrap_type}</p>
                      </div>

                      <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5"/>
                        <p className="line-clamp-2">{req.address}</p>
                      </div>
                      
                      <div className="mt-4 flex">
                        <button 
                          onClick={() => toggleDispatch(req.id, req.dispatched)}
                          disabled={req.status === 'completed' || req.status === 'cancelled'}
                          className={`w-full text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition ${req.dispatched ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50'}`}
                        >
                          <Truck className="w-3 h-3"/> {req.dispatched ? 'Collector Dispatched' : 'Dispatch Collector'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50 relative z-10">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {req.status !== 'completed' && req.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(req.id, 'completed')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                            Complete
                          </button>
                        )}
                        {req.status !== 'completed' && req.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(req.id, 'cancelled')} className="px-3 py-1.5 bg-red-600/20 text-red-500 rounded text-xs font-bold hover:bg-red-600/30">
                            Cancel
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
