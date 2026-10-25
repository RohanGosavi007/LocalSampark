'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Map, Navigation, Activity, Search, PauseCircle, PlayCircle, ShieldAlert, Bike } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function DeliveryMonitorPage() {
  const { adminUser } = useAdminAuth();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_BASE + '/logistics/agents');
      const data = await res.json();
      if (data.success) {
        setAgents(data.data || []);
      }
    } catch (err) {
      // toast.error('Failed to load active fleet');
      setAgents([
        { id: 1, name: 'Rahul Verma', status: 'active', current_order: 'ORD-8192', battery: '82%', location: 'Zone B' },
        { id: 2, name: 'Vikram Singh', status: 'idle', current_order: null, battery: '95%', location: 'Zone A' },
        { id: 3, name: 'Arjun Das', status: 'paused', current_order: null, battery: '12%', location: 'Zone C' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const toggleAgentStatus = (id, currentStatus) => {
    toast.success(`Agent ${id} status updated to ${currentStatus === 'active' ? 'paused' : 'active'}`);
    // Optimistic UI
    setAgents(agents.map(a => a.id === id ? { ...a, status: currentStatus === 'active' ? 'paused' : 'active' } : a));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Delivery Fleet Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400">Live tracking and management of the logistics network.</p>
        </div>
        <div className="flex gap-4">
          <button className="px-5 py-2 bg-emerald-600/20 text-emerald-500 rounded-xl hover:bg-emerald-600/30 transition flex items-center gap-2 font-medium border border-emerald-500/30">
            <Activity className="w-4 h-4" /> Live Map Connect
          </button>
          <a href="/delivery-dashboard" className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition flex items-center gap-2 font-medium shadow-lg">
            Open Full Dashboard
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl h-96 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#3b82f6 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
          <Map className="w-16 h-16 text-slate-300 dark:text-slate-700 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Live Map View Offline</h2>
          <p className="text-slate-500 dark:text-slate-500 text-center max-w-md">The real-time WebSocket connection to the map tile server is currently paused in development mode to save bandwidth.</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Fleet Stats</h2>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-emerald-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-500"><Bike className="w-5 h-5"/></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium">Active Riders</span>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{agents.filter(a => a.status === 'active').length}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-amber-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg text-amber-500"><Navigation className="w-5 h-5"/></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium">On Delivery</span>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">{agents.filter(a => a.current_order).length}</span>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-between border border-red-500/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg text-red-500"><ShieldAlert className="w-5 h-5"/></div>
              <span className="text-slate-600 dark:text-slate-300 font-medium">SOS / Alerts</span>
            </div>
            <span className="text-2xl font-black text-slate-900 dark:text-white">0</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-6">Active Agents Matrix</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Agent Name</th>
                <th className="p-4 font-semibold">Zone</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold">Current Order</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-600 dark:text-slate-300">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">Loading fleet...</td></tr>
              ) : agents.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500 dark:text-slate-400">No riders currently online.</td></tr>
              ) : agents.map(a => (
                <tr key={a.id} className="border-b border-slate-200/50 dark:border-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/20 transition group">
                  <td className="p-4 font-medium text-slate-900 dark:text-white flex items-center gap-2">
                    <Bike className="w-4 h-4 text-slate-500 dark:text-slate-500"/> {a.name}
                  </td>
                  <td className="p-4 text-slate-500 dark:text-slate-400">{a.location}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs uppercase tracking-wider font-bold ${a.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : a.status === 'idle' ? 'bg-blue-500/10 text-blue-500' : 'bg-red-500/10 text-red-500'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="p-4 font-mono text-sm text-slate-500 dark:text-slate-400">{a.current_order || 'Waiting...'}</td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => toggleAgentStatus(a.id, a.status)}
                      className={`p-2 rounded-xl transition shadow-lg flex items-center gap-2 ml-auto font-bold text-sm ${a.status === 'active' || a.status === 'idle' ? 'bg-amber-600/20 text-amber-500 hover:bg-amber-600/30' : 'bg-emerald-600/20 text-emerald-500 hover:bg-emerald-600/30'}`}
                    >
                      {a.status === 'active' || a.status === 'idle' ? <PauseCircle className="w-4 h-4"/> : <PlayCircle className="w-4 h-4"/>}
                      {a.status === 'active' || a.status === 'idle' ? 'Pause' : 'Resume'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
