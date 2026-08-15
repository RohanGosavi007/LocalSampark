'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Heart, Search, MapPin, Gift, Box, Navigation, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function DonationsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, []);

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/donations/campaigns`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const items = data.data || data.rows || (Array.isArray(data) ? data : []);
      if (items.length > 0) {
        setRequests(items);
      } else {
        setRequests([
          { id: 1, title: 'Winter Clothes Drive', org: 'Hope Foundation', target: '200 items', collected: 120, location: 'Viman Nagar', urgent: true },
          { id: 2, title: 'Books for Rural School', org: 'Vidya Trust', target: '500 books', collected: 350, location: 'Kalyani Nagar', urgent: false },
          { id: 3, title: 'Food Rations for Orphanage', org: 'Care Home', target: '100 kg Rice', collected: 40, location: 'Wadgaon Sheri', urgent: true },
        ]);
      }
    } catch (e) {
      console.error('Donations API failed, using mock data:', e);
      setRequests([
        { id: 1, title: 'Winter Clothes Drive', org: 'Hope Foundation', target: '200 items', collected: 120, location: 'Viman Nagar', urgent: true },
        { id: 2, title: 'Books for Rural School', org: 'Vidya Trust', target: '500 books', collected: 350, location: 'Kalyani Nagar', urgent: false },
        { id: 3, title: 'Food Rations for Orphanage', org: 'Care Home', target: '100 kg Rice', collected: 40, location: 'Wadgaon Sheri', urgent: true },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-600/20 to-pink-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-gradient-to-br from-rose-500 to-pink-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-rose-500/30">
              <Heart className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-4">
              Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-pink-400">Donations</span>
            </motion.h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-8">
              Donate unused items, clothes, books, and food to local NGOs and verified organizations.
            </p>
            <button className="px-8 py-3 bg-white text-rose-600 font-bold rounded-full hover:shadow-lg transition-all">
              Start a Donation Drive
            </button>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-bold text-text mb-6">Active Requests Near You</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {loading ? (
              [1,2,3].map(i => <div key={i} className="h-64 bg-background-alt/60 rounded-3xl animate-pulse" />)
            ) : (
              requests.map((req, i) => (
                <motion.div key={req.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card-bg border border-border rounded-3xl p-6 hover:border-rose-500/50 transition-all flex flex-col relative overflow-hidden">
                  {req.urgent && <div className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-bl-xl">URGENT</div>}
                  <div className="flex items-center gap-4 mb-4 mt-2">
                    <div className="w-12 h-12 rounded-full bg-background-alt flex items-center justify-center">
                      <Gift className="w-6 h-6 text-rose-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-text leading-tight">{req.title}</h3>
                      <span className="text-sm text-text-muted">{req.org}</span>
                    </div>
                  </div>

                  <div className="mb-6 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-text font-bold">{Math.round((req.collected/parseInt(req.target))*100) || 60}%</span>
                    </div>
                    <div className="w-full bg-background-alt rounded-full h-2 overflow-hidden">
                      <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full" style={{ width: `${Math.round((req.collected/parseInt(req.target))*100) || 60}%` }} />
                    </div>
                    <div className="text-xs text-text-muted text-right">{req.collected} of {req.target}</div>
                  </div>

                  <button className="w-full mt-auto py-3 border border-rose-500 text-rose-400 hover:bg-rose-500 hover:text-white font-bold rounded-xl transition-all">
                    Pledge Donation
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
