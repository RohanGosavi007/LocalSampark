'use client';
import React from 'react';
import { Truck, CheckCircle2, Clock, Package, RefreshCw } from 'lucide-react';

export default function VendorDmsSimulator({ orderState, setOrderState }) {
  const statusSteps = ['PENDING', 'ACCEPTED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'];

  const advanceOrder = () => {
    const idx = statusSteps.indexOf(orderState);
    if (idx >= 0 && idx < statusSteps.length - 1) {
      setOrderState(statusSteps[idx + 1]);
    }
  };

  return (
    <div className="bg-background border border-border rounded-2xl p-6 text-text shadow-2xl h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-text flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-400" />
            <span>Simulated Delivery Management System (DMS)</span>
          </h2>
          <p className="text-xs text-text-muted mt-1">Merchant Console — Process inbound orders</p>
        </div>
        <div className="flex items-center space-x-2 text-xs bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>Sync Active</span>
        </div>
      </div>

      <div className="bg-background/80 border border-border rounded-xl p-5 flex-1 flex flex-col">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-4">
          <div>
            <span className="text-xs font-mono text-emerald-400 font-bold">ORDER #LS-20260805-0001</span>
            <h3 className="text-sm font-semibold text-text mt-1">Salunkhe Kirana Store</h3>
            <p className="text-xs text-text-muted">Customer: Priya Kulkarni (Model Colony, Pune)</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-emerald-400">₹395.00</span>
            <span className="text-xs text-text-muted block">UPI • PAID</span>
          </div>
        </div>

        <div className="my-6 grid grid-cols-5 gap-2 text-center flex-1">
          {statusSteps.map((step, idx) => {
            const activeIdx = statusSteps.indexOf(orderState);
            const isPassed = idx <= activeIdx;
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isPassed ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-card-bg text-text-muted'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-4 h-4"/> : idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-medium uppercase tracking-tight ${
                  isPassed ? 'text-emerald-400 font-semibold' : 'text-text-muted'
                }`}>
                  {step.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50 justify-end">
          <button
            onClick={advanceOrder}
            disabled={orderState === 'DELIVERED'}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg transition-colors"
          >
            {orderState === 'DELIVERED' ? 'Flow Complete' : 'Advance Status'}
          </button>
        </div>
      </div>
    </div>
  );
}
