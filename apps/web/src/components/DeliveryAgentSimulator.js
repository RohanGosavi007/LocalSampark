'use client';
import React from 'react';
import { Navigation, CheckCircle2, Clock, MapPin } from 'lucide-react';

export default function DeliveryAgentSimulator({ deliveryState, setDeliveryState, orderState }) {
  const statusSteps = ['UNASSIGNED', 'HEADING_TO_STORE', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];

  // A delivery agent can only start if the order is PREPARING or OUT_FOR_DELIVERY
  const canInteract = orderState === 'PREPARING' || orderState === 'OUT_FOR_DELIVERY' || orderState === 'DELIVERED';

  const advanceDelivery = () => {
    const idx = statusSteps.indexOf(deliveryState);
    if (idx >= 0 && idx < statusSteps.length - 1) {
      setDeliveryState(statusSteps[idx + 1]);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-2xl h-full flex flex-col">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Navigation className="w-5 h-5 text-purple-400" />
            <span>Delivery Agent Simulator</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Rider Console — Track pickups & drop-offs</p>
        </div>
      </div>

      <div className={`border rounded-xl p-5 flex-1 flex flex-col transition-colors ${canInteract ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-900/50 border-slate-800/50 opacity-50'}`}>
        {!canInteract && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/40 rounded-xl backdrop-blur-[1px]">
            <p className="text-sm font-bold text-slate-300 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700">Waiting for Merchant to accept & prepare order...</p>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4 relative z-0">
          <div>
            <span className="text-xs font-mono text-purple-400 font-bold">TASK #LS-DL-4482</span>
            <h3 className="text-sm font-semibold text-white mt-1">Pickup: Salunkhe Kirana Store</h3>
            <p className="text-xs text-slate-400">Drop: Priya Kulkarni (Model Colony, Pune)</p>
          </div>
          <div className="text-right">
            <span className="text-sm font-bold text-purple-400">2.4 km away</span>
            <span className="text-xs text-slate-500 flex items-center justify-end gap-1"><MapPin className="w-3 h-3"/> Route Active</span>
          </div>
        </div>

        <div className="my-6 grid grid-cols-5 gap-2 text-center flex-1 relative z-0">
          {statusSteps.map((step, idx) => {
            const activeIdx = statusSteps.indexOf(deliveryState);
            const isPassed = idx <= activeIdx;
            return (
              <div key={step} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  isPassed ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20' : 'bg-slate-800 text-slate-500'
                }`}>
                  {isPassed ? <CheckCircle2 className="w-4 h-4"/> : idx + 1}
                </div>
                <span className={`text-[10px] mt-2 font-medium uppercase tracking-tight ${
                  isPassed ? 'text-purple-400 font-semibold' : 'text-slate-500'
                }`}>
                  {step.replace(/_/g, ' ')}
                </span>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-800/50 justify-end relative z-0">
            <button
              onClick={advanceDelivery}
              disabled={deliveryState === 'DELIVERED' || !canInteract}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium text-xs rounded-lg transition-colors"
            >
              {deliveryState === 'DELIVERED' ? 'Delivery Complete' : 'Advance Rider Status'}
            </button>
        </div>
      </div>
    </div>
  );
}
