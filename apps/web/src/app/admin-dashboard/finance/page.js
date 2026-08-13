'use client';
import React from 'react';
import Link from 'next/link';
import { Activity, ExternalLink, Settings, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GodModefinance() {
  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1 flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <LayoutDashboard size={28} style={{ color: 'var(--accent)' }} /> God-Mode: Finance
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>Super-Admin overview and configuration for the Finance module.</p>
        </div>
        
        <button className="px-5 py-3 rounded-xl flex items-center gap-2 font-bold opacity-50 cursor-not-allowed" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)', border: '1px solid var(--border-color)' }}>
          Dashboard Pending <Settings size={18} />
        </button>
        
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((_, i) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} 
            className="rounded-2xl p-6 shadow-sm border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
          >
            <div className="h-4 w-24 rounded-full mb-3" style={{ backgroundColor: 'var(--border-color)' }}></div>
            <div className="h-8 w-16 rounded-full" style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}></div>
          </motion.div>
        ))}
      </div>

      <div className="rounded-3xl border overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}>
        <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h3 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Module Status</h3>
        </div>
        <div className="p-6 text-center py-24">
           <Activity size={64} className="mx-auto mb-6 opacity-30 animate-pulse" style={{ color: 'var(--accent)' }} />
           <h4 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-main)' }}>System Awaiting Live Data Sync</h4>
           <p className="text-base max-w-lg mx-auto" style={{ color: 'var(--text-muted)' }}>
             The Finance module is provisioned. Detailed analytics, configurations, and aggregated data will appear here once the live data pipeline is fully synced.
           </p>
        </div>
      </div>
    </div>
  );
}
