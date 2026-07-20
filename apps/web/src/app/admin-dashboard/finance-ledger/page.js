'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { IndianRupee, TrendingUp, TrendingDown, Calendar, Activity, ShieldCheck, Download, Wallet, CreditCard } from 'lucide-react';
import Link from 'next/link';

export default function AdminRevenueDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    // Mock fetch revenue data
    setTimeout(() => {
      setMetrics({
        totalRevenue: 2450000,
        platformFees: 125000,
        franchisePayouts: 85000,
        netProfit: 40000,
        monthlyGrowth: 15.4,
        activeSubscriptions: 420,
        totalOrders: 12450,
      });
      setLoading(false);
    }, 1000);
  }, []);

  return (
    <>
      <main className="min-h-screen bg-slate-950 pt-20 pb-16 flex">
        <div className="p-6 lg:p-10 w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-slate-800 pb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Revenue & Commissions</h1>
              <p className="text-slate-400">Track platform gross volume, commissions, and franchise payouts.</p>
            </div>
            <button className="px-6 py-2.5 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition flex items-center gap-2 border border-slate-700">
              <Download className="w-4 h-4" /> Export Report
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-900 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Top KPI Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><IndianRupee className="w-24 h-24" /></div>
                  <p className="text-slate-400 text-sm font-medium mb-1">Gross Order Volume (GMV)</p>
                  <h3 className="text-3xl font-black text-white mb-2">₹{(metrics.totalRevenue / 100000).toFixed(2)}L</h3>
                  <span className="text-emerald-400 text-sm font-bold flex items-center gap-1"><TrendingUp className="w-4 h-4" /> {metrics.monthlyGrowth}% this month</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-24 h-24 text-blue-500" /></div>
                  <p className="text-slate-400 text-sm font-medium mb-1">Platform Fees Collected</p>
                  <h3 className="text-3xl font-black text-blue-400 mb-2">₹{metrics.platformFees.toLocaleString()}</h3>
                  <span className="text-blue-500/80 text-sm font-medium">From delivery & service fees</span>
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><CreditCard className="w-24 h-24 text-amber-500" /></div>
                  <p className="text-slate-400 text-sm font-medium mb-1">Franchise Payouts</p>
                  <h3 className="text-3xl font-black text-amber-400 mb-2">₹{metrics.franchisePayouts.toLocaleString()}</h3>
                  <span className="text-amber-500/80 text-sm font-medium">Pending settlement: ₹12,000</span>
                </div>

                <div className="bg-gradient-to-br from-emerald-600 to-teal-600 rounded-3xl p-6 relative overflow-hidden shadow-lg shadow-emerald-600/20">
                  <p className="text-emerald-100 text-sm font-medium mb-1">Net Platform Profit</p>
                  <h3 className="text-3xl font-black text-white mb-2">₹{metrics.netProfit.toLocaleString()}</h3>
                  <span className="text-emerald-100 text-sm font-bold flex items-center gap-1">After all payouts</span>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white">Recent Payout Settlements</h3>
                  <button className="text-emerald-500 hover:text-emerald-400 text-sm font-bold">View All</button>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="pb-3 text-slate-400 font-medium text-sm">Date</th>
                        <th className="pb-3 text-slate-400 font-medium text-sm">Recipient</th>
                        <th className="pb-3 text-slate-400 font-medium text-sm">Type</th>
                        <th className="pb-3 text-slate-400 font-medium text-sm">Amount</th>
                        <th className="pb-3 text-slate-400 font-medium text-sm">Status</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      {[
                        { date: '15 Aug 2026', to: 'Viman Nagar Franchise', type: 'Commission Share', amount: '₹12,450', status: 'Settled' },
                        { date: '14 Aug 2026', to: 'Kalyani Nagar Franchise', type: 'Commission Share', amount: '₹8,900', status: 'Processing' },
                        { date: '12 Aug 2026', to: 'Shop ID: 8943', type: 'Order Remittance', amount: '₹45,200', status: 'Settled' },
                        { date: '10 Aug 2026', to: 'Delivery Partner ID: 442', type: 'Weekly Earnings', amount: '₹6,100', status: 'Settled' },
                      ].map((row, i) => (
                        <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition">
                          <td className="py-4 text-slate-300">{row.date}</td>
                          <td className="py-4 font-bold text-white">{row.to}</td>
                          <td className="py-4 text-slate-400">{row.type}</td>
                          <td className="py-4 font-bold text-emerald-400">{row.amount}</td>
                          <td className="py-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'Settled' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
