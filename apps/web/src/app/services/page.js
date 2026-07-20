'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Wrench, Search, Star, MapPin, Phone, Clock, Calendar, CheckCircle2, X, Filter, ChevronRight } from 'lucide-react';
import { API_URL } from '@/lib/api';

export const SERVICE_CATEGORIES = [
  { value: '', label: 'All Services', icon: '🔧' },
  { value: 'plumber', label: 'Plumber', icon: '🔧' },
  { value: 'electrician', label: 'Electrician', icon: '⚡' },
  { value: 'carpenter', label: 'Carpenter', icon: '🪚' },
  { value: 'painter', label: 'Painter', icon: '🎨' },
  { value: 'cleaner', label: 'House Cleaning', icon: '🧹' },
  { value: 'ac_repair', label: 'AC Repair', icon: '❄️' },
  { value: 'pest_control', label: 'Pest Control', icon: '🐛' },
  { value: 'salon', label: 'Salon at Home', icon: '💇' },
  { value: 'tutor', label: 'Tutoring', icon: '📚' },
  { value: 'fitness', label: 'Fitness Trainer', icon: '💪' },
  { value: 'driver', label: 'Driver', icon: '🚗' },
  { value: 'cook', label: 'Cook / Chef', icon: '👨‍🍳' },
];

export default function ServicesPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [bookingNotes, setBookingNotes] = useState('');
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [selectedCategory]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/services?limit=50`;
      if (selectedCategory) url += `&category=${selectedCategory}`;
      const res = await fetch(url);
      const data = await res.json();
      setProviders(data.providers || data.data || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error('Failed to fetch services:', e);
      setProviders([]);
    }
    setLoading(false);
  };

  const handleBookService = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) { alert('Please login to book'); return; }
      const res = await fetch(`${API_URL}/api/v1/services/book`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: selectedProvider.id,
          service_date: bookingDate,
          service_time: bookingTime,
          notes: bookingNotes,
          category: selectedProvider.category || selectedCategory
        })
      });
      if (res.ok) {
        setBooked(true);
        setTimeout(() => { setShowBooking(false); setBooked(false); setBookingDate(''); setBookingTime(''); setBookingNotes(''); }, 2500);
      }
    } catch (e) { console.error(e); }
  };

  const filtered = providers.filter(p =>
    (p.name || p.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.skill_name || p.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 pt-20 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="text-4xl md:text-5xl font-bold text-white mb-4">
              Local <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Services</span>
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Book trusted professionals for every need — plumbers, electricians, cleaners & more
            </p>
            <div className="flex items-center gap-3 max-w-xl mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 px-4 py-3">
              <Search className="text-slate-400 w-5 h-5 flex-shrink-0" />
              <input type="text" placeholder="Search for a service or professional..."
                className="bg-transparent text-white flex-1 outline-none placeholder:text-slate-500"
                value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Category Pills */}
        <div className="max-w-6xl mx-auto px-4 mb-8">
          <div className="flex flex-wrap gap-2 justify-center">
            {SERVICE_CATEGORIES.map(c => (
              <button key={c.value} onClick={() => setSelectedCategory(c.value)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === c.value
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/30'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
                }`}>
                <span className="mr-1">{c.icon}</span>{c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Provider Grid */}
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-slate-800/60 rounded-2xl p-6 animate-pulse">
                  <div className="w-16 h-16 rounded-full bg-slate-700 mb-4" />
                  <div className="h-5 bg-slate-700 rounded w-2/3 mb-3" />
                  <div className="h-4 bg-slate-700 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Wrench className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl text-slate-400 font-semibold">No Service Providers Found</h3>
              <p className="text-slate-500 mt-2">Try a different category or check back later</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((provider, i) => (
                <motion.div key={provider.id || i}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-slate-800/70 backdrop-blur-sm border border-slate-700/60 rounded-2xl p-6 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 transition-all cursor-pointer"
                  onClick={() => { setSelectedProvider(provider); setShowBooking(true); }}>
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center text-white font-bold text-xl">
                      {(provider.full_name || provider.name || 'S')[0].toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">{provider.full_name || provider.name}</h3>
                      <p className="text-violet-400 text-sm font-medium">{provider.skill_name || provider.category || 'Professional'}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {provider.experience_years > 0 && (
                      <span className="px-2.5 py-1 bg-slate-700/80 rounded-lg text-xs text-slate-300">{provider.experience_years}+ years</span>
                    )}
                    {provider.daily_rate && (
                      <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-lg text-xs font-semibold">₹{provider.daily_rate}/day</span>
                    )}
                    {provider.is_certified && (
                      <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-semibold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" />Certified</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${provider.availability_status === 'available' ? 'text-emerald-400' : provider.availability_status === 'busy' ? 'text-amber-400' : 'text-slate-500'}`}>
                      ● {provider.availability_status || 'Available'}
                    </span>
                    <span className="flex items-center gap-1 text-yellow-400 text-sm">
                      <Star className="w-3.5 h-3.5 fill-yellow-400" /> {provider.avg_rating || '4.5'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Booking Modal */}
        <AnimatePresence>
          {showBooking && selectedProvider && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowBooking(false)}>
              <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
                className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-8"
                onClick={(e) => e.stopPropagation()}>
                {booked ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-white">Service Booked!</h3>
                    <p className="text-slate-400 mt-2">{selectedProvider.full_name || selectedProvider.name} will contact you shortly</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-white">Book Service</h3>
                        <p className="text-violet-400 text-sm mt-1">{selectedProvider.full_name || selectedProvider.name} — {selectedProvider.skill_name || selectedProvider.category}</p>
                      </div>
                      <button onClick={() => setShowBooking(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-slate-300 text-sm font-medium mb-1 block">Preferred Date</label>
                        <input type="date" value={bookingDate} onChange={(e) => setBookingDate(e.target.value)}
                          className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 focus:border-violet-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-300 text-sm font-medium mb-1 block">Preferred Time</label>
                        <input type="time" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)}
                          className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 focus:border-violet-500 outline-none" />
                      </div>
                      <div>
                        <label className="text-slate-300 text-sm font-medium mb-1 block">Notes</label>
                        <textarea value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)}
                          placeholder="Describe your requirement..."
                          className="w-full bg-slate-800 text-white rounded-xl px-4 py-3 border border-slate-700 focus:border-violet-500 outline-none resize-none h-24" />
                      </div>
                      <button onClick={handleBookService}
                        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-violet-500/30 transition-all">
                        Confirm Booking
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
