'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { Coins, ArrowUpRight, ArrowDownRight, Gift, ShoppingBag, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import DailyStreak from '../../../components/DailyStreak';

export default function LoyaltyWalletPage() {
  const router = useRouter();
  
  const [balance, setBalance] = useState(1250);

  const transactions = [
    { id: 1, type: 'credit', amount: 50, title: 'Cashback from SuperMart', date: 'Today, 2:30 PM', icon: ShoppingBag },
    { id: 2, type: 'debit', amount: 150, title: 'Used on Zomato Delivery', date: 'Yesterday', icon: ArrowDownRight },
    { id: 3, type: 'credit', amount: 500, title: 'Referral Bonus: Rahul', date: 'Aug 10', icon: Gift },
    { id: 4, type: 'credit', amount: 20, title: 'Daily Check-in', date: 'Aug 10', icon: Coins },
  ];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:bg-slate-900">
      <div className="hidden md:block"><Header /></div>
      
      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-slate-950 md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-slate-800 md:shadow-2xl overflow-hidden relative flex flex-col">
        
        {/* App Bar */}
        <div className="bg-slate-900 p-6 border-b border-slate-800 z-10 flex justify-between items-center">
          <button onClick={() => router.back()} className="text-blue-500 font-bold">← Back</button>
          <h1 className="text-lg font-bold text-white">My Wallet</h1>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            R
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Balance Card */}
          <div className="bg-gradient-to-tr from-yellow-600 to-yellow-400 rounded-3xl p-6 mb-8 relative overflow-hidden shadow-[0_0_30px_rgba(234,179,8,0.3)]">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/20 blur-3xl rounded-full"></div>
            <div className="flex items-center gap-2 mb-2 relative z-10">
              <Coins className="text-yellow-100" size={20} />
              <p className="text-yellow-100 font-bold uppercase tracking-wider text-sm">LocalCoins Balance</p>
            </div>
            <h2 className="text-5xl font-black text-white mb-6 relative z-10">{balance} <span className="text-lg text-yellow-200">LC</span></h2>
            
            <div className="flex gap-2 relative z-10">
              <button className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl backdrop-blur-md transition-colors text-sm">
                Redeem
              </button>
              <button className="flex-1 bg-slate-950/20 hover:bg-slate-950/30 text-white font-bold py-3 rounded-xl backdrop-blur-md transition-colors text-sm">
                Earn More
              </button>
            </div>
          </div>

          {/* Daily Streak Gamification */}
          <DailyStreak />

          {/* Missions */}
          <h3 className="text-white font-bold mb-4 px-1">Daily Missions</h3>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-8">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                  <MapPin size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Shop at 3 Local Stores</h4>
                  <p className="text-slate-500 text-xs mt-0.5">Progress: 1/3</p>
                </div>
              </div>
              <span className="text-yellow-500 font-black text-sm">+100 LC</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="w-1/3 h-full bg-blue-500 rounded-full"></div>
            </div>
          </div>

          {/* Transaction History */}
          <h3 className="text-white font-bold mb-4 px-1">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.map(txn => (
              <div key={txn.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${txn.type === 'credit' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    <txn.icon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{txn.title}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{txn.date}</p>
                  </div>
                </div>
                <span className={`font-black ${txn.type === 'credit' ? 'text-green-500' : 'text-slate-300'}`}>
                  {txn.type === 'credit' ? '+' : '-'}{txn.amount}
                </span>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
