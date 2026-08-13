'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Server, Cpu, HardDrive, Database, Terminal, RefreshCw, AlertTriangle, AlertCircle, Info, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function PerformanceDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const fetchHealth = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/health`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      toast.error('Failed to load system health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 10 seconds for "live" feel
    const interval = setInterval(fetchHealth, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleClearCache = async () => {
    setClearing(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`http://localhost:5000/api/v1/admin/health/clear-cache`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        toast.success(result.message);
        fetchHealth(); // refresh logs
      } else {
        toast.error(result.error || 'Failed to clear cache');
      }
    } catch (err) {
      toast.error('Network Error');
    } finally {
      setClearing(false);
    }
  };

  if (loading && !data) {
    return <div className="text-center py-20 text-slate-500">Loading Infrastructure Metrics...</div>;
  }

  const { system, logs } = data || {};

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatUptime = (seconds) => {
    const d = Math.floor(seconds / (3600*24));
    const h = Math.floor(seconds % (3600*24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Server className="text-sky-500" /> System Health
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Live infrastructure monitoring, server metrics, and API error logs.</p>
        </div>
        
        <div className="flex gap-3">
          <button 
            onClick={fetchHealth}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-xl flex items-center gap-2 transition"
          >
            <RefreshCw className="w-4 h-4"/> Refresh
          </button>
          <button 
            onClick={handleClearCache}
            disabled={clearing}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/50 text-sm font-bold rounded-xl flex items-center gap-2 transition disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4"/> {clearing ? 'Clearing...' : 'Clear Global Cache'}
          </button>
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Memory (RAM)</h3>
            <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center">
              <HardDrive className="w-4 h-4 text-blue-500"/>
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">
              {system?.memory?.usagePercent}%
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {formatBytes(system?.memory?.used)} / {formatBytes(system?.memory?.total)}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${system?.memory?.usagePercent}%` }}></div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">CPU Cores</h3>
            <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
              <Cpu className="w-4 h-4 text-purple-500"/>
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">
              {system?.cpu?.cores} Cores
            </div>
            <div className="text-xs text-slate-400 mt-1 truncate" title={system?.cpu?.model}>
              {system?.cpu?.model}
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
               <div className="bg-purple-500 h-full rounded-full w-1/3"></div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">SQLite Database</h3>
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-500"/>
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">
              {system?.database?.sizeMB} MB
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {system?.database?.activeConnections} Active Connections
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
               <div className="bg-emerald-500 h-full rounded-full w-[45%]"></div>
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Server Uptime</h3>
            <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-amber-500"/>
            </div>
          </div>
          <div className="relative z-10">
            <div className="text-3xl font-black text-white">
              {formatUptime(system?.uptime || 0)}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Avg API Latency: {system?.api?.avgLatencyMs}ms
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-4 overflow-hidden">
               <div className="bg-amber-500 h-full rounded-full w-full"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        
        {/* Streaming Error Logs (Terminal View) */}
        <div className="rounded-3xl border shadow-2xl overflow-hidden flex flex-col h-[500px]" style={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}>
          
          <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-300 flex items-center gap-2 font-mono">
              <Terminal className="w-4 h-4 text-emerald-500" /> root@god-mode:~ /var/log/api.log
            </h2>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-emerald-500/50"></div>
            </div>
          </div>
          
          <div className="p-6 font-mono text-xs overflow-y-auto flex-1 space-y-3 relative">
            {logs?.map((log, i) => (
              <div key={i} className="flex gap-4 border-b border-slate-800/50 pb-3 hover:bg-slate-800/30 p-1 -mx-1 rounded">
                <div className="text-slate-500 shrink-0 w-20">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </div>
                
                <div className={`shrink-0 w-16 font-bold flex items-center gap-1 ${
                  log.level === 'ERROR' ? 'text-red-500' : 
                  log.level === 'WARN' ? 'text-amber-500' : 'text-sky-500'
                }`}>
                  {log.level === 'ERROR' && <AlertCircle className="w-3 h-3"/>}
                  {log.level === 'WARN' && <AlertTriangle className="w-3 h-3"/>}
                  {log.level === 'INFO' && <Info className="w-3 h-3"/>}
                  {log.level}
                </div>
                
                <div className="text-purple-400 shrink-0 w-48 truncate">
                  [{log.route}]
                </div>
                
                <div className="text-slate-300 flex-1 break-words">
                  {log.message}
                </div>
              </div>
            ))}
            
            <div className="flex items-center gap-2 text-slate-500 pt-2 animate-pulse">
              <span>Listening for incoming traces...</span>
              <span className="w-2 h-4 bg-slate-500 inline-block"></span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
