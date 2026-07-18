'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { ShieldCheck, AlertOctagon, CheckCircle, Search, Filter, MessageSquare, Clock } from 'lucide-react';
import Link from 'next/link';
import { API_URL, getAuthHeaders } from '@/lib/api';

export default function AdminDisputesDashboard() {
  const [activeTab, setActiveTab] = useState('open');
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/disputes/admin`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (res.ok) {
          setDisputes(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Failed to fetch disputes', err);
      }
      setLoading(false);
    };
    fetchDisputes();
  }, []);

  const handleResolve = async (id) => {
    const resolution = prompt('Enter resolution details (e.g. Refunded 50%, Shop Warned):');
    if (!resolution) return;

    try {
      const res = await fetch(`${API_URL}/api/v1/disputes/${id}/resolve`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ resolution })
      });
      if (res.ok) {
        setDisputes(disputes.map(d => d.id === id ? { ...d, status: 'resolved', resolution } : d));
      } else {
        alert('Failed to resolve dispute');
      }
    } catch (e) {
      console.error(e);
      alert('Error resolving dispute');
    }
  };

  const filteredDisputes = disputes.filter(d => d.status === activeTab);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16 flex">
        {/* Admin Sidebar */}
        <div className="w-64 bg-slate-900 border-r border-slate-800 hidden md:block fixed h-full z-10 pt-6">
          <div className="px-6 mb-8">
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <ShieldCheck className="text-red-500" /> GOD MODE
            </h2>
            <p className="text-xs text-slate-500 mt-1">Dispute Resolution</p>
          </div>
          <div className="px-4 space-y-2">
            <Link href="/admin-dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-white transition">
              <ShieldCheck className="w-5 h-5" /> <span className="font-medium">Overview</span>
            </Link>
            <Link href="/admin/disputes" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-600/10 text-red-400 border border-red-500/20 transition">
              <AlertOctagon className="w-5 h-5" /> <span className="font-medium">Disputes</span>
            </Link>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 md:ml-64 p-6 lg:p-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Dispute Management</h1>
              <p className="text-slate-400">Handle customer and partner disputes effectively to maintain trust.</p>
            </div>
            
            <div className="flex gap-3">
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" placeholder="Search ID or Name" className="pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white outline-none focus:border-red-500 w-64" />
              </div>
              <button className="p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-slate-300 hover:bg-slate-800 transition">
                <Filter className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><AlertOctagon className="w-24 h-24 text-red-500" /></div>
              <p className="text-slate-400 text-sm font-medium mb-1">Open Disputes</p>
              <h3 className="text-4xl font-black text-white mb-2">{disputes.filter(d => d.status === 'open').length}</h3>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Clock className="w-24 h-24 text-amber-500" /></div>
              <p className="text-slate-400 text-sm font-medium mb-1">Investigating</p>
              <h3 className="text-4xl font-black text-white mb-2">{disputes.filter(d => d.status === 'investigating').length}</h3>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><CheckCircle className="w-24 h-24 text-emerald-500" /></div>
              <p className="text-slate-400 text-sm font-medium mb-1">Resolved (Total)</p>
              <h3 className="text-4xl font-black text-white mb-2">{disputes.filter(d => d.status === 'resolved').length}</h3>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-slate-800 pb-px">
            {['open', 'investigating', 'resolved'].map(t => (
              <button 
                key={t}
                onClick={() => setActiveTab(t)}
                className={`pb-4 px-2 font-bold capitalize transition border-b-2 ${activeTab === t ? 'border-red-500 text-red-400' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
              >
                {t} Disputes
              </button>
            ))}
          </div>

          {/* Dispute List */}
          <div className="space-y-4">
            {loading ? <p className="text-slate-400 py-8">Loading disputes...</p> : filteredDisputes.map((d) => (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={d.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-slate-600 transition">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-white font-bold text-lg">{d.id}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      d.status === 'open' ? 'bg-red-500/10 text-red-400' :
                      d.status === 'investigating' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-emerald-500/10 text-emerald-400'
                    }`}>
                      {d.status.toUpperCase()}
                    </span>
                    <span className="text-slate-500 text-sm flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(d.created_at).toLocaleString()}</span>
                  </div>
                  <h4 className="text-red-400 font-medium mb-4">{d.type} {d.total_amount ? `• ₹${d.total_amount}` : ''}</h4>
                  
                  <div className="flex gap-8 text-sm">
                    <div>
                      <p className="text-slate-500 mb-1">Customer</p>
                      <p className="text-slate-300 font-medium">{d.user_name || d.user_id}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Partner / Shop</p>
                      <p className="text-slate-300 font-medium">{d.shop_name || d.shop_id}</p>
                    </div>
                    <div>
                      <p className="text-slate-500 mb-1">Order Ref</p>
                      <p className="text-blue-400 font-medium hover:underline cursor-pointer">{d.order_id}</p>
                    </div>
                  </div>
                  {d.description && <p className="mt-4 text-slate-400 italic">"{d.description}"</p>}
                </div>

                <div className="flex flex-col gap-2 min-w-[200px]">
                  {d.status === 'resolved' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                      <p className="text-emerald-500 text-xs font-bold mb-1">Resolution</p>
                      <p className="text-emerald-400 text-sm">{d.resolution}</p>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => handleResolve(d.id)} className="w-full py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition shadow-lg shadow-red-500/20">
                        Resolve & Refund
                      </button>
                      <button className="w-full py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition flex items-center justify-center gap-2 border border-slate-700">
                        <MessageSquare className="w-4 h-4" /> Message Parties
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
            
            {!loading && filteredDisputes.length === 0 && (
              <div className="text-center py-12 bg-slate-900 border border-slate-800 rounded-3xl">
                <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h3 className="text-xl text-white font-bold mb-2">All Caught Up!</h3>
                <p className="text-slate-400">No {activeTab} disputes at the moment.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
