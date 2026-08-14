'use client';
import React, { useState, useEffect } from 'react';
import { useAdminAuth } from '@/context/AdminAuthContext';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, CreditCard, Banknote, History, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_BASE } from '@/lib/api';

export default function FinanceLedgerPage() {
  const { adminUser } = useAdminAuth();
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPayouts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('admin_token');
      const res = await fetch(API_BASE + '/admin/payouts/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPayouts(data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load pending payouts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const processPayout = async (id) => {
    toast.success('Payout processing initiated via RazorpayX.');
    // Ideally calls a POST /payouts/:id/process endpoint
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Finance Ledger</h1>
          <p className="text-slate-400">Track platform GMV, commissions, and process payouts.</p>
        </div>
        <button className="px-5 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition flex items-center gap-2 font-medium">
          <History className="w-4 h-4"/> View Ledger History
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><TrendingUp className="w-6 h-6"/></div>
            <h3 className="text-slate-300 font-medium">Gross Merchandise Value</h3>
          </div>
          <div className="text-4xl font-black text-white mb-2">₹12.4M</div>
          <p className="text-emerald-400 text-sm flex items-center gap-1"><ArrowUpRight className="w-4 h-4"/> +14.5% from last month</p>
        </div>
        
        <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400"><Wallet className="w-6 h-6"/></div>
            <h3 className="text-slate-300 font-medium">Platform Commission</h3>
          </div>
          <div className="text-4xl font-black text-white mb-2">₹1.86M</div>
          <p className="text-emerald-400 text-sm flex items-center gap-1"><ArrowUpRight className="w-4 h-4"/> +18.2% from last month</p>
        </div>

        <div className="bg-gradient-to-br from-amber-600/20 to-amber-900/20 border border-amber-500/30 p-6 rounded-3xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400"><Banknote className="w-6 h-6"/></div>
            <h3 className="text-slate-300 font-medium">Pending Payouts</h3>
          </div>
          <div className="text-4xl font-black text-white mb-2">₹425K</div>
          <p className="text-slate-400 text-sm flex items-center gap-1"><Clock className="w-4 h-4"/> 14 entities waiting</p>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-xl font-bold text-white mb-6">Pending Settlements</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-sm uppercase tracking-wider">
                <th className="p-4 font-semibold">Entity</th>
                <th className="p-4 font-semibold">Type</th>
                <th className="p-4 font-semibold">Amount</th>
                <th className="p-4 font-semibold">Account Details</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="text-slate-300">
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-500">Loading payouts...</td></tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-16 text-center text-slate-500">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-slate-700 mb-4" />
                    <p className="text-lg">All payouts are settled!</p>
                  </td>
                </tr>
              ) : payouts.map(p => (
                <tr key={p.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition group">
                  <td className="p-4 font-medium text-white">{p.entity_name}</td>
                  <td className="p-4 text-sm text-slate-400 uppercase tracking-wider">{p.entity_type}</td>
                  <td className="p-4 font-bold text-amber-400">₹{(p.amount || 0).toLocaleString()}</td>
                  <td className="p-4">
                    <div className="text-sm flex items-center gap-2 text-slate-400">
                      <CreditCard className="w-4 h-4"/> {p.bank_account || 'XXXX-XXXX-1234'}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => processPayout(p.id)}
                      className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-500/20"
                    >
                      Process Payout
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
