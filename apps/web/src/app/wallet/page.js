'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownRight, ArrowUpRight, Plus, RefreshCcw, Landmark, ShieldCheck, History, QrCode } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

import { API_URL } from '@/lib/api';

const DEMO_TRANSACTIONS = [
  { title: 'FreshMart Supermarket', category: 'Shopping', amount: -450, type: 'debit', date: 'Today, 10:30 AM', icon: '🛒' },
  { title: 'Wallet Top Up', category: 'Deposit', amount: 2000, type: 'credit', date: 'Yesterday, 06:15 PM', icon: '🏦' },
  { title: 'Electricity Bill', category: 'Utility', amount: -1250, type: 'debit', date: '14 Aug 2026, 09:00 AM', icon: '⚡' },
  { title: 'Refund: Cancelled Order', category: 'Refund', amount: 320, type: 'credit', date: '12 Aug 2026, 02:45 PM', icon: '🔄' },
  { title: 'Glow Salon', category: 'Service', amount: -600, type: 'debit', date: '10 Aug 2026, 11:20 AM', icon: '✂️' },
];

export default function WalletPage() {
  const [activeTab, setActiveTab] = useState('history');
  const [balance, setBalance] = useState(4250);
  const [coins, setCoins] = useState(1450);
  const [transactions, setTransactions] = useState(DEMO_TRANSACTIONS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
    const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

    // Fetch wallet balance
    fetch(`${API_URL}/api/v1/wallet/balance`, { headers })
      .then(r => r.json())
      .then(data => {
        if (data.balance !== undefined) setBalance(data.balance);
        if (data.coins !== undefined) setCoins(data.coins);
      })
      .catch(() => {}); // Keep demo data on failure

    // Fetch transactions
    fetch(`${API_URL}/api/v1/wallet/transactions`, { headers })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setTransactions(data.map(tx => ({
            title: tx.description || tx.title || 'Transaction',
            category: tx.category || tx.type || 'General',
            amount: tx.amount,
            type: tx.amount >= 0 ? 'credit' : 'debit',
            date: tx.created_at ? new Date(tx.created_at).toLocaleString() : 'Recently',
            icon: tx.amount >= 0 ? '🏦' : '🛒',
          })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-12 lg:py-16">
        <div className="container max-w-5xl">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Column: Wallet Cards */}
            <div className="w-full lg:w-96 shrink-0 space-y-6">
                
                {/* Main Cash Balance Card */}
                <div className="glass-card rounded-[2rem] p-8 border-none bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div className="flex items-center gap-2 text-white/80 font-bold tracking-widest uppercase text-sm">
                            <Wallet className="w-5 h-5" /> Cash Wallet
                        </div>
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Active</Badge>
                    </div>

                    <div className="relative z-10 mb-8">
                        <h2 className="text-5xl font-black mb-1 tracking-tight">₹{balance.toLocaleString()}<span className="text-2xl text-white/50">.00</span></h2>
                        <p className="text-sm text-white/60">Available Balance</p>
                    </div>

                    <div className="flex gap-3 relative z-10">
                        <Button className="flex-1 bg-white text-slate-900 hover:bg-slate-100 border-none rounded-xl font-bold py-6">
                            <Plus className="w-5 h-5 mr-2" /> Top Up
                        </Button>
                        <Button variant="outline" className="flex-1 border-white/20 text-white hover:bg-white/10 rounded-xl font-bold py-6">
                            <QrCode className="w-5 h-5 mr-2" /> Pay
                        </Button>
                    </div>
                </div>

                {/* Local Coins Card */}
                <div className="glass-card rounded-[2rem] p-6 border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-orange-500/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-amber-600 flex items-center gap-2">
                            <span className="text-2xl">🪙</span> SamparkCoins
                        </h3>
                    </div>
                    <div className="flex items-end gap-3 mb-2">
                        <h4 className="text-3xl font-black text-text">{coins.toLocaleString()}</h4>
                        <span className="text-sm text-text-muted font-bold mb-1">SC</span>
                    </div>
                    <p className="text-xs text-text-muted mb-4 border-b border-border pb-4">Use coins to claim rewards and discounts.</p>
                    <a href="/rewards" className="text-sm font-bold text-amber-600 hover:text-amber-700 flex items-center justify-between group">
                        Redeem Rewards 
                        <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    </a>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="glass-card p-4 rounded-2xl border border-border text-center hover:border-primary/50 transition-colors group">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2 text-primary group-hover:scale-110 transition-transform">
                            <Landmark className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold">Bank Transfer</span>
                    </button>
                    <button className="glass-card p-4 rounded-2xl border border-border text-center hover:border-emerald-500/50 transition-colors group">
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-2 text-emerald-600 group-hover:scale-110 transition-transform">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-bold">Pay Bills</span>
                    </button>
                </div>

            </div>

            {/* Right Column: Transactions */}
            <div className="flex-1">
                <div className="glass-card p-8 rounded-[2rem] border border-border bg-background shadow-sm h-full">
                    
                    <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-black flex items-center gap-2">
                            <History className="w-5 h-5 text-primary" /> Recent Transactions
                        </h3>
                        <Button variant="outline" size="sm" className="rounded-full text-xs h-8 px-4" icon={Filter}>Filter</Button>
                    </div>

                    <div className="space-y-4">
                        {/* Transaction List */}
                        {transactions.map((tx, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-transparent hover:border-border hover:bg-background-alt transition-all cursor-pointer">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-section-alt flex items-center justify-center text-xl shrink-0 border border-border">
                                        {tx.icon}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-text mb-0.5">{tx.title}</h4>
                                        <div className="flex items-center gap-2 text-xs text-text-muted">
                                            <span>{tx.date}</span>
                                            <span className="w-1 h-1 rounded-full bg-border"></span>
                                            <span>{tx.category}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-black text-lg ${tx.type === 'credit' ? 'text-emerald-500' : 'text-text'}`}>
                                        {tx.type === 'credit' ? '+' : '-'}₹{Math.abs(tx.amount)}
                                    </div>
                                    <div className="text-xs text-text-muted font-bold uppercase tracking-wider mt-0.5">
                                        {tx.type === 'credit' ? 'Credit' : 'Debit'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 text-center">
                        <Button variant="outline" className="rounded-xl font-bold" icon={RefreshCcw}>Load More</Button>
                    </div>

                </div>
            </div>

          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Dummy icon to fix unimported reference
function Filter(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
  )
}
