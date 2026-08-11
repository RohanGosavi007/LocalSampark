'use client';
import React, { useState } from 'react';
import Header from '../../../components/Header';
import { Calendar, PauseCircle, PlayCircle, Plus, CheckCircle, Package } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export default function SubscriptionsPage() {
  const { addToast } = useToast();
  
  const [subs, setSubs] = useState([
    { id: 'SUB-01', item: 'Amul Taaza Milk 1L', qty: 2, frequency: 'Daily', status: 'active', nextDelivery: 'Tomorrow, 6:00 AM' },
    { id: 'SUB-02', item: 'Times of India', qty: 1, frequency: 'Daily', status: 'paused', nextDelivery: 'Paused until Aug 20' }
  ]);

  const toggleStatus = (id) => {
    setSubs(subs.map(s => {
      if (s.id === id) {
        const newStatus = s.status === 'active' ? 'paused' : 'active';
        addToast(`Subscription ${newStatus === 'active' ? 'Resumed' : 'Paused'}`);
        return { ...s, status: newStatus, nextDelivery: newStatus === 'active' ? 'Tomorrow, 6:00 AM' : 'Paused manually' };
      }
      return s;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white">
      <Header />
      
      <div className="max-w-4xl mx-auto p-6 pt-24">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black flex items-center gap-3">
              <Calendar className="text-blue-500" size={32} />
              Daily Subscriptions
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Manage your recurring morning deliveries. Pause anytime.</p>
          </div>
          
          <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
            <Plus size={18} /> Add New Subscription
          </button>
        </div>

        {/* Action Banner */}
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-5 mb-8 flex items-start gap-4">
          <PauseCircle className="text-yellow-500 shrink-0 mt-1" size={24} />
          <div>
            <h3 className="font-bold text-yellow-500 mb-1">Going on Vacation?</h3>
            <p className="text-slate-300 text-sm mb-3">You can easily pause all your morning deliveries in one click to prevent wastage.</p>
            <button className="bg-slate-900 border border-yellow-500/50 hover:border-yellow-500 text-yellow-500 text-xs font-bold px-4 py-2 rounded-lg transition-colors">
              Pause All Deliveries
            </button>
          </div>
        </div>

        {/* Subscriptions List */}
        <div className="space-y-4">
          {subs.map(sub => (
            <div key={sub.id} className={`bg-slate-900 border-2 rounded-3xl p-6 transition-all ${sub.status === 'active' ? 'border-slate-800 hover:border-blue-500' : 'border-slate-800 opacity-75'}`}>
              
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${sub.status === 'active' ? 'bg-blue-900/30 text-blue-500' : 'bg-slate-800 text-slate-500'}`}>
                    <Package size={24} />
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-white">{sub.item}</h3>
                      {sub.status === 'active' ? (
                        <span className="bg-green-500/20 text-green-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle size={10} /> Active</span>
                      ) : (
                        <span className="bg-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1"><PauseCircle size={10} /> Paused</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-sm">
                      Qty: {sub.qty} • {sub.frequency} • {sub.nextDelivery}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <button className="flex-1 md:flex-none bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-6 rounded-xl transition-colors text-sm">
                    Modify
                  </button>
                  <button 
                    onClick={() => toggleStatus(sub.id)}
                    className={`flex-1 md:flex-none font-bold py-3 px-6 rounded-xl transition-colors text-sm flex items-center justify-center gap-2 ${
                      sub.status === 'active' ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                    }`}
                  >
                    {sub.status === 'active' ? <><PauseCircle size={16} /> Pause</> : <><PlayCircle size={16} /> Resume</>}
                  </button>
                </div>

              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
