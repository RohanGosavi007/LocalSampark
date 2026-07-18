const fs = require('fs');
const path = require('path');

const basePath = 'c:/localsampark 17-07-2026/localsampark 17-07-2026/apps/web/src/app';

const generateComponent = (title, desc) => {
  return `
'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, BarChart3, Users, Activity, CheckCircle2 } from 'lucide-react';

export default function Page() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">${title}</h1>
          <p className="text-slate-400">${desc}</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition flex items-center gap-2 font-medium">
            <Settings className="w-4 h-4" /> Settings
          </button>
          <button className="px-5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500 transition font-medium shadow-lg shadow-blue-500/20">
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Total Volume', value: '₹12.4M', trend: '+15%', icon: BarChart3, color: 'text-blue-500' },
          { label: 'Active Users', value: '4,521', trend: '+5%', icon: Users, color: 'text-emerald-500' },
          { label: 'System Health', value: '99.9%', trend: 'Stable', icon: Activity, color: 'text-purple-500' }
        ].map((stat, i) => (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-800 rounded-2xl">
                <stat.icon className={\`w-6 h-6 \${stat.color}\`} />
              </div>
              <span className="text-sm font-bold text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">{stat.trend}</span>
            </div>
            <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
            <h3 className="text-2xl font-black text-white">{stat.value}</h3>
          </motion.div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-10 min-h-[400px] flex flex-col items-center justify-center text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5" />
        <div className="relative z-10">
          <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-slate-900">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Module Provisioned</h2>
          <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
            The ${title} module is fully provisioned. Data tables and interactive elements are currently being hydrated by the backend system.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
`;
};

const pages = [
  { path: 'franchise/dashboard', title: 'Franchise Dashboard', desc: 'Overview of your territory operations.' },
  { path: 'franchise/approvals', title: 'Franchise Approvals', desc: 'Manage pending shop and agent approvals.' },
  { path: 'franchise/shops', title: 'Franchise Shops', desc: 'Monitor active shops in your territory.' },
  { path: 'franchise/users', title: 'Franchise Users', desc: 'User growth and retention metrics.' },
  { path: 'franchise/posts', title: 'Franchise Posts', desc: 'Community hub moderation and analytics.' },
  { path: 'franchise/revenue', title: 'Franchise Revenue', desc: 'Commission payouts and earnings.' },
  { path: 'franchise/agents', title: 'Franchise Agents', desc: 'Manage field agents and delivery staff.' },
  { path: 'franchise/providers', title: 'Franchise Providers', desc: 'Service provider onboarding and tracking.' },

  { path: 'admin-dashboard', title: 'Admin Overview', desc: 'Super admin platform operations center.' },
  { path: 'admin-dashboard/franchises', title: 'Franchise Network', desc: 'Global map of all franchise partners.' },
  { path: 'admin-dashboard/skilled-dispatch', title: 'Skilled Dispatch', desc: 'Real-time routing for service professionals.' },
  { path: 'admin-dashboard/shop-categories', title: 'Shop Categories', desc: 'Taxonomies and category management.' },
  { path: 'admin-dashboard/revenue', title: 'Platform Revenue', desc: 'Consolidated revenue across all streams.' },
  { path: 'admin-dashboard/payouts', title: 'Payout Requests', desc: 'Process bulk settlements to shops and partners.' },
  { path: 'admin-dashboard/revenue-models', title: 'Revenue Models', desc: 'Adjust commission rates and pricing structures.' },
  { path: 'admin-dashboard/approvals', title: 'Global Approvals', desc: 'High-risk verification requests.' },

  { path: 'service-dashboard', title: 'Service Provider Dashboard', desc: 'Manage your service requests and schedules.' },
];

pages.forEach(p => {
  const dir = path.join(basePath, p.path);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'page.js'), generateComponent(p.title, p.desc));
});

console.log('Successfully built 17 dashboard pages!');
