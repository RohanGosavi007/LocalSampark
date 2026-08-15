'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import { Activity, Server, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

export default function SystemHealthDashboard() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // Mock incoming system logs
    const interval = setInterval(() => {
      const types = ['INFO', 'WARN', 'ERROR'];
      const messages = [
        'WebSocket connection established (ID: a3f8)',
        'Database query execution time: 45ms',
        'Redis cache miss on key: shop_123',
        'Failed to dispatch FCM Push Notification',
        'FTS5 Search Indexed 14 new products'
      ];
      
      const type = types[Math.floor(Math.random() * types.length)];
      const msg = messages[Math.floor(Math.random() * messages.length)];
      
      setLogs(prev => [{
        id: Date.now(),
        timestamp: new Date().toISOString().split('T')[1].split('.')[0],
        type,
        message: msg
      }, ...prev].slice(0, 50));
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const metrics = [
    { label: 'System Status', value: 'Operational', icon: CheckCircle, color: 'text-green-500' },
    { label: 'Active WebSockets', value: '1,248', icon: Zap, color: 'text-yellow-500' },
    { label: 'API Latency', value: '42ms', icon: Clock, color: 'text-blue-500' },
    { label: 'Error Rate (1h)', value: '0.04%', icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />

      <div className="max-w-7xl mx-auto p-6 pt-24">

        <div className="flex items-center gap-3 mb-8">
          <Server className="text-blue-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-text">System Health & DevOps</h1>
            <p className="text-text-muted mt-1 font-medium">Real-time infrastructure monitoring and event logs.</p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {metrics.map(metric => (
            <div key={metric.label} className="bg-card-bg border border-border rounded-2xl p-6 flex items-center justify-between shadow-lg">
              <div>
                <p className="text-text-muted text-sm font-bold uppercase tracking-wider mb-1">{metric.label}</p>
                <h3 className={`text-2xl font-black ${metric.color}`}>{metric.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-background border border-border ${metric.color}`}>
                <metric.icon size={24} />
              </div>
            </div>
          ))}
        </div>

        {/* Live Logs Terminal */}
        <div className="bg-card-bg border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="bg-background px-6 py-4 border-b border-border flex justify-between items-center">
            <h2 className="font-bold flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Live Event Stream
            </h2>
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
              <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 bg-[#0d1117]">
            {logs.length === 0 ? (
              <p className="text-slate-600">Waiting for incoming logs...</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="flex gap-4 hover:bg-white/5 px-2 py-1 -mx-2 rounded transition-colors">
                  <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                  <span className={`shrink-0 font-bold w-12 ${
                    log.type === 'INFO' ? 'text-blue-400' :
                    log.type === 'WARN' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {log.type}
                  </span>
                  <span className="text-slate-300 break-all">{log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
