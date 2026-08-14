'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Stethoscope, Search, MapPin, Phone, Star, ShieldPlus, ArrowRight, Ambulance, HeartPulse, Clock } from 'lucide-react';
import { API_URL } from '@/lib/api';

const CATEGORIES = [
  { id: '', label: 'All Providers' },
  { id: 'hospital', label: 'Hospitals' },
  { id: 'clinic', label: 'Clinics' },
  { id: 'pharmacy', label: 'Pharmacies' },
  { id: 'lab', label: 'Pathology Labs' },
  { id: 'dentist', label: 'Dentists' },
  { id: 'eye_care', label: 'Eye Care' },
];

export default function MedicalPage() {
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [showEmergency, setShowEmergency] = useState(false);

  useEffect(() => {
    fetchProviders();
  }, [category]);

  const fetchProviders = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/health-services/providers`;
      if (category) url += `?type=${category}`;
      const res = await fetch(url);
      const data = await res.json();
      setProviders(data.data || data.providers || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
      setProviders([]);
    }
    setLoading(false);
  };

  const filtered = providers.filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.specialization || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.address || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16">
        {/* Emergency Banner */}
        <AnimatePresence>
          {showEmergency && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-600 text-white overflow-hidden">
              <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                    <Ambulance className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight">Emergency Contacts</h3>
                    <p className="text-white/80 text-sm">Ambulance: 108 | Police: 100 | Fire: 101</p>
                  </div>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                  <a href="tel:108" className="flex-1 md:flex-none px-6 py-2 bg-white text-red-600 font-bold rounded-xl text-center hover:bg-red-50 transition">Call 108</a>
                  <button onClick={() => setShowEmergency(false)} className="px-4 py-2 bg-red-700 text-white rounded-xl hover:bg-red-800 transition">Dismiss</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 px-4 border-b border-slate-800">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-emerald-600/10" />
          <div className="max-w-6xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="flex-1 text-center md:text-left">
                <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-4">
                  Neighborhood <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Health Directory</span>
                </motion.h1>
                <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto md:mx-0">
                  Find verified doctors, clinics, pharmacies and 24x7 emergency services near you.
                </p>
                <div className="flex flex-col sm:flex-row items-center gap-4 max-w-xl">
                  <div className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
                    <Search className="text-slate-500 w-5 h-5" />
                    <input type="text" placeholder="Search doctors, specialties..." className="bg-transparent text-white w-full outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  {!showEmergency && (
                    <button onClick={() => setShowEmergency(true)} className="w-full sm:w-auto px-6 py-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold hover:bg-red-500 hover:text-white transition flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4" /> SOS
                    </button>
                  )}
                </div>
              </div>
              
              <div className="hidden md:block">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-48 h-48 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                  <HeartPulse className="w-24 h-24 text-emerald-400" />
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories */}
        <div className="max-w-6xl mx-auto px-4 py-8 overflow-x-auto hide-scrollbar border-b border-slate-800 mb-8">
          <div className="flex gap-3 min-w-max pb-2">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${category === c.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30' : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-700'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Grid */}
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 h-64 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Stethoscope className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl text-slate-400 font-semibold">No providers found</h3>
              <p className="text-slate-500 mt-2">Try a different search or category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((provider, i) => (
                <motion.div key={provider.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/30 hover:bg-slate-800/50 transition-all flex flex-col">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4 items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${provider.type === 'hospital' ? 'bg-red-500/10 text-red-500' : provider.type === 'pharmacy' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                        {provider.type === 'hospital' ? <Activity className="w-7 h-7" /> : provider.type === 'pharmacy' ? <ShieldPlus className="w-7 h-7" /> : <Stethoscope className="w-7 h-7" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white leading-tight mb-1 line-clamp-2">{provider.name}</h3>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{provider.type?.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-6 flex-1">
                    {provider.specialization && (
                      <p className="text-sm text-blue-400 font-medium">{provider.specialization}</p>
                    )}
                    <p className="text-sm text-slate-400 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{provider.address}</span>
                    </p>
                    <p className="text-sm text-slate-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                      {provider.is_24x7 ? <span className="text-emerald-400 font-bold">24x7 Open</span> : <span>Standard Hours</span>}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
                    <a href={`tel:${provider.phone}`} className="flex-1 py-2.5 bg-slate-800 text-white font-semibold rounded-xl text-center hover:bg-slate-700 transition border border-slate-700 flex items-center justify-center gap-2">
                      <Phone className="w-4 h-4" /> Call
                    </a>
                    {provider.emergency_phone && (
                      <a href={`tel:${provider.emergency_phone}`} className="flex-1 py-2.5 bg-red-500/10 text-red-400 font-semibold rounded-xl text-center hover:bg-red-500 hover:text-white transition border border-red-500/20 flex items-center justify-center gap-2">
                        <Ambulance className="w-4 h-4" /> Emergency
                      </a>
                    )}
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
