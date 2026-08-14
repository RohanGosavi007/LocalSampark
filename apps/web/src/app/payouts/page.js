'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, CheckCircle } from 'lucide-react';

export default function PayoutsDashboard() {
  const [activeTab, setActiveTab] = useState('franchise');

  const stats = {
    franchise: [
      { label: 'Total Platform Volume', value: '₹14,50,000', icon: DollarSign, color: '#3b82f6' },
      { label: 'Franchise Commission (2%)', value: '₹29,000', icon: ArrowUpRight, color: '#22c55e' },
      { label: 'Pending Settlement', value: '₹4,500', icon: Clock, color: '#f59e0b' },
    ],
    shop: [
      { label: 'Total Sales', value: '₹45,000', icon: DollarSign, color: '#3b82f6' },
      { label: 'Net Payout (After 2% fee)', value: '₹44,100', icon: ArrowDownRight, color: '#a855f7' },
      { label: 'Cleared to Bank', value: '₹40,000', icon: CheckCircle, color: '#22c55e' },
    ],
    rider: [
      { label: 'Delivery Earnings', value: '₹3,200', icon: DollarSign, color: '#3b82f6' },
      { label: 'Tips', value: '₹450', icon: ArrowUpRight, color: '#22c55e' },
      { label: 'Pending Transfer', value: '₹800', icon: Clock, color: '#f59e0b' },
    ]
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Header />
      <div className="max-w-7xl mx-auto p-6 pt-24">
        
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Financial Ledger</h1>
          <p className="text-slate-400 mt-1">Real-time Razorpay split settlements</p>
        </div>

        {/* Mock Role Selector for Demo Purposes */}
        <div className="flex gap-2 mb-8 bg-slate-900 p-1 rounded-xl w-fit border border-slate-800">
          {['franchise', 'shop', 'rider'].map(role => (
            <button
              key={role}
              onClick={() => setActiveTab(role)}
              className={`px-6 py-2 rounded-lg font-bold capitalize transition-colors ${
                activeTab === role 
                  ? 'bg-blue-600 text-white' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {role} View
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats[activeTab].map(stat => (
            <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-current to-transparent opacity-5 group-hover:opacity-10 rounded-bl-full transition-opacity" style={{ color: stat.color }}></div>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
                <stat.icon size={24} />
              </div>
              <h3 className="text-3xl font-black text-white">{stat.value}</h3>
              <p className="text-slate-400 font-bold mt-1 text-sm">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Ledger Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Recent Transactions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4 rounded-tl-xl">Transaction ID</th>
                  <th className="px-6 py-4">Date & Time</th>
                  <th className="px-6 py-4">Gross Amount</th>
                  <th className="px-6 py-4">Platform Fee (2%)</th>
                  <th className="px-6 py-4">Net Payout</th>
                  <th className="px-6 py-4 rounded-tr-xl">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {[1, 2, 3, 4, 5].map(i => {
                  const amt = Math.floor(Math.random() * 2000) + 500;
                  const fee = Math.floor(amt * 0.02);
                  const net = amt - fee;
                  return (
                    <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 font-mono text-blue-400">TXN-882{i}9A</td>
                      <td className="px-6 py-4">Aug 11, 2026 • 14:30</td>
                      <td className="px-6 py-4 font-bold text-white">₹{amt}</td>
                      <td className="px-6 py-4 text-red-400">-₹{fee}</td>
                      <td className="px-6 py-4 font-bold text-green-400">₹{net}</td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          i % 3 === 0 
                            ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' 
                            : 'bg-green-500/10 text-green-500 border border-green-500/20'
                        }`}>
                          {i % 3 === 0 ? 'Processing' : 'Settled'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
