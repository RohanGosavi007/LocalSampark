'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Users, BarChart3, TrendingUp, Phone, Mail, Calendar, MessageSquare, Plus, Bell, Target, ArrowRight } from 'lucide-react';
import { API_URL } from '@/lib/api';

const CUSTOMERS = [
  { id: 1, name: 'Anil Deshmukh', type: 'High Value', status: 'Active', lastContact: '2 days ago', ltv: '₹45,000' },
  { id: 2, name: 'Priya Sharma', type: 'New', status: 'Pending Follow-up', lastContact: '5 hours ago', ltv: '₹2,500' },
  { id: 3, name: 'Rahul Verma', type: 'At Risk', status: 'Inactive', lastContact: '45 days ago', ltv: '₹12,000' },
];

export default function CRMPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchCustomers = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/v1/crm/leads`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        const items = data.data || data.rows || (Array.isArray(data) ? data : []);
        if (items.length > 0) {
          setCustomers(items);
        } else {
          setCustomers(CUSTOMERS);
        }
      } catch (e) {
        console.error('CRM API failed, using mock data:', e);
        setCustomers(CUSTOMERS);
      }
      setLoading(false);
    };
    fetchCustomers();
  }, []);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <section className="relative overflow-hidden py-12 px-4 border-b border-border">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-text mb-2">Shop <span className="text-blue-500">CRM</span></h1>
              <p className="text-text-muted">Manage your customers, track engagement, and boost sales.</p>
            </div>
            <div className="flex gap-3">
              <button className="p-3 bg-card-bg rounded-xl text-text-muted hover:bg-slate-700 transition">
                <Bell className="w-5 h-5" />
              </button>
              <button className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-500 transition flex items-center gap-2">
                <Plus className="w-5 h-5" /> Add Customer
              </button>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full lg:w-64 space-y-2">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
              { id: 'customers', label: 'Customers', icon: Users },
              { id: 'campaigns', label: 'Campaigns', icon: Target },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              { id: 'tasks', label: 'Tasks', icon: Calendar },
            ].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${activeTab === tab.id ? 'bg-blue-600/10 text-blue-500 border border-blue-500/20' : 'text-text-muted hover:bg-card-bg hover:text-text'}`}>
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {activeTab === 'dashboard' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { label: 'Total Customers', value: '1,248', trend: '+12%', color: 'text-blue-500' },
                    { label: 'Active (30d)', value: '456', trend: '+5%', color: 'text-emerald-500' },
                    { label: 'Avg Order Value', value: '₹1,250', trend: '+8%', color: 'text-amber-500' },
                    { label: 'Retention Rate', value: '68%', trend: '-2%', color: 'text-red-500' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-card-bg border border-border p-6 rounded-2xl">
                      <p className="text-text-muted text-sm mb-2">{stat.label}</p>
                      <div className="flex justify-between items-end">
                        <span className="text-3xl font-black text-text">{stat.value}</span>
                        <span className={`text-sm font-bold ${stat.color}`}>{stat.trend}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Customer List */}
                  <div className="lg:col-span-2 bg-card-bg border border-border rounded-2xl p-6">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-text">Recent Activity</h3>
                      <button className="text-blue-500 hover:text-blue-400 text-sm font-bold flex items-center gap-1">
                        View All <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="space-y-4">
                      {customers.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-4 bg-background-alt rounded-xl border border-border hover:border-blue-500/30 transition">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-500 font-bold">
                              {c.name[0]}
                            </div>
                            <div>
                              <p className="text-text font-bold">{c.name}</p>
                              <div className="flex gap-2 text-xs">
                                <span className={`px-2 py-0.5 rounded-full ${c.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : c.status === 'Inactive' ? 'bg-red-500/10 text-red-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                  {c.status}
                                </span>
                                <span className="text-text-muted">{c.lastContact}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button className="p-2 rounded-lg bg-card-bg text-text-muted hover:text-text hover:bg-slate-700 transition"><Phone className="w-4 h-4" /></button>
                            <button className="p-2 rounded-lg bg-card-bg text-text-muted hover:text-text hover:bg-slate-700 transition"><Mail className="w-4 h-4" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tasks */}
                  <div className="bg-card-bg border border-border rounded-2xl p-6">
                    <h3 className="text-xl font-bold text-text mb-6">Today's Tasks</h3>
                    <div className="space-y-4">
                      {[
                        { title: 'Follow up with Priya', time: '10:00 AM' },
                        { title: 'Send Festival Offers', time: '02:00 PM' },
                        { title: 'Call Inactive Customers', time: '04:30 PM' },
                      ].map((t, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="mt-1"><div className="w-4 h-4 rounded-full border-2 border-slate-600"></div></div>
                          <div>
                            <p className="text-text text-sm font-medium">{t.title}</p>
                            <p className="text-text-muted text-xs">{t.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab !== 'dashboard' && (
              <div className="bg-card-bg border border-border rounded-2xl p-16 text-center">
                <h2 className="text-2xl font-bold text-text mb-2">{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Module</h2>
                <p className="text-text-muted">Detailed implementation for this module is in progress.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
