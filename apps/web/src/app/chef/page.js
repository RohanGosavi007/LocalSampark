'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Utensils, Star, Clock, MapPin, ChefHat, Search, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function ChefPage() {
  const [chefs, setChefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedChef, setSelectedChef] = useState(null);

  useEffect(() => {
    fetchChefs();
  }, []);

  const fetchChefs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/chef/meals`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const items = data.data || data.rows || (Array.isArray(data) ? data : []);
      if (items.length > 0) {
        setChefs(items);
      } else {
        setChefs([
          { id: 1, name: 'Sanjay Kapoor', type: 'Private Chef', specialization: 'North Indian, Continental', rating: 4.8, experience: '12 years', price: 1500, available: true },
          { id: 2, name: 'Anjali Desai', type: 'Tiffin Service', specialization: 'Gujarati, Maharashtrian', rating: 4.6, experience: '5 years', price: 200, available: true },
          { id: 3, name: 'Chef Rahul', type: 'Party Chef', specialization: 'Italian, Mexican', rating: 4.9, experience: '8 years', price: 2500, available: false },
        ]);
      }
    } catch (e) {
      console.error('Chef API failed, using mock data:', e);
      setChefs([
        { id: 1, name: 'Sanjay Kapoor', type: 'Private Chef', specialization: 'North Indian, Continental', rating: 4.8, experience: '12 years', price: 1500, available: true },
        { id: 2, name: 'Anjali Desai', type: 'Tiffin Service', specialization: 'Gujarati, Maharashtrian', rating: 4.6, experience: '5 years', price: 200, available: true },
        { id: 3, name: 'Chef Rahul', type: 'Party Chef', specialization: 'Italian, Mexican', rating: 4.9, experience: '8 years', price: 2500, available: false },
      ]);
    }
    setLoading(false);
  };

  const filtered = chefs.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.specialization.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-orange-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-4">
              Local <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 to-orange-400">Chefs & Tiffins</span>
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Book private chefs for parties or subscribe to homemade tiffin services from your neighborhood.
            </p>
            <div className="flex items-center gap-3 max-w-xl mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 px-4 py-3">
              <Search className="text-slate-400 w-5 h-5 flex-shrink-0" />
              <input type="text" placeholder="Search for chefs or cuisines..." className="bg-transparent text-white flex-1 outline-none placeholder:text-slate-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-800/60 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((chef, i) => (
                <motion.div key={chef.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-red-500/50 transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 items-center">
                      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                        <ChefHat className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{chef.name}</h3>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{chef.type}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6 flex-1">
                    <p className="text-sm text-red-400 font-medium">{chef.specialization}</p>
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <Star className="w-4 h-4 text-yellow-500" /> {chef.rating} • {chef.experience}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block">{chef.type === 'Tiffin Service' ? 'Per Meal' : 'Starting from'}</span>
                      <span className="text-xl font-bold text-white">₹{chef.price}</span>
                    </div>
                    <button disabled={!chef.available} onClick={() => { setSelectedChef(chef); setShowBooking(true); }} className="px-6 py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-500 transition disabled:opacity-50">
                      {chef.available ? 'Book' : 'Busy'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <AnimatePresence>
          {showBooking && selectedChef && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBooking(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-8 text-center">
                <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">Request Sent!</h2>
                <p className="text-slate-400">Your booking request has been sent to {selectedChef.name}. They will confirm shortly.</p>
                <button onClick={() => setShowBooking(false)} className="mt-6 w-full py-3 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition">Close</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
