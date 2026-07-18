'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { LayoutDashboard, Users, Store, Map, TrendingUp, IndianRupee, PieChart, Activity, Building2 } from 'lucide-react';
import Link from 'next/link';
import { API_URL } from '@/lib/api';

export default function FranchiseDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [data, setData] = useState({ totalRevenue: 0, activeShops: 0, franchise: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/v1/franchise/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const json = await res.json();
        if (res.ok) {
          setData(json);
        }
      } catch (e) {
        console.error('Failed to fetch franchise dashboard', e);
      }
      setLoading(false);
    };
    fetchDashboard();
  }, []);

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/franchise-dashboard' },
    { id: 'shops', label: 'Shops Mgmt', icon: Store, href: '/franchise-dashboard/shops' },
    { id: 'users', label: 'Local Users', icon: Users, href: '/franchise-dashboard/users' },
    { id: 'zones', label: 'Zones/Pincodes', icon: Map, href: '/franchise-dashboard/zones' },
    { id: 'revenue', label: 'Revenue', icon: IndianRupee, href: '/franchise-dashboard/revenue' },
  ];

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16 flex">
        {/* Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block fixed h-full z-10 pt-6">
          <div className="px-6 mb-8">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Building2 className="text-purple-500" /> Franchise Panel
            </h2>
            <p className="text-xs text-slate-500 mt-1">{data.franchise?.territory_name || 'Loading Zone...'}</p>
          </div>
          <div className="px-4 space-y-2">
            {navItems.map(item => (
              <Link key={item.id} href={item.href} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === item.id ? 'bg-purple-600/10 text-purple-400 border border-purple-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 md:ml-64 p-6 lg:p-10">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
              <p className="text-slate-400">Welcome back! Here's what's happening in your franchise zone today.</p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[
              { label: 'Total Revenue', value: loading ? '...' : `₹${data.totalRevenue.toLocaleString()}`, trend: '+15%', color: 'text-emerald-500', icon: IndianRupee },
              { label: 'Active Shops', value: loading ? '...' : data.activeShops, trend: '+4', color: 'text-blue-500', icon: Store },
              { label: 'Registered Users', value: '0', trend: 'Live Data', color: 'text-purple-500', icon: Users },
              { label: 'Active Services', value: '0', trend: 'Live Data', color: 'text-amber-500', icon: Activity },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-xl bg-slate-800 ${stat.color}`}>
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-sm font-bold ${stat.color}`}>{stat.trend}</span>
                </div>
                <p className="text-slate-400 text-sm mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-white">{stat.value}</h3>
              </motion.div>
            ))}
          </div>

          {/* Charts Area Placeholder */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 h-96 flex flex-col items-center justify-center">
              <TrendingUp className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-xl font-bold text-slate-300">Revenue Growth Chart</h3>
              <p className="text-slate-500 text-sm">Real-time charts powered by your territory's live order streams.</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-96 flex flex-col items-center justify-center">
              <PieChart className="w-16 h-16 text-slate-700 mb-4" />
              <h3 className="text-xl font-bold text-slate-300">Category Split</h3>
              <p className="text-slate-500 text-sm">Visualizing active shop distribution.</p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
