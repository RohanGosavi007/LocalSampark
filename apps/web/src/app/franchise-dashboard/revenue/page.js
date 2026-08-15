'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, IndianRupee, DownloadCloud } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function FranchiseRevenue() {
  const [data, setData] = useState({ totalRevenue: 0, activeShops: 0, earnings: [] });
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex justify-between items-center mb-8 border-b border-border pb-6">
            <div>
              <h1 className="text-3xl font-black text-text mb-2">Revenue Tracking</h1>
              <p className="text-text-muted">Track your daily commissions and payouts.</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-card-bg text-text rounded-xl hover:bg-background-alt transition border border-border">
              <DownloadCloud className="w-4 h-4" /> Export CSV
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-card-bg border border-border rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee className="w-24 h-24 text-emerald-500" /></div>
              <p className="text-text-muted text-sm font-medium mb-1">Total Commission Earned</p>
              <h3 className="text-4xl font-black text-text mb-2">
                {loading ? '...' : `₹${data.totalRevenue.toLocaleString()}`}
              </h3>
              <span className="text-emerald-400 text-sm font-bold flex items-center gap-1"><TrendingUp className="w-3 h-3" /> +12% this week</span>
            </div>

            <div className="bg-card-bg border border-border rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24 text-blue-500" /></div>
              <p className="text-text-muted text-sm font-medium mb-1">Pending Payout</p>
              <h3 className="text-4xl font-black text-text mb-2">
                ₹0
              </h3>
              <span className="text-text-muted text-sm">Next settlement: Every Monday</span>
            </div>

            <div className="bg-card-bg border border-border rounded-3xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><TrendingUp className="w-24 h-24 text-purple-500" /></div>
              <p className="text-text-muted text-sm font-medium mb-1">Active Shops Generating Revenue</p>
              <h3 className="text-4xl font-black text-text mb-2">
                {loading ? '...' : data.activeShops}
              </h3>
              <span className="text-purple-400 text-sm font-bold">in your territory</span>
            </div>
          </div>

          <div className="bg-card-bg border border-border rounded-3xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-text mb-6">Recent Earning Transactions</h3>
            {loading ? (
              <p className="text-text-muted">Loading transactions...</p>
            ) : data.earnings.length === 0 ? (
              <div className="text-center py-10 bg-card-bg/50 rounded-2xl border border-border/50">
                <Wallet className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-text font-bold mb-1">No earnings yet</h4>
                <p className="text-text-muted text-sm">Once orders are placed in your territory, commissions will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-4 px-4 text-text-muted font-medium">Transaction ID</th>
                      <th className="py-4 px-4 text-text-muted font-medium">Date</th>
                      <th className="py-4 px-4 text-text-muted font-medium">Source</th>
                      <th className="py-4 px-4 text-text-muted font-medium text-right">Commission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.earnings.map(e => (
                      <tr key={e.id} className="border-b border-border/50 hover:bg-card-bg/20 transition">
                        <td className="py-4 px-4 text-text font-mono text-sm">{e.id.slice(0,8).toUpperCase()}</td>
                        <td className="py-4 px-4 text-text-muted text-sm">{new Date(e.created_at).toLocaleDateString()}</td>
                        <td className="py-4 px-4 text-text-muted capitalize">{e.source_type}</td>
                        <td className="py-4 px-4 text-emerald-400 font-bold text-right">+₹{e.commission_earned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
