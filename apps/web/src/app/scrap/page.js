'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Recycle, Truck, MapPin, Scale, Phone, Star, CheckCircle, Package, Battery, Monitor, Newspaper } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { API_BASE } from '@/lib/api';

const SCRAP_RATES = [
  { id: 'newspaper', icon: Newspaper, name: 'Old Newspapers', rate: 15, unit: 'kg', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { id: 'cardboard', icon: Package, name: 'Cardboard / Cartons', rate: 10, unit: 'kg', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { id: 'iron', icon: Scale, name: 'Iron & Steel', rate: 28, unit: 'kg', color: 'text-slate-600', bg: 'bg-slate-500/10' },
  { id: 'ewaste', icon: Monitor, name: 'E-Waste (Phones, PCs)', rate: 45, unit: 'kg', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { id: 'battery', icon: Battery, name: 'Batteries (Inverter/Car)', rate: 85, unit: 'kg', color: 'text-red-500', bg: 'bg-red-500/10' },
  { id: 'plastic', icon: Recycle, name: 'Mixed Plastics', rate: 12, unit: 'kg', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
];

const MOCK_DEALERS = [
  { id: 1, name: 'Green Earth Scrap Yard', distance: '1.2 km', rating: 4.8, type: 'All Types' },
  { id: 2, name: 'Pune E-Waste Recyclers', distance: '3.5 km', rating: 4.6, type: 'E-Waste Only' },
  { id: 3, name: 'Sai Traders & Scrap', distance: '0.8 km', rating: 4.2, type: 'Paper & Metal' },
];

export default function ScrapPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('rates'); // 'rates', 'book', 'dealers'

  // Booking Form State
  const [form, setForm] = useState({ address: '', preferred_time: '', estimated_weight: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleBookPickup = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Please login to book a pickup");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/scrap/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        setIsSuccess(true);
      } else {
        alert("Failed to book pickup. Please try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-3xl p-8 md:p-12 text-white mb-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Recycle className="w-48 h-48" />
          </div>
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-4xl md:text-5xl font-black mb-4">Turn Your Scrap Into Cash</h1>
            <p className="text-emerald-50 text-lg mb-8">
              Sell old newspapers, metals, e-waste, and plastics instantly. Book a doorstep pickup or find local dealers in your neighborhood.
            </p>
            <div className="flex gap-4 flex-wrap">
              <Button onClick={() => setActiveTab('book')} className="bg-white text-emerald-600 hover:bg-emerald-50 font-bold px-8 py-3 rounded-xl">
                Book a Pickup
              </Button>
              <Button onClick={() => setActiveTab('rates')} variant="outline" className="border-white text-white hover:bg-white/10 font-bold px-8 py-3 rounded-xl">
                View Today's Rates
              </Button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar border-b border-border">
          {[
            { id: 'rates', label: 'Rate Card', icon: Scale },
            { id: 'book', label: 'Book Pickup', icon: Truck },
            { id: 'dealers', label: 'Local Dealers', icon: MapPin },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-xl font-bold transition-colors whitespace-nowrap ${
                activeTab === tab.id 
                  ? 'bg-emerald-500/10 text-emerald-600 border-b-2 border-emerald-500' 
                  : 'text-text-muted hover:bg-background-alt'
              }`}
            >
              <tab.icon className="w-5 h-5" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          <AnimatePresence mode="wait">
            
            {/* RATES TAB */}
            {activeTab === 'rates' && (
              <motion.div
                key="rates"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-6 flex justify-between items-end">
                  <div>
                    <h2 className="text-2xl font-bold text-text">Material-wise Scrap Rates</h2>
                    <p className="text-text-muted">Prices may vary slightly based on quality and local dealer.</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SCRAP_RATES.map((item) => (
                    <div key={item.id} className="bg-background-alt p-6 rounded-2xl border border-border flex items-center gap-4 hover:border-emerald-500/30 transition-colors">
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${item.bg} ${item.color}`}>
                        <item.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="font-bold text-text">{item.name}</h3>
                        <p className="text-2xl font-black text-emerald-600 mt-1">
                          ₹{item.rate} <span className="text-sm font-medium text-text-muted">/ {item.unit}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* BOOKING TAB */}
            {activeTab === 'book' && (
              <motion.div
                key="book"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                className="max-w-2xl mx-auto"
              >
                {!isSuccess ? (
                  <form onSubmit={handleBookPickup} className="bg-background-alt p-8 rounded-3xl border border-border shadow-sm">
                    <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
                      <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600">
                        <Truck className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-text">Schedule a Doorstep Pickup</h2>
                        <p className="text-text-muted text-sm">A verified scrap dealer will visit your location.</p>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-text mb-2">Pickup Address</label>
                        <textarea 
                          required
                          value={form.address}
                          onChange={e => setForm({...form, address: e.target.value})}
                          placeholder="Enter your full address with landmark"
                          className="w-full p-4 rounded-xl border border-border bg-background text-text focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                          rows="3"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-bold text-text mb-2">Estimated Weight</label>
                          <select 
                            required
                            value={form.estimated_weight}
                            onChange={e => setForm({...form, estimated_weight: e.target.value})}
                            className="w-full p-4 rounded-xl border border-border bg-background text-text focus:outline-none focus:border-emerald-500"
                          >
                            <option value="">Select weight range...</option>
                            <option value="1-5">1 - 5 kg</option>
                            <option value="5-20">5 - 20 kg</option>
                            <option value="20-50">20 - 50 kg</option>
                            <option value="50+">50+ kg (Bulk)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-bold text-text mb-2">Preferred Time</label>
                          <Input 
                            type="datetime-local" 
                            required
                            value={form.preferred_time}
                            onChange={e => setForm({...form, preferred_time: e.target.value})}
                            className="w-full p-4"
                          />
                        </div>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl mt-4 text-lg"
                      >
                        {isSubmitting ? 'Booking...' : 'Confirm Pickup Request'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/30 p-10 rounded-3xl text-center"
                  >
                    <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
                    <h2 className="text-3xl font-black text-text mb-2">Pickup Scheduled!</h2>
                    <p className="text-text-muted mb-8 max-w-md mx-auto">
                      Your scrap pickup request has been sent to nearby dealers. You will receive a call shortly to confirm the exact time.
                    </p>
                    <Button onClick={() => { setIsSuccess(false); setForm({ address: '', preferred_time: '', estimated_weight: '' }); }} className="bg-emerald-600 text-white font-bold px-8">
                      Book Another
                    </Button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* DEALERS TAB */}
            {activeTab === 'dealers' && (
              <motion.div
                key="dealers"
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
              >
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-text">Verified Local Dealers</h2>
                  <p className="text-text-muted">Find and contact scrap yards directly in your area.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MOCK_DEALERS.map(dealer => (
                    <div key={dealer.id} className="bg-background-alt p-6 rounded-2xl border border-border hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                          <MapPin className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <h3 className="font-bold text-text text-lg">{dealer.name}</h3>
                          <div className="flex items-center gap-3 text-sm text-text-muted mt-1">
                            <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {dealer.rating}</span>
                            <span>•</span>
                            <span>{dealer.distance}</span>
                            <span>•</span>
                            <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-xs font-bold">{dealer.type}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 flex items-center gap-2">
                        <Phone className="w-4 h-4" /> Call Now
                      </Button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
