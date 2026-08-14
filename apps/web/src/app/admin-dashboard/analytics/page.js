'use client';
import React, { useState, useEffect } from 'react';
import { Activity, Users, DollarSign, Clock, TrendingUp, TrendingDown, Map, ArrowUpRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function AnalyticsDashboard() {
  const [duration, setDuration] = useState('week'); // 'day', 'week', 'month'
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin_token');
      const res = await fetch(`${API_BASE}/admin/analytics/overview?duration=${duration}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [duration]);

  if (loading && !data) {
    return <div className="text-center py-20 text-slate-500">Loading Global Analytics...</div>;
  }

  const { metrics, chartData } = data || {};

  // Find max values for simple inline CSS charts
  const maxRevenue = chartData ? Math.max(...chartData.map(d => d.revenue)) : 1;
  const maxUsers = chartData ? Math.max(...chartData.map(d => d.users)) : 1;

  return (
    <div className="max-w-7xl mx-auto pb-12 space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Activity className="text-purple-500" /> Platform Analytics
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Macro-level health, revenue, and user engagement metrics across all regions.</p>
        </div>
        
        <div className="bg-slate-900 border rounded-xl p-1 flex shadow-lg" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--bg-card)' }}>
          {['day', 'week', 'month'].map(opt => (
            <button 
              key={opt}
              onClick={() => setDuration(opt)}
              className={`px-6 py-2 text-sm font-bold rounded-lg capitalize transition-all ${duration === opt ? 'bg-purple-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Top Level Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Total Users</h3>
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-500"/>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              {(metrics?.totalUsers ?? 0).toLocaleString()}
            </div>
            <div className="text-sm text-emerald-400 font-bold flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4"/> +14.2% this {duration}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Financial Vol.</h3>
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-purple-500"/>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              ₹{(metrics?.financialVolume ?? 0).toLocaleString()}
            </div>
            <div className="text-sm text-emerald-400 font-bold flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4"/> +8.7% this {duration}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Active Merchants</h3>
            <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Map className="w-5 h-5 text-orange-500"/>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              {(metrics?.activeMerchants ?? 0).toLocaleString()}
            </div>
            <div className="text-sm text-rose-400 font-bold flex items-center gap-1 mt-2">
              <TrendingDown className="w-4 h-4"/> -1.2% this {duration}
            </div>
          </div>
        </div>

        <div className="p-6 rounded-3xl border shadow-xl flex flex-col justify-between relative overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl"></div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Avg. SLA Time</h3>
            <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-sky-500"/>
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-white">
              {metrics?.slaTime || '24 mins'}
            </div>
            <div className="text-sm text-emerald-400 font-bold flex items-center gap-1 mt-2">
              <TrendingUp className="w-4 h-4"/> Improved by 12%
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Revenue Chart */}
        <div className="p-8 rounded-3xl border shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <ArrowUpRight className="text-emerald-500" /> Revenue Growth
              </h2>
              <p className="text-sm text-slate-400">Total volume processed across all verticals</p>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 relative">
            {loading && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10 rounded-xl">Loading...</div>}
            {chartData?.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div 
                  className="w-full bg-emerald-500/20 hover:bg-emerald-500/40 rounded-t-lg transition-all relative"
                  style={{ height: `${Math.max((d.revenue / maxRevenue) * 100, 5)}%` }}
                >
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition shadow-xl pointer-events-none whitespace-nowrap z-20">
                    ₹{d.revenue.toLocaleString()}
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-2 truncate w-full text-center">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* User Activity Chart */}
        <div className="p-8 rounded-3xl border shadow-xl" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
                <Activity className="text-blue-500" /> Active Users
              </h2>
              <p className="text-sm text-slate-400">Unique active sessions across the platform</p>
            </div>
          </div>
          
          <div className="h-64 flex items-end justify-between gap-2 relative">
             {loading && <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center z-10 rounded-xl">Loading...</div>}
            {chartData?.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                <div 
                  className="w-full bg-blue-500/20 hover:bg-blue-500/40 rounded-t-lg transition-all relative"
                  style={{ height: `${Math.max((d.users / maxUsers) * 100, 5)}%` }}
                >
                  <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition shadow-xl pointer-events-none whitespace-nowrap z-20">
                    {d.users.toLocaleString()} Users
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-mono mt-2 truncate w-full text-center">{d.label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
