'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { 
  Store, Zap, Building2, Car, MessageSquare, Briefcase, HandCoins, 
  Wallet, PawPrint, HeartPulse, Ticket, Package, Check, X, ShieldCheck
} from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const COMPARE = [
  { feature: 'Merchant Commission', ls: '0% (Free Storefront)', agg: '15–30% per order', social: 'No checkout system' },
  { feature: 'User Verification', ls: 'Mobile OTP + Society-Bound', agg: 'Email/Mobile only', social: 'None (spam risk)' },
  { feature: 'P2P Micro-Delivery', ls: 'Integrated, Commission-Free', agg: 'High delivery fees', social: 'Manual only' },
  { feature: 'Broker-Free Real Estate', ls: 'Direct owner posts', agg: 'High broker fees', social: 'Unorganized listings' },
  { feature: 'Daily Subscriptions', ls: 'Auto-debit from Wallet', agg: 'Separate app needed', social: 'No billing' },
  { feature: 'Society Gate Management', ls: 'QR Pass + Digital Log', agg: 'Not available', social: 'Not available' },
  { feature: 'Gig Economy (Verified)', ls: 'Background-verified', agg: 'Self-reported only', social: 'Unverified listings' },
  { feature: 'Carpooling', ls: 'Verified neighbors only', agg: 'Not available', social: 'Ad-hoc WhatsApp groups' },
  { feature: 'Franchise Model', ls: 'Territory-based partners', agg: 'Company-owned', social: 'Not applicable' },
  { feature: 'Revenue Split', ls: 'Configurable by Admin', agg: 'Hidden fees', social: 'Not applicable' },
];

const PILLARS = [
  { icon: Store, title: 'Zero-Commission Shops', desc: '347 verified local merchants. 100% of revenue goes to them. No Swiggy-style cuts.', color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { icon: Zap, title: 'Gig Economy', desc: 'OTP-verified electricians, plumbers, tutors, cleaners — rated by real neighbors.', color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  { icon: Building2, title: 'Society Management', desc: 'Gate QR passes, domestic staff verification, and maintenance billing in one platform.', color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
  { icon: Car, title: 'Verified Carpooling', desc: 'Co-riders from the same society. GPS-tracked. Save ₹1,500+/month.', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { icon: MessageSquare, title: 'Community Forum', desc: 'Moderated, OTP-verified neighborhood discussions, alerts, and announcements.', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { icon: Briefcase, title: 'Broker-Free Real Estate', desc: 'Direct landlord-to-tenant. Zero brokerage. PGs, flats, flatmates, shops.', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { icon: HandCoins, title: 'Multi-Tier Earnings', desc: 'Earn as a runner, franchise partner, referral agent, or shop owner.', color: 'text-green-500', bg: 'bg-green-500/10' },
  { icon: Wallet, title: 'Integrated Wallet', desc: 'Pay, collect, and split. Auto-debit for subscriptions. UPI-linked.', color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
  { icon: PawPrint, title: 'Pet Community', desc: 'Lost alerts, vets, grooming, pet-sitting — from verified neighbor caregivers.', color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { icon: HeartPulse, title: 'SOS Emergency Network', desc: '1-tap broadcast to all verified neighbors. Hospital directory. Direct call.', color: 'text-red-500', bg: 'bg-red-500/10' },
  { icon: Ticket, title: 'Events & Ticketing', desc: 'Discover, RSVP, and buy tickets for local cultural events and society functions.', color: 'text-pink-500', bg: 'bg-pink-500/10' },
  { icon: Package, title: 'P2P Delivery', desc: 'Send keys, documents, parcels across your neighborhood instantly.', color: 'text-rose-500', bg: 'bg-rose-500/10' },
];

export default function FeaturesPage() {
  const [tab, setTab] = useState('pillars');

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1">
        {/* Hero */}
        <section className="relative pt-32 pb-20 overflow-hidden">
          {/* Animated Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-blobBounce" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[100px] animate-blobBounce" style={{ animationDelay: '2s' }} />

          <div className="container relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Badge variant="primary" pulse className="mb-6 px-4 py-1.5 text-sm uppercase tracking-widest">
                Platform Architecture
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-heading font-black tracking-tight leading-[1.1] mb-6 text-text max-w-4xl mx-auto">
                Everything Your <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-secondary animate-shimmer bg-[length:200%_auto]">
                  Neighborhood Needs
                </span>
              </h1>
              
              <p className="text-lg lg:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                12 powerful modules, 300+ features — all built for India's hyperlocal communities. Free for residents. Zero commission for merchants.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="shadow-xl shadow-primary/20 hover:-translate-y-1">
                  Register Your Shop Free
                </Button>
                <Button size="lg" variant="secondary" className="hover:-translate-y-1">
                  Download App
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="py-12 bg-gradient-to-r from-primary to-indigo-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          <div className="container relative z-10">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-center divide-x divide-white/10">
              {[
                { v: '12,450+', l: 'Active Residents' },
                { v: '347', l: 'Verified Shops' },
                { v: '0%', l: 'Merchant Comm.' },
                { v: '25+', l: 'Pune Zones' },
                { v: '48hr', l: 'Go-Live Time' },
                { v: '4.8★', l: 'App Rating' },
              ].map((s, i) => (
                <motion.div 
                  key={s.l}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                >
                  <p className="text-3xl font-heading font-black text-white mb-1">{s.v}</p>
                  <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{s.l}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Content */}
        <section className="py-24">
          <div className="container">
            {/* Tab Switcher */}
            <div className="flex flex-wrap justify-center gap-4 mb-16">
              <button 
                onClick={() => setTab('pillars')}
                className={`px-8 py-3 rounded-full font-heading font-bold text-sm transition-all duration-300 ${
                  tab === 'pillars' 
                  ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105' 
                  : 'bg-card-bg text-text border border-border hover:border-primary/50 hover:text-primary'
                }`}
              >
                12 Feature Pillars
              </button>
              <button 
                onClick={() => setTab('compare')}
                className={`px-8 py-3 rounded-full font-heading font-bold text-sm transition-all duration-300 ${
                  tab === 'compare' 
                  ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-105' 
                  : 'bg-card-bg text-text border border-border hover:border-primary/50 hover:text-primary'
                }`}
              >
                vs Competitors
              </button>
            </div>

            {/* Scrollytelling Features */}
            {tab === 'pillars' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PILLARS.map((p, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-50px" }}
                    transition={{ delay: i * 0.05 }}
                    className="glass-card p-8 group hover:-translate-y-2 transition-transform duration-300"
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${p.bg} ${p.color} group-hover:scale-110 transition-transform duration-300`}>
                      <p.icon className="w-7 h-7" />
                    </div>
                    <h3 className="text-xl font-heading font-bold mb-3 text-text">{p.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{p.desc}</p>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Comparison Table */}
            {tab === 'compare' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card overflow-hidden p-0 border border-border shadow-2xl rounded-2xl"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead>
                      <tr className="bg-gradient-to-r from-primary to-indigo-600">
                        <th className="p-5 text-white font-heading font-bold text-sm uppercase tracking-wider w-1/4">Feature</th>
                        <th className="p-5 text-white font-heading font-bold text-base flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5"/> LocalSampark
                        </th>
                        <th className="p-5 text-white/80 font-heading font-semibold text-sm">Aggregators</th>
                        <th className="p-5 text-white/80 font-heading font-semibold text-sm">Social Media</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {COMPARE.map((row, i) => (
                        <tr key={i} className="hover:bg-primary/5 transition-colors">
                          <td className="p-5 text-sm font-semibold text-text">{row.feature}</td>
                          <td className="p-5 text-sm font-bold text-primary flex items-center gap-2">
                            {row.ls.includes('0%') || row.ls.includes('Direct') || row.ls.includes('Integrated') || row.ls.includes('Verified') || row.ls.includes('Configurable') ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                            {row.ls}
                          </td>
                          <td className="p-5 text-sm text-text-muted">
                            <span className="flex items-center gap-2">
                              {row.agg.includes('High') || row.agg.includes('Hidden') || row.agg.includes('Not') ? <X className="w-4 h-4 text-red-400" /> : <div className="w-4 h-4" />}
                              {row.agg}
                            </span>
                          </td>
                          <td className="p-5 text-sm text-text-muted">
                            <span className="flex items-center gap-2">
                              {row.social.includes('Unorganized') || row.social.includes('spam') || row.social.includes('Not') ? <X className="w-4 h-4 text-red-400" /> : <div className="w-4 h-4" />}
                              {row.social}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 bg-section-alt border-y border-border">
          <div className="container text-center">
            <h2 className="text-4xl lg:text-5xl font-heading font-black mb-6">Ready to Join LocalSampark?</h2>
            <p className="text-lg text-text-muted mb-10 max-w-2xl mx-auto">Serving Dhanori, Pune — expanding to 25 zones by Q4 2026. Be part of the neighborhood revolution.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="shadow-xl shadow-primary/20 hover:-translate-y-1">
                Download the App
              </Button>
              <Button size="lg" variant="secondary" className="hover:-translate-y-1 bg-white dark:bg-card-bg">
                Become a Partner
              </Button>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
