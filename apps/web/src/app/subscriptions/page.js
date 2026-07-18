'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, Calendar, Clock, MapPin, Search, CheckCircle2, ShoppingBag } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showSubModal, setShowSubModal] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        const res = await fetch(`${API_URL}/api/v1/subscription/plans`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        const data = await res.json();
        const items = data.data || data.rows || (Array.isArray(data) ? data : []);
        setPlans(items);
      } catch (e) {
        console.error('Subscription API failed:', e);
      }
      setLoading(false);
    };
    fetchPlans();
  }, []);

  const handleSubscribe = async () => {
    if (!deliveryAddress) {
      alert('Please enter a delivery address');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login to subscribe to plans.');
        setSubmitting(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/v1/subscription/subscribe`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          planId: selectedPlan.id,
          deliveryAddress
        })
      });

      const data = await res.json();
      if (res.ok || data.success) {
        setSubscribed(true);
        setTimeout(() => {
          setShowSubModal(false);
          setSubscribed(false);
          setDeliveryAddress('');
        }, 2000);
      } else {
        alert('Failed to subscribe: ' + (data.error || 'Unknown error'));
      }
    } catch (e) {
      console.error(e);
      alert('Network error occurred.');
    }
    setSubmitting(false);
  };

  const filtered = plans.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
    (p.provider_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-blue-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4">
              Daily <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">Essentials</span> Delivered
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Subscribe to milk, bread, groceries, and tiffins from your trusted local shops.
            </p>
            <div className="flex items-center gap-3 max-w-xl mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 px-4 py-3">
              <Search className="text-slate-400 w-5 h-5 flex-shrink-0" />
              <input type="text" placeholder="Search for milk, tiffin, veggies..."
                className="bg-transparent text-white flex-1 outline-none placeholder:text-slate-500"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 mt-8">
          {loading ? (
            <div className="text-center py-20"><p className="text-slate-400">Loading subscription plans...</p></div>
          ) : plans.length === 0 ? (
            <div className="text-center py-20 bg-slate-900 rounded-3xl border border-slate-800">
              <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Plans Available</h3>
              <p className="text-slate-400">There are no subscription plans configured in your area yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((plan, i) => (
                <motion.div key={plan.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-emerald-500/50 transition group flex flex-col h-full relative overflow-hidden">
                  
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/20 transition" />

                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-emerald-400 font-bold text-xl">
                      {plan.icon || '📦'}
                    </div>
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-bold rounded-full border border-slate-700">
                      {plan.schedule || 'Daily'}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 relative z-10">{plan.name}</h3>
                  <p className="text-slate-400 text-sm mb-4 relative z-10">By {plan.provider_name}</p>

                  <div className="space-y-2 mb-6 flex-1 relative z-10">
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <ShoppingBag className="w-4 h-4 text-emerald-500" /> 
                      <span className="truncate">{plan.description || 'Assorted Items'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300 text-sm">
                      <Clock className="w-4 h-4 text-blue-500" /> Delivery: {plan.delivery_time || 'Morning'}
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 flex justify-between items-end relative z-10 mt-auto">
                    <div>
                      <p className="text-slate-500 text-xs font-medium mb-1">Starting at</p>
                      <p className="text-2xl font-black text-white">₹{plan.price}<span className="text-sm text-slate-400 font-normal">/{plan.schedule === 'Daily' ? 'day' : 'cycle'}</span></p>
                    </div>
                    <button 
                      onClick={() => { setSelectedPlan(plan); setShowSubModal(true); }}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/20">
                      Subscribe
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Subscription Modal */}
      <AnimatePresence>
        {showSubModal && selectedPlan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !submitting && !subscribed && setShowSubModal(false)} />
            
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md relative z-10 shadow-2xl">
              
              {!subscribed ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Confirm Subscription</h3>
                    <button onClick={() => setShowSubModal(false)} className="text-slate-400 hover:text-white">✕</button>
                  </div>
                  
                  <div className="bg-slate-800/50 rounded-2xl p-4 mb-6 border border-slate-700/50">
                    <p className="text-white font-bold text-lg mb-1">{selectedPlan.name}</p>
                    <p className="text-slate-400 text-sm mb-4">By {selectedPlan.provider_name}</p>
                    <div className="flex justify-between text-sm text-slate-300">
                      <span>Schedule: <span className="text-white font-medium">{selectedPlan.schedule || 'Daily'}</span></span>
                      <span>Price: <span className="text-emerald-400 font-bold">₹{selectedPlan.price}</span></span>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="text-slate-400 text-sm font-medium mb-2 block">Delivery Address</label>
                      <textarea 
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Enter full address for delivery..."
                        className="w-full bg-slate-800 text-white rounded-xl p-3 outline-none border border-slate-700 focus:border-emerald-500 h-24 resize-none"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleSubscribe} 
                    disabled={submitting}
                    className="w-full py-3.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition shadow-lg shadow-emerald-600/20 flex justify-center items-center gap-2">
                    {submitting ? <span className="animate-pulse">Processing...</span> : 'Confirm & Subscribe'}
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-2">Subscribed!</h3>
                  <p className="text-slate-400">Your {selectedPlan.schedule || 'Daily'} subscription is now active.</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
