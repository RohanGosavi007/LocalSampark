'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { HandHeart, MapPin, Calendar, Clock, CheckCircle2, ShieldCheck, Share2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

const FALLBACK_OPPORTUNITIES = [
  { id: 1, title: 'Weekend Lake Cleanup', org: 'Green Earth Initiative', date: 'Next Saturday', time: '08:00 AM', location: 'Pashan Lake', type: 'Environment', spots: 12 },
  { id: 2, title: 'Teach English to Underprivileged Kids', org: 'Vidya Trust', date: 'Every Sunday', time: '10:00 AM', location: 'Viman Nagar Slums', type: 'Education', spots: 4 },
  { id: 3, title: 'Animal Shelter Helper', org: 'Paws Rescue', date: 'Flexible', time: 'Anytime', location: 'Kalyani Nagar', type: 'Animals', spots: 8 },
];

export default function VolunteerPage() {
  const [showApply, setShowApply] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [applied, setApplied] = useState(false);

  const handleApply = () => {
    setApplied(true);
    setTimeout(() => {
      setShowApply(false);
      setApplied(false);
    }, 2000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/20 to-lime-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-lime-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
              <HandHeart className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-4">
              Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-lime-400">Volunteering</span>
            </motion.h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-8">
              Give back to your neighborhood. Join verified local NGOs and community initiatives to make a real difference.
            </p>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FALLBACK_OPPORTUNITIES.map((opp, i) => (
              <motion.div key={opp.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-background border border-border rounded-3xl p-6 hover:border-emerald-500/50 transition-all flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase rounded-full">
                    {opp.type}
                  </span>
                  <span className="text-xs text-text-muted font-bold">{opp.spots} spots left</span>
                </div>
                
                <h3 className="text-xl font-bold text-text mb-1 leading-tight">{opp.title}</h3>
                <span className="text-sm text-text-muted mb-6 flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> {opp.org}</span>
                
                <div className="space-y-3 mb-6 flex-1 bg-card-bg/50 p-4 rounded-2xl border border-border/50">
                  <div className="flex items-start gap-2 text-sm text-text-muted">
                    <Calendar className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{opp.date}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-text-muted">
                    <Clock className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{opp.time}</span>
                  </div>
                  <div className="flex items-start gap-2 text-sm text-text-muted">
                    <MapPin className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{opp.location}</span>
                  </div>
                </div>

                <button onClick={() => { setSelectedOpp(opp); setShowApply(true); }} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition">
                  Volunteer Now
                </button>
              </motion.div>
            ))}
          </div>
        </div>

        <AnimatePresence>
          {showApply && selectedOpp && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowApply(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-background border border-border rounded-3xl w-full max-w-md p-8">
                {applied ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text mb-2">Application Sent!</h2>
                    <p className="text-text-muted">The organizer will contact you shortly with next steps.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-2xl font-bold text-text mb-2">Join Initiative</h2>
                    <p className="text-text-muted mb-6">{selectedOpp.title}</p>
                    
                    <textarea placeholder="Why do you want to volunteer? (Optional)" className="w-full bg-card-bg text-text rounded-xl p-4 border border-border focus:border-emerald-500 outline-none resize-none h-24 mb-6" />

                    <button onClick={handleApply} className="w-full py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-500 transition">Submit Application</button>
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
