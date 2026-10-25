'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../../components/Header';
import { Activity, Server, Zap, AlertTriangle, Clock, Database } from 'lucide-react';
import { adminGet } from '@/lib/api';

const fmt = (v, unit = '') => (v === null || v === undefined ? '—' : `${v}${unit}`);
const LEVEL_COLOR = { INFO: 'text-blue-400', WARN: 'text-yellow-400', ERROR: 'text-red-400' };

// Reads /admin/health: figures measured by the server process (memory, database ping,
// latency and error rate over its recent requests) and the requests that failed or ran
// slow. This page used to invent a log line every three seconds and show a fixed
// "Operational / 1,248 sockets / 42ms / 0.04%".
export default function SystemHealthDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setData(await adminGet('/admin/health'));
      setError(null);
    } catch (e) {
      setError(e.message || 'Could not load system health');
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  const system = data && data.system;
  const logs = (data && data.logs) || [];
  const api = system && system.api;
  const db = system && system.database;
  const dbUp = db && db.pingMs !== null && db.pingMs !== undefined;

  const metrics = [
    { label: 'Database', value: system ? (dbUp ? `Up · ${db.pingMs}ms` : 'Unreachable') : '…', icon: Database, color: dbUp ? 'text-green-500' : 'text-red-500' },
    { label: 'Avg / p95 latency', value: api ? `${fmt(api.avgLatencyMs, 'ms')} / ${fmt(api.p95LatencyMs, 'ms')}` : '…', icon: Clock, color: 'text-blue-500' },
    { label: `Error rate (${api ? api.sampleSize : 0} requests)`, value: api ? fmt(api.errorRatePercent, '%') : '…', icon: AlertTriangle, color: 'text-red-500' },
    { label: 'Memory in use', value: system ? `${system.memory.usagePercent}%` : '…', icon: Zap, color: 'text-yellow-500' },
  ];

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />
      <div className="max-w-7xl mx-auto p-6 pt-24">
        <div className="flex items-center gap-3 mb-8">
          <Server className="text-blue-500" size={32} />
          <div>
            <h1 className="text-3xl font-black text-text">System Health &amp; DevOps</h1>
            <p className="text-text-muted mt-1 font-medium">
              Measured by the API server{system ? `, up ${Math.round(system.processUptime / 60)} min` : ''}. Refreshes every 10 seconds.
            </p>
          </div>
        </div>

        {error && <p role="alert" className="mb-6 text-red-400 font-bold">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric) => (
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

        <div className="bg-card-bg border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[500px]">
          <div className="bg-background px-6 py-4 border-b border-border">
            <h2 className="font-bold flex items-center gap-2">
              <Activity size={18} className="text-blue-500" />
              Failed and slow requests
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-6 font-mono text-sm space-y-2 bg-[#0d1117]">
            {logs.length === 0 ? (
              <p className="text-slate-600">{data ? 'No failed or slow requests recorded.' : 'Loading…'}</p>
            ) : (
              logs.map((log, i) => (
                <div key={`${log.timestamp}-${i}`} className="flex gap-4 px-2 py-1 -mx-2 rounded">
                  <span className="text-slate-500 shrink-0">[{String(log.timestamp).split('T')[1]?.split('.')[0] || log.timestamp}]</span>
                  <span className={`shrink-0 font-bold w-12 ${LEVEL_COLOR[log.level] || 'text-slate-300'}`}>{log.level}</span>
                  <span className="text-slate-300 break-all">{log.route} — {log.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
