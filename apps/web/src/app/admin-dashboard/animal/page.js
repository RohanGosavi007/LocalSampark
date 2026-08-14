'use client';
import React, { useState, useEffect } from 'react';
import { Activity, MapPin, Truck, AlertTriangle, CheckCircle, Clock, PawPrint, Plus, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function AnimalWelfareDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [reporterName, setReporterName] = useState('');
  const [phone, setPhone] = useState('');
  const [animalType, setAnimalType] = useState('Dog');
  const [severity, setSeverity] = useState('Critical');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/animal/rescue', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      toast.error('Failed to load rescue requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async () => {
    if (!reporterName || !phone || !animalType || !location) return toast.error('Required fields missing');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/animal/rescue', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ reporter_name: reporterName, phone, animal_type: animalType, severity, location })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setReporterName('');
        setPhone('');
        setAnimalType('Dog');
        setSeverity('Critical');
        setLocation('');
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
      const res = await fetch(`${API_BASE}/admin/animal/rescue/${id}/status`, {
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
      const res = await fetch(`${API_BASE}/admin/animal/rescue/${id}/dispatch`, {
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
            <PawPrint className="text-pink-500" /> Animal Welfare
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage stray animal rescue requests and dispatch local NGO veterinary teams.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Request Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <AlertTriangle className="w-5 h-5 text-amber-500" /> Log Rescue Request
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Reporter Name</label>
                <input 
                  type="text" 
                  value={reporterName}
                  onChange={e => setReporterName(e.target.value)}
                  placeholder="e.g. Sneha Patel"
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
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Animal Type</label>
                  <select 
                    value={animalType}
                    onChange={e => setAnimalType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    <option>Dog</option>
                    <option>Cat</option>
                    <option>Cattle / Cow</option>
                    <option>Bird</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Severity</label>
                  <select 
                    value={severity}
                    onChange={e => setSeverity(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none font-bold"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: severity === 'Critical' ? '#ef4444' : severity === 'High' ? '#f97316' : 'var(--text-main)' }}
                  >
                    <option className="text-red-500">Critical</option>
                    <option className="text-orange-500">High</option>
                    <option>Moderate</option>
                    <option>Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Exact Location</label>
                <textarea 
                  rows={2}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Near Station Gate 2"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleCreateRequest}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #ec4899, #be185d)' }}
              >
                <PawPrint className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Log Rescue Case'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Requests Grid (Sorted by Priority) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>
              <Activity className="w-5 h-5 text-pink-500" /> Rescue Dispatch Board
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading cases...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No pending rescue requests.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(req => (
                  <div key={req.id} className="p-4 border rounded-2xl flex flex-col justify-between relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    {/* Priority Highlight Indicator */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      req.severity === 'Critical' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
                      req.severity === 'High' ? 'bg-orange-500' : 
                      req.severity === 'Moderate' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>

                    <div className="pl-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {req.animal_type}
                            <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 rounded border ${
                              req.severity === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 
                              req.severity === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 
                              req.severity === 'Moderate' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30' : 
                              'bg-green-500/10 text-green-500 border-green-500/30'
                            }`}>
                              {req.severity} Priority
                            </span>
                          </h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          req.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 
                          req.status === 'cancelled' ? 'bg-slate-700 text-slate-400' : 'bg-pink-500/20 text-pink-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="bg-slate-800/50 p-3 rounded-xl mt-4 border border-slate-700/50">
                        <span className="text-xs font-bold text-slate-400 block mb-1">Reporter</span>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-200">{req.reporter_name}</span>
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1"><Phone className="w-3 h-3"/> {req.phone}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-start gap-2 text-xs text-slate-400">
                        <MapPin className="w-4 h-4 text-rose-500 shrink-0 mt-0.5"/>
                        <p className="line-clamp-2">{req.location}</p>
                      </div>
                      
                      <div className="mt-4 flex">
                        <button 
                          onClick={() => toggleDispatch(req.id, req.dispatched)}
                          disabled={req.status === 'completed' || req.status === 'cancelled'}
                          className={`w-full text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition ${req.dispatched ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50'}`}
                        >
                          <Truck className="w-3 h-3"/> {req.dispatched ? 'NGO Rescue Team Dispatched' : 'Dispatch Rescue Team'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50 relative z-10 pl-3">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {req.status !== 'completed' && req.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(req.id, 'completed')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                            Rescued
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
