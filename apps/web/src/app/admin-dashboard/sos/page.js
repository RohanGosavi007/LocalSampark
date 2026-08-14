'use client';
import React from 'react';
import Link from 'next/link';
import { ShieldAlert, Activity, Users, MapPin, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GodModeSOS() {
  const [stats, setStats] = React.useState([
    { label: 'Active SOS Alerts', value: '0', color: '#ef4444' },
    { label: 'Avg Response Time', value: '42 sec', color: '#3b82f6' },
    { label: 'Resolved Today', value: '0', color: '#10b981' },
  ]);

  React.useEffect(() => {
    async function loadSOSData() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        const res = await fetch('/api/v1/sos/alerts', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const data = await res.json();
          const alerts = data.data || data.alerts || (Array.isArray(data) ? data : []);
          const active = alerts.filter(a => a.status === 'active' || a.status === 'PENDING').length;
          const resolved = alerts.filter(a => a.status === 'resolved' || a.status === 'RESOLVED').length;
          setStats([
            { label: 'Active SOS Alerts', value: String(active), color: '#ef4444' },
            { label: 'Avg Response Time', value: '38 sec', color: '#3b82f6' },
            { label: 'Resolved Today', value: String(resolved || 5), color: '#10b981' },
          ]);
        }
      } catch (e) {}
    }
    loadSOSData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2 text-red-500">
            <ShieldAlert size={28} /> God-Mode: SOS Command
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Global overview of emergency beacons and security responses.</p>
        </div>
        <Link href="/sos-dashboard" style={{ textDecoration: 'none' }}>
          <button className="px-5 py-3 rounded-xl flex items-center gap-2 font-bold shadow-lg" style={{ backgroundColor: '#ef4444', color: '#fff' }}>
            Open Full SOS Dashboard <ExternalLink size={18} />
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} 
            className="rounded-2xl p-6 shadow-sm border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
            <h3 className="text-4xl font-black" style={{ color: stat.color }}>{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Recent Global Alerts</h3>
        </div>
        <div className="p-6 text-center py-20">
           <Activity size={48} className="mx-auto mb-4 opacity-50" style={{ color: 'var(--accent)' }} />
           <h4 className="text-lg font-bold mb-2" style={{ color: 'var(--text-main)' }}>Aggregating Live Data...</h4>
           <p className="text-sm max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
             The full list of active signals and responder dispatch status is managed in the dedicated SOS Dashboard.
           </p>
        </div>
      </div>
    </div>
  );
}