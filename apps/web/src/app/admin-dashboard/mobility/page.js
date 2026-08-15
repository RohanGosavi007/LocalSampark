'use client';
import React, { useState, useEffect } from 'react';
import { Car, MapPin, ShieldCheck, RefreshCw, Users, Leaf, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function EnhancedMobilityAdminDashboard() {
  const [activeTab, setActiveTab] = useState('rides');
  const [stats, setStats] = useState({ total_rides: 0, active_rides: 0, total_bookings: 0, total_co2_kg: 0, total_saved_inr: 0, total_groups: 0 });
  const [rides, setRides] = useState([]);
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/carpool/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setStats(data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchRides = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/carpool/rides`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setRides(data.rides || []);
    } catch (err) {
      toast.error('Failed to load rides');
    } finally {
      setLoading(false);
    }
  };

  const fetchFleet = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/mobility/fleet`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setFleet(data.data || []);
    } catch (err) {
      toast.error('Failed to load fleet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    if (activeTab === 'rides') fetchRides();
    if (activeTab === 'fleet') fetchFleet();
  }, [activeTab]);

  const updateRideStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/tri-category/carpool/rides/${id}/status`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchRides();
      }
    } catch (err) {
      toast.error('Failed to update ride status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Car className="text-sky-500" /> Mobility, Carpool & Green Transit HQ
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Monitor shared commuter rides, verify drivers, and oversee local logistics fleet.</p>
        </div>
        <button onClick={() => { fetchStats(); if (activeTab==='rides') fetchRides(); else fetchFleet(); }} className="px-4 py-2 rounded-xl flex items-center gap-2 border font-medium text-sm" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', color: 'var(--text-main)' }}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Total Carpool Rides</span>
          <p className="text-2xl font-black text-sky-400">{stats.total_rides}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Live Commute Groups</span>
          <p className="text-2xl font-black text-cyan-400">{stats.total_groups}</p>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">CO₂ Emissions Saved</span>
          <p className="text-2xl font-black text-emerald-400">{Number(stats.total_co2_kg || 0).toFixed(1)} kg</p>
          <span className="text-[10px] text-slate-500">Green Eco Impact</span>
        </div>
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <span className="text-xs font-bold text-slate-400 block mb-1">Money Saved By Commuters</span>
          <p className="text-2xl font-black text-amber-400">₹{Number(stats.total_saved_inr || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 border-b pb-3" style={{ borderColor: 'var(--border-color)' }}>
        <button onClick={() => setActiveTab('rides')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'rides' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          🚗 Shared Carpool Rides ({rides.length})
        </button>
        <button onClick={() => setActiveTab('fleet')} className={`px-5 py-2.5 rounded-xl font-bold text-sm transition ${activeTab === 'fleet' ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
          🛺 Registered Drivers & Fleet ({fleet.length})
        </button>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="text-center py-16 text-slate-500">Loading Mobility & Fleet Records...</div>
      ) : activeTab === 'rides' ? (
        <div className="border rounded-3xl p-6 shadow-xl space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h2 className="text-lg font-bold text-white mb-4">Active & Completed Carpool Routes</h2>
          {rides.length === 0 ? (
            <p className="text-slate-500 text-sm">No carpool rides published yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="border-b text-xs uppercase font-bold text-slate-400" style={{ borderColor: 'var(--border-color)' }}>
                  <tr>
                    <th className="py-3 px-4">Driver</th>
                    <th className="py-3 px-4">Origin → Destination</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Available Seats</th>
                    <th className="py-3 px-4">Fare / Seat</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Moderation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {rides.map(r => (
                    <tr key={r.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">
                        {r.driver_name || 'Driver'}
                        <span className="text-[10px] block text-slate-500">{r.driver_phone}</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200">
                        {r.from_location} <span className="text-sky-400">→</span> {r.to_location}
                      </td>
                      <td className="py-3 px-4 text-xs text-slate-400">
                        {r.ride_date || 'N/A'} @ {r.departure_time || 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                        {r.available_seats} / {r.seats_available}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400">
                        ₹{r.price_per_seat}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' :
                          r.status === 'completed' ? 'bg-sky-500/20 text-sky-400' : 'bg-red-500/20 text-red-400'
                        }`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {r.status === 'active' ? (
                          <button onClick={() => updateRideStatus(r.id, 'cancelled')} className="px-3 py-1 bg-red-600/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-bold hover:bg-red-600/30">
                            Cancel Ride
                          </button>
                        ) : (
                          <button onClick={() => updateRideStatus(r.id, 'active')} className="px-3 py-1 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold hover:bg-emerald-600/30">
                            Reactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fleet.map(d => (
            <div key={d.id} className="p-4 rounded-2xl border flex flex-col justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-white text-base">{d.driver_name}</h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${d.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>{d.status}</span>
                </div>
                <p className="text-xs text-slate-400 mb-2">{d.vehicle_type} • RC: <span className="font-mono text-slate-200">{d.rc_number}</span></p>
                <p className="text-xs text-slate-500">Phone: {d.phone}</p>
              </div>
              <div className="mt-4 pt-3 border-t flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
                <span className="text-[10px] text-emerald-400 font-bold">
                  {d.verified_driver ? '✓ Verified Background' : 'Pending Review'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
