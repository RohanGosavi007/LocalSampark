'use client';
import React, { useState } from 'react';
import { Clock, CheckCircle, PackageCheck } from 'lucide-react';

export default function KDSManager({ shopId }) {
  const [orders, setOrders] = useState([
    { id: 'ORD-9021', items: ['2x Amul Butter 500g', '1x Fortune Oil 1L'], timerSec: 120, status: 'PREPARING' },
    { id: 'ORD-9022', items: ['1x Aashirvaad Atta 5kg'], timerSec: 90, status: 'PREPARING' }
  ]);

  const markReady = (orderId) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'PACKED' } : o));
  };

  return (
    <div className="p-6 bg-slate-900 min-h-screen text-white rounded-3xl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="text-emerald-400" /> Store Quick-Pack KDS (Target: 120s)
        </h2>
        <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-bold">
          Auto-Accept Active
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orders.map((ord) => (
          <div key={ord.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl">
            <div className="flex justify-between items-center mb-3">
              <span className="font-bold text-lg text-amber-400">{ord.id}</span>
              <span className="bg-amber-500/20 text-amber-300 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3 h-3" /> {ord.timerSec}s left
              </span>
            </div>
            <ul className="space-y-1 mb-4 text-sm text-slate-300">
              {ord.items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span> {it}
                </li>
              ))}
            </ul>
            {ord.status === 'PREPARING' ? (
              <button 
                onClick={() => markReady(ord.id)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl transition flex justify-center items-center gap-2 text-sm"
              >
                <PackageCheck className="w-4 h-4" /> Mark Order Packed
              </button>
            ) : (
              <div className="w-full bg-slate-700 text-slate-400 text-center py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" /> Ready for Driver Pickup
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
