'use client';
import React, { useState, useEffect } from 'react';
import { Activity, MapPin, Truck, AlertTriangle, CheckCircle, Clock, HeartPulse, Plus, Phone, Droplet } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MedicalDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [patientName, setPatientName] = useState('');
  const [phone, setPhone] = useState('');
  const [requestType, setRequestType] = useState('Ambulance');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [urgency, setUrgency] = useState('Critical');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/medical/requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setRequests(data.data);
      }
    } catch (err) {
      toast.error('Failed to load medical requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleCreateRequest = async () => {
    if (!patientName || !phone || !requestType || !location) return toast.error('Required fields missing');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/medical/requests', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ patient_name: patientName, phone, request_type: requestType, blood_group: requestType === 'Blood Required' ? bloodGroup : null, urgency, location })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setPatientName('');
        setPhone('');
        setLocation('');
        fetchRequests();
      } else {
        toast.error(data.error || 'Failed to log request');
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
      const res = await fetch(`http://localhost:5000/api/v1/admin/medical/requests/${id}/status`, {
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
      const res = await fetch(`http://localhost:5000/api/v1/admin/medical/requests/${id}/dispatch`, {
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
            <HeartPulse className="text-rose-500" /> Medical & Care
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage local medical emergencies, ambulance dispatches, and blood donation requests.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Request Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Plus className="w-5 h-5 text-emerald-500" /> Log Emergency
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Patient Name</label>
                <input 
                  type="text" 
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Ramesh Kumar"
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
                <div className={requestType !== 'Blood Required' ? 'col-span-2' : ''}>
                  <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Request Type</label>
                  <select 
                    value={requestType}
                    onChange={e => setRequestType(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none"
                    style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                  >
                    <option>Ambulance</option>
                    <option>Blood Required</option>
                    <option>Doctor Consult</option>
                    <option>Pharmacy / Meds</option>
                  </select>
                </div>
                {requestType === 'Blood Required' && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Blood Group</label>
                    <select 
                      value={bloodGroup}
                      onChange={e => setBloodGroup(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none font-bold text-rose-500"
                      style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)' }}
                    >
                      <option>A+</option><option>A-</option>
                      <option>B+</option><option>B-</option>
                      <option>O+</option><option>O-</option>
                      <option>AB+</option><option>AB-</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Urgency</label>
                <select 
                  value={urgency}
                  onChange={e => setUrgency(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm appearance-none font-bold"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: urgency === 'Critical' ? '#ef4444' : urgency === 'High' ? '#f97316' : 'var(--text-main)' }}
                >
                  <option className="text-red-500">Critical</option>
                  <option className="text-orange-500">High</option>
                  <option>Normal</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Hospital / Exact Location</label>
                <textarea 
                  rows={2}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. City Hospital, Ward 4"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm resize-none"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleCreateRequest}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)' }}
              >
                <HeartPulse className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Log Emergency'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Requests Grid (Sorted by Priority) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold flex items-center gap-2 mb-6" style={{ color: 'var(--text-main)' }}>
              <Activity className="w-5 h-5 text-rose-500" /> Active Emergency Board
            </h2>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading emergencies...</div>
            ) : requests.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No active medical requests.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {requests.map(req => (
                  <div key={req.id} className="p-4 border rounded-2xl flex flex-col justify-between relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    {/* Priority Highlight Indicator */}
                    <div className={`absolute top-0 left-0 w-1.5 h-full ${
                      req.urgency === 'Critical' ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 
                      req.urgency === 'High' ? 'bg-orange-500' : 'bg-green-500'
                    }`}></div>

                    <div className="pl-3">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex flex-col">
                          <h4 className="font-bold text-white text-lg flex items-center gap-2">
                            {req.request_type}
                            {req.request_type === 'Blood Required' && (
                              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded border bg-rose-500/10 text-rose-500 border-rose-500/30 flex items-center gap-1">
                                <Droplet className="w-3 h-3 fill-rose-500"/> {req.blood_group}
                              </span>
                            )}
                          </h4>
                          <span className={`text-[10px] uppercase font-black px-1.5 py-0.5 mt-1 rounded border inline-block w-max ${
                            req.urgency === 'Critical' ? 'bg-red-500/10 text-red-500 border-red-500/30' : 
                            req.urgency === 'High' ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 
                            'bg-green-500/10 text-green-500 border-green-500/30'
                          }`}>
                            {req.urgency} Urgency
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          req.status === 'resolved' ? 'bg-emerald-500/20 text-emerald-500' : 
                          req.status === 'cancelled' ? 'bg-slate-700 text-slate-400' : 'bg-rose-500/20 text-rose-500'
                        }`}>
                          {req.status}
                        </span>
                      </div>
                      
                      <div className="bg-slate-800/50 p-3 rounded-xl mt-4 border border-slate-700/50">
                        <span className="text-xs font-bold text-slate-400 block mb-1">Patient Info</span>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-bold text-slate-200">{req.patient_name}</span>
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
                          disabled={req.status === 'resolved' || req.status === 'cancelled'}
                          className={`w-full text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition ${req.dispatched ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 disabled:opacity-50'}`}
                        >
                          <Truck className="w-3 h-3"/> {req.dispatched ? 'Resource Dispatched' : 'Dispatch Resource'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50 relative z-10 pl-3">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3"/>
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {req.status !== 'resolved' && req.status !== 'cancelled' && (
                          <button onClick={() => updateStatus(req.id, 'resolved')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                            Resolve
                          </button>
                        )}
                        {req.status !== 'resolved' && req.status !== 'cancelled' && (
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
