'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, BarChart3, Users, Activity, ShieldAlert, 
  MapPin, AlertTriangle, Truck, Home, TrendingUp, Search, ExternalLink 
} from 'lucide-react';
import Link from 'next/link';

export default function GodModeOverview() {
  const [stats, setStats] = useState({
    volume: '...', users: '...', health: '...', alerts: '...'
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch('http://localhost:5000/api/v1/admin/god-mode/metrics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (json.success && json.data) {
          setStats({
            volume: `${json.data.total_shops} Shops`, // Using shops count as volume placeholder
            users: json.data.total_users.toLocaleString(),
            health: json.data.system_health ? `RAM: ${json.data.system_health.ram_usage}%` : '99.9%',
            alerts: json.data.active_sos.toString()
          });
        }
      } catch (err) {
        console.error('Failed to fetch god-mode metrics', err);
      }
    };
    fetchMetrics();
    // Poll every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, []);
  
  // Dummy Audit Logs
  const auditLogs = [
    { id: 1, action: 'User role changed to Admin', user: 'system_admin', time: '2 mins ago', type: 'security' },
    { id: 2, action: 'Emergency SOS Triggered', user: 'user_9921', time: '14 mins ago', type: 'alert' },
    { id: 3, action: 'Payout Processed (₹45,000)', user: 'finance_auto', time: '1 hour ago', type: 'finance' },
    { id: 4, action: 'New Franchise Onboarded', user: 'sales_rep', time: '3 hours ago', type: 'system' }
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black mb-1" style={{ color: 'var(--text-main)' }}>Global Command Center</h1>
          <p style={{ color: 'var(--text-muted)' }}>Real-time God-Mode overview of the entire LocalSampark ecosystem.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 rounded-xl flex items-center gap-2 font-medium" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
            <Settings size={18} /> Configure
          </button>
          <button className="px-5 py-2 rounded-xl font-medium shadow-lg" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
            Generate Report
          </button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Transaction Vol', value: stats.volume, trend: '+12%', icon: BarChart3, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.1)' },
          { label: 'Active Platform Users', value: stats.users, trend: '+5%', icon: Users, color: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' },
          { label: 'System Uptime', value: stats.health, trend: 'Stable', icon: Activity, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.1)' },
          { label: 'Critical Alerts', value: stats.alerts, trend: 'Needs Action', icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.1)' }
        ].map((stat, i) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} 
            className="rounded-2xl p-6 shadow-sm border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 rounded-xl" style={{ backgroundColor: stat.bg }}>
                <stat.icon size={24} color={stat.color} />
              </div>
              <span className="text-xs font-bold px-2 py-1 rounded-md" style={{ color: stat.color, backgroundColor: stat.bg }}>{stat.trend}</span>
            </div>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <h3 className="text-3xl font-black" style={{ color: 'var(--text-main)' }}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      {/* Main Grid: Heatmap + Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Global Heatmap Placeholder */}
        <div className="col-span-1 lg:col-span-2 rounded-3xl p-1 shadow-sm border overflow-hidden relative" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', minHeight: '400px' }}>
          <div className="absolute inset-0 bg-cover bg-center opacity-30" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }} />
          <div className="relative z-10 p-6 flex flex-col h-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <MapPin size={20} style={{ color: 'var(--accent)' }}/> Live Geospatial Activity
              </h3>
              <div className="flex gap-2">
                <span className="flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md bg-green-500/10 text-green-500"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/> Online</span>
              </div>
            </div>
            
            <div className="flex-1 rounded-2xl flex flex-col items-center justify-center text-center p-8 border border-dashed" style={{ borderColor: 'var(--border-color)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
               <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
                  <Activity size={32} style={{ color: 'var(--accent)' }} />
               </div>
               <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Heatmap Engine Initializing</h4>
               <p className="text-sm max-w-sm mx-auto mb-6" style={{ color: 'var(--text-muted)' }}>
                 Real-time map rendering is currently processing spatial data for delivery fleets and SOS beacons.
               </p>
               <button className="px-6 py-2 rounded-full font-bold text-sm transition-all shadow-md" style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                 Force Sync Map Data
               </button>
            </div>
          </div>
        </div>

        {/* Audit Logs */}
        <div className="col-span-1 rounded-3xl p-6 shadow-sm border flex flex-col" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <h3 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
             <Search size={20} style={{ color: 'var(--accent)' }}/> System Audit Log
          </h3>
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-4 rounded-xl border relative" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-base)' }}>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider" style={{ 
                    color: log.type === 'alert' ? '#ef4444' : log.type === 'security' ? '#8b5cf6' : 'var(--accent)' 
                  }}>
                    {log.type}
                  </span>
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{log.time}</span>
                </div>
                <p className="font-semibold text-sm mb-1" style={{ color: 'var(--text-main)' }}>{log.action}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>By: {log.user}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-3 rounded-xl font-bold text-sm" style={{ border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
            View Full Audit Trail
          </button>
        </div>

      </div>

      {/* Deep Links to Dashboards */}
      <div>
        <h3 className="text-xl font-bold mb-6" style={{ color: 'var(--text-main)' }}>Core Modules Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin-dashboard/delivery-monitor" style={{ textDecoration: 'none' }}>
            <div className="p-6 rounded-2xl border transition-all hover:-translate-y-1 shadow-sm group" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
                <Truck size={24} />
              </div>
              <h4 className="font-bold mb-2 flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                Logistics & Fleet <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Live map of all delivery partners, active orders, and fleet routing.</p>
            </div>
          </Link>

          <Link href="/admin-dashboard/societies" style={{ textDecoration: 'none' }}>
            <div className="p-6 rounded-2xl border transition-all hover:-translate-y-1 shadow-sm group" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <Home size={24} />
              </div>
              <h4 className="font-bold mb-2 flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                Society Network <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Manage residential societies, gatekeeper logs, and community boards.</p>
            </div>
          </Link>

          <Link href="/admin-dashboard/sos" style={{ textDecoration: 'none' }}>
            <div className="p-6 rounded-2xl border transition-all hover:-translate-y-1 shadow-sm group" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                <ShieldAlert size={24} />
              </div>
              <h4 className="font-bold mb-2 flex items-center justify-between" style={{ color: 'var(--text-main)' }}>
                SOS Command <ExternalLink size={16} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </h4>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monitor and respond to critical emergency alerts across the platform.</p>
            </div>
          </Link>
        </div>
      </div>

    </div>
  );
}
