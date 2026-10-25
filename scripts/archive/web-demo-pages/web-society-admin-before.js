'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import { Users, FileText, Wallet, Settings, Bell, Search, Filter, Download } from 'lucide-react';
import SocietyDataExport from './components/SocietyDataExport';

export default function SocietyAdminDashboard() {
  const [activeTab, setActiveTab] = useState('members');

  const stats = [
    { label: 'Total Flats', value: '1,200', icon: Users, color: '#3b82f6' },
    { label: 'Pending Dues', value: '₹4.2L', icon: Wallet, color: '#ef4444' },
    { label: 'Open Tickets', value: '14', icon: FileText, color: '#f59e0b' },
    { label: 'Active Guards', value: '8', icon: Bell, color: '#22c55e' }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-7xl mx-auto p-6 pt-24 flex gap-8">
        
        {/* Sidebar */}
        <aside className="w-64 shrink-0 hidden md:block">
          <div className="bg-background border border-border rounded-2xl p-4 sticky top-28">
            <h2 className="text-text-muted text-xs font-bold uppercase tracking-wider mb-4 px-4">Admin Console</h2>
            <nav className="space-y-2">
              {[
                { id: 'members', label: 'Directory', icon: Users },
                { id: 'finance', label: 'Finance & Dues', icon: Wallet },
                { id: 'tickets', label: 'Maintenance', icon: FileText },
                { id: 'exports', label: 'Data Exports', icon: Download },
                { id: 'settings', label: 'Society Settings', icon: Settings }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-colors ${
                    activeTab === item.id 
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                      : 'text-text-muted hover:bg-card-bg hover:text-slate-200'
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-text">Society Admin</h1>
              <p className="text-text-muted mt-1">Manage Green Valley Apartments</p>
            </div>
            <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
              + Generate Dues
            </button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {stats.map(stat => (
              <div key={stat.label} className="bg-background border border-border p-6 rounded-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-current to-transparent opacity-5 group-hover:opacity-10 rounded-bl-full transition-opacity" style={{ color: stat.color }}></div>
                <stat.icon size={24} style={{ color: stat.color }} className="mb-4" />
                <h3 className="text-3xl font-bold text-text">{stat.value}</h3>
                <p className="text-text-muted text-sm font-bold mt-1">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Data Table Area */}
          {activeTab === 'exports' ? <SocietyDataExport /> : (
          <div className="bg-background border border-border rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text capitalize">{activeTab} Management</h2>
              <div className="flex gap-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                  <input type="text" placeholder="Search..." className="bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-text outline-none focus:border-blue-500" />
                </div>
                <button className="bg-card-bg hover:bg-slate-700 text-text-muted p-2 rounded-lg border border-border">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-card-bg/50 text-text-muted text-xs uppercase font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Flat No</th>
                    <th className="px-6 py-4">Resident Name</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text-muted">
                  {[1, 2, 3, 4, 5].map(i => (
                    <tr key={i} className="hover:bg-card-bg/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-text">A-{400 + i}</td>
                      <td className="px-6 py-4">Rahul Sharma</td>
                      <td className="px-6 py-4">Owner</td>
                      <td className="px-6 py-4">
                        <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold">Clear</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-400 hover:text-blue-300 font-bold">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          )}

        </main>
      </div>
    </div>
  );
}
