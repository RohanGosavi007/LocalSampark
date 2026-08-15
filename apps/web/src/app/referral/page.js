'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Share2, Gift, Users, Copy, CheckCircle2 } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function ReferralPage() {
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState('SAMPARK-2026');

  React.useEffect(() => {
    const fetchReferral = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        const res = await fetch(`${API_URL}/api/v1/referral/code`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.code) {
          setReferralCode(data.code);
        }
      } catch (e) {
        console.error('Referral API failed, using default code:', e);
      }
    };
    fetchReferral();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-fuchsia-600/20 to-purple-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-20 h-20 bg-gradient-to-br from-fuchsia-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-500/30">
              <Gift className="w-10 h-10 text-white" />
            </motion.div>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-4">
              Refer & <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">Earn Rewards</span>
            </motion.h1>
            <p className="text-text-muted text-lg max-w-2xl mx-auto mb-8">
              Invite your neighbors and local shops to LocalSampark. Both of you earn 500 Coins on successful registration!
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-12 relative z-20 -mt-10">
          <div className="bg-card-bg border border-border rounded-3xl p-8 text-center shadow-2xl">
            <h2 className="text-2xl font-bold text-text mb-6">Your Referral Code</h2>

            <div className="flex items-center justify-center gap-4 mb-8">
              <div className="bg-background-alt border-2 border-dashed border-border rounded-2xl px-8 py-4">
                <span className="text-3xl font-mono font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-purple-400">
                  {referralCode}
                </span>
              </div>
              <button onClick={copyToClipboard} className="w-16 h-16 bg-background-alt rounded-2xl hover:bg-card-bg transition flex items-center justify-center border border-border">
                {copied ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <Copy className="w-6 h-6 text-text-muted" />}
              </button>
            </div>

            <button className="w-full md:w-auto mx-auto px-10 py-4 bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-fuchsia-600/20 hover:opacity-90 transition flex items-center justify-center gap-2">
              <Share2 className="w-5 h-5" /> Share via WhatsApp
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="bg-card-bg border border-border rounded-2xl p-6 text-center">
              <Users className="w-10 h-10 text-fuchsia-500 mx-auto mb-4" />
              <h3 className="text-text font-bold mb-2">1. Share Code</h3>
              <p className="text-text-muted text-sm">Share your code with friends and local shops.</p>
            </div>
            <div className="bg-card-bg border border-border rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-10 h-10 text-fuchsia-500 mx-auto mb-4" />
              <h3 className="text-text font-bold mb-2">2. They Join</h3>
              <p className="text-text-muted text-sm">They download the app and sign up using your code.</p>
            </div>
            <div className="bg-card-bg border border-border rounded-2xl p-6 text-center">
              <Gift className="w-10 h-10 text-fuchsia-500 mx-auto mb-4" />
              <h3 className="text-text font-bold mb-2">3. You Both Earn</h3>
              <p className="text-text-muted text-sm">Both of you get 500 Coins in your LocalSampark Wallet.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
