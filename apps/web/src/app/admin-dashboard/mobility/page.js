'use client';
import React, { useState, useEffect } from 'react';
import { Car, MapPin, UserPlus, ShieldCheck, CheckCircle, XCircle, Settings, Truck } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function MobilityDashboard() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [driverName, setDriverName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState('auto');
  const [rcNumber, setRcNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchFleet = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/mobility/fleet', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFleet(data.data);
      }
    } catch (err) {
      toast.error('Failed to load fleet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleet();
    
    // Simulate live GPS updates
    const interval = setInterval(() => {
      setFleet(prev => prev.map(f => ({
        ...f,
        location_lat: f.location_lat + (Math.random() - 0.5) * 0.001,
        location_lng: f.location_lng + (Math.random() - 0.5) * 0.001
      })));
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  const handleOnboard = async () => {
    if (!driverName || !phone || !rcNumber) return toast.error('All fields required');
    setSubmitting(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch('http://localhost:5000/api/v1/admin/mobility/fleet', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ driver_name: driverName, phone, vehicle_type: vehicleType, rc_number: rcNumber })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setDriverName('');
        setPhone('');
        setRcNumber('');
        fetchFleet();
      } else {
        toast.error(data.error || 'Failed to onboard');
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
      const res = await fetch(`http://localhost:5000/api/v1/admin/mobility/fleet/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchFleet();
      }
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const toggleVerification = async (id, currentStatus) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/mobility/fleet/${id}/verify`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified_driver: !currentStatus })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchFleet();
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
            <Car className="text-sky-500" /> Mobility & Transport
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Onboard local drivers, verify backgrounds, and track live fleet logistics.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Onboarding Form */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <UserPlus className="w-5 h-5 text-emerald-500" /> Onboard Driver
            </h2>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Vehicle Class</label>
                <div className="flex gap-2">
                  <button onClick={() => setVehicleType('auto')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center ${vehicleType === 'auto' ? 'bg-amber-500/20 border-amber-500 text-amber-500' : 'bg-transparent border-slate-700 text-slate-400'}`}>
                    <span className="text-lg">🛺</span> Auto
                  </button>
                  <button onClick={() => setVehicleType('cab')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center ${vehicleType === 'cab' ? 'bg-sky-500/20 border-sky-500 text-sky-500' : 'bg-transparent border-slate-700 text-slate-400'}`}>
                    <Car className="w-4 h-4 mb-1"/> Cab
                  </button>
                  <button onClick={() => setVehicleType('truck')} className={`flex-1 py-2 rounded-xl text-xs font-bold border transition flex flex-col items-center justify-center ${vehicleType === 'truck' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-500' : 'bg-transparent border-slate-700 text-slate-400'}`}>
                    <Truck className="w-4 h-4 mb-1"/> Logistics
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Driver Full Name</label>
                <input 
                  type="text" 
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
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
                <label className="text-[10px] font-bold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Vehicle RC Number</label>
                <input 
                  type="text" 
                  value={rcNumber}
                  onChange={e => setRcNumber(e.target.value)}
                  placeholder="e.g. MH 02 AB 1234"
                  className="w-full px-4 py-3 rounded-xl border outline-none text-sm font-mono uppercase"
                  style={{ backgroundColor: 'var(--bg-base)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}
                />
              </div>

              <button 
                onClick={handleOnboard}
                disabled={submitting}
                className="w-full py-4 mt-2 font-bold rounded-xl text-white shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}
              >
                <UserPlus className="w-4 h-4" /> {submitting ? 'Registering...' : 'Register Driver'}
              </button>
            </div>
          </div>
        </div>

        {/* Live Fleet Tracking Grid */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-slate-900 border rounded-3xl p-6 shadow-xl min-h-[500px]" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <MapPin className="w-5 h-5 text-sky-500" /> Fleet Tracking Overview
              </h2>
              <span className="flex items-center gap-2 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Live GPS Sync
              </span>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500">Connecting to Fleet...</div>
            ) : fleet.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No drivers onboarded.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fleet.map(driver => (
                  <div key={driver.id} className="p-4 border rounded-2xl flex flex-col justify-between relative overflow-hidden" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                    
                    {/* Map Background Mock */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 rounded-bl-full border-b border-l pointer-events-none" style={{ borderColor: 'var(--border-color)' }}></div>
                    <MapPin className="absolute top-4 right-4 w-4 h-4 text-sky-500/30 pointer-events-none" />

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white truncate max-w-[120px]">{driver.driver_name}</h4>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 ${
                          driver.status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {driver.status}
                        </span>
                      </div>
                      
                      <p className="text-[10px] uppercase font-bold text-slate-500 mb-2">
                        {driver.vehicle_type} • <span className="text-slate-300 font-mono">{driver.rc_number}</span>
                      </p>
                      
                      <div className="flex items-center justify-between mt-3 mb-2">
                        <p className="text-xs font-mono text-sky-400 bg-sky-500/10 px-2 py-1 rounded">
                          {driver.location_lat.toFixed(4)}, {driver.location_lng.toFixed(4)}
                        </p>
                      </div>
                      
                      <div className="mt-4 flex">
                        <button 
                          onClick={() => toggleVerification(driver.id, driver.verified_driver)}
                          className={`w-full text-[10px] font-bold flex items-center justify-center gap-1 px-2 py-2 rounded-xl transition ${driver.verified_driver ? 'bg-blue-600/20 text-blue-400' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                        >
                          <ShieldCheck className="w-3 h-3"/> {driver.verified_driver ? 'Background Check Passed' : 'Pending Background Check'}
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50 relative z-10">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {driver.phone}
                      </span>
                      <div className="flex gap-2">
                        {driver.status !== 'active' && (
                          <button onClick={() => updateStatus(driver.id, 'active')} className="px-3 py-1.5 bg-emerald-600/20 text-emerald-500 rounded text-xs font-bold hover:bg-emerald-600/30">
                            Activate
                          </button>
                        )}
                        {driver.status === 'active' && (
                          <button onClick={() => updateStatus(driver.id, 'suspended')} className="px-3 py-1.5 bg-red-600/20 text-red-500 rounded text-xs font-bold hover:bg-red-600/30">
                            Suspend
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
