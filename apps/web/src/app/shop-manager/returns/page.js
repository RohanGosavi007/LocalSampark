'use client';
import React, { useState } from 'react';
import Header from '../../components/Header';
import { PackageX, CheckCircle, XCircle, AlertTriangle, MessageSquare } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

export default function ShopReturnsDashboard() {
  const { addToast } = useToast();
  
  const [returns, setReturns] = useState([
    {
      id: 'RET-901',
      orderId: 'ORD-298371',
      customer: 'Rahul Sharma',
      item: 'Amul Taaza Milk 1L',
      reason: 'Item is Spoiled / Expired',
      amount: 130,
      status: 'pending',
      time: '10 mins ago',
      image: 'https://via.placeholder.com/400'
    },
    {
      id: 'RET-902',
      orderId: 'ORD-298350',
      customer: 'Priya Patel',
      item: 'Britannia Bread',
      reason: 'Wrong Item Delivered',
      amount: 40,
      status: 'approved',
      time: '2 hours ago',
      image: null
    }
  ]);

  const handleAction = (id, action) => {
    setReturns(returns.map(r => r.id === id ? { ...r, status: action } : r));
    addToast(`Return request ${action} successfully.`);
  };

  return (
    <div className="min-h-screen bg-background font-sans text-text">
      <Header />

      <div className="max-w-5xl mx-auto p-6 pt-24">

        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
            <PackageX className="text-orange-500" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-text">Disputes & Returns</h1>
            <p className="text-text-muted mt-1 font-medium">Review customer refund requests and manage chargebacks.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="lg:col-span-2 space-y-6">
            {returns.map(req => (
              <div key={req.id} className="bg-card-bg border border-border rounded-3xl p-6 overflow-hidden relative">
                
                {req.status === 'approved' && (
                  <div className="absolute top-4 right-4 bg-green-500/20 text-green-500 text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={14} /> Refunded
                  </div>
                )}
                {req.status === 'rejected' && (
                  <div className="absolute top-4 right-4 bg-red-500/20 text-red-500 text-xs font-black uppercase px-3 py-1 rounded-full flex items-center gap-1">
                    <XCircle size={14} /> Rejected
                  </div>
                )}

                <div className="flex justify-between items-start mb-6 border-b border-border pb-4">
                  <div>
                    <h3 className="text-xl font-bold text-text">{req.item}</h3>
                    <p className="text-text-muted text-sm">Order: {req.orderId} • {req.customer}</p>
                  </div>
                  <div className="text-right mt-8 lg:mt-0">
                    <p className="text-orange-500 font-bold text-xl">₹{req.amount}</p>
                    <p className="text-text-muted text-xs">{req.time}</p>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mb-6">
                  {req.image && (
                    <div className="w-full md:w-48 h-48 bg-card-bg rounded-xl overflow-hidden shrink-0 border border-border">
                      <img src={req.image} alt="Proof" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <div>
                    <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex items-start gap-3 mb-4">
                      <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                      <div>
                        <h4 className="font-bold text-red-400 text-sm mb-1">Reason: {req.reason}</h4>
                        <p className="text-slate-300 text-sm">Customer claims the milk packets were bloated and spoiled upon delivery.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {req.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-border">
                    <button 
                      onClick={() => handleAction(req.id, 'approved')}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={18} /> Approve Refund
                    </button>
                    <button 
                      onClick={() => handleAction(req.id, 'rejected')}
                      className="flex-1 bg-slate-800 hover:bg-red-900/50 hover:text-red-500 border border-slate-700 hover:border-red-500/50 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle size={18} /> Reject Claim
                    </button>
                    <button className="bg-blue-900/30 text-blue-500 border border-blue-500/30 hover:bg-blue-900/50 font-bold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <MessageSquare size={18} /> Chat
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card-bg border border-border rounded-3xl p-6">
              <h3 className="font-bold text-text mb-4">Dispute Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-sm">Return Rate (30d)</span>
                  <span className="text-text font-bold">1.2%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-sm">Total Refunded</span>
                  <span className="text-red-400 font-bold">₹1,240</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted text-sm">Pending Actions</span>
                  <span className="text-orange-500 font-bold bg-orange-500/20 px-2 py-0.5 rounded-full">1 Request</span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
