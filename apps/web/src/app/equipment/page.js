'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Wrench, MapPin, Search, Calendar, ChevronRight, Tool, Truck, ShieldCheck } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchEquipment();
  }, []);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`${API_URL}/api/v1/equipment`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      const data = await res.json();
      const items = data.data || data.rows || (Array.isArray(data) ? data : []);
      if (items.length > 0) {
        setEquipment(items);
      } else {
        // Seed display with examples when DB is empty
        setEquipment([
          { id: 1, item_name: 'Heavy Duty Drill Machine', title: 'Heavy Duty Drill Machine', category: 'Tools', daily_rate: 400, price_per_day: 400, deposit: 1000, provider: 'Raju Hardware', location: 'Kalyani Nagar', status: 'available', available: true },
          { id: 2, item_name: 'Concrete Mixer', title: 'Concrete Mixer', category: 'Construction', daily_rate: 1200, price_per_day: 1200, deposit: 5000, provider: 'BuildWell Equipments', location: 'Viman Nagar', status: 'available', available: true },
          { id: 3, item_name: 'Lawn Mower', title: 'Lawn Mower', category: 'Gardening', daily_rate: 500, price_per_day: 500, deposit: 1500, provider: 'Green Thumb', location: 'Koregaon Park', status: 'rented', available: false },
          { id: 4, item_name: 'Professional DSLR Camera', title: 'Professional DSLR Camera', category: 'Electronics', daily_rate: 1500, price_per_day: 1500, deposit: 10000, provider: 'PhotoRent', location: 'Camp', status: 'available', available: true },
        ]);
      }
    } catch (e) {
      console.error('Equipment API failed, using mock data:', e);
      setEquipment([
        { id: 1, title: 'Heavy Duty Drill Machine', category: 'Tools', price_per_day: 400, deposit: 1000, provider: 'Raju Hardware', location: 'Kalyani Nagar', available: true },
        { id: 2, title: 'Concrete Mixer', category: 'Construction', price_per_day: 1200, deposit: 5000, provider: 'BuildWell Equipments', location: 'Viman Nagar', available: true },
        { id: 3, title: 'Lawn Mower', category: 'Gardening', price_per_day: 500, deposit: 1500, provider: 'Green Thumb', location: 'Koregaon Park', available: false },
        { id: 4, title: 'Professional DSLR Camera', category: 'Electronics', price_per_day: 1500, deposit: 10000, provider: 'PhotoRent', location: 'Camp', available: true },
      ]);
    }
    setLoading(false);
  };

  const filtered = equipment.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-600/20 to-orange-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-4">
              Equipment <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">Rentals</span>
            </motion.h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-8">
              Rent tools, machinery, and equipment for your next project directly from local shops.
            </p>
            <div className="flex items-center gap-3 max-w-xl mx-auto bg-background-alt/80 backdrop-blur-md rounded-2xl border border-border px-4 py-3">
              <Search className="text-text-muted w-5 h-5 flex-shrink-0" />
              <input type="text" placeholder="Search for drills, mixers, cameras..." className="bg-transparent text-text flex-1 outline-none placeholder:text-text-muted" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-12">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => <div key={i} className="h-64 bg-background-alt/60 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {filtered.map((item, i) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card-bg border border-border rounded-3xl p-5 hover:border-amber-500/50 transition-all flex flex-col">
                  <div className="h-40 bg-background-alt rounded-2xl mb-4 flex items-center justify-center">
                    <Wrench className="w-12 h-12 text-text-muted" />
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-xs font-bold text-amber-500 uppercase">{item.category}</span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${item.available ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {item.available ? 'Available' : 'Rented Out'}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-text mb-2 leading-tight">{item.title}</h3>
                  <div className="mt-auto space-y-3 pt-4 border-t border-border">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted">Rent</span>
                      <span className="text-text font-bold">₹{item.price_per_day}/day</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted">Security Dep.</span>
                      <span className="text-text font-medium">₹{item.deposit}</span>
                    </div>
                    <button disabled={!item.available} className="w-full py-2.5 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-500 transition disabled:opacity-50 mt-2">
                      {item.available ? 'Request Rental' : 'Notify When Available'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
