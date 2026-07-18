'use client';
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Crown, CheckCircle2, Zap, Star, ShieldCheck, Percent, Truck } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

export default function PremiumPage() {
  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-12 lg:py-20 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="container max-w-6xl relative z-10">
          
          <div className="text-center mb-16">
            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 text-white shadow-2xl shadow-purple-500/30 mb-6">
                <Crown className="w-10 h-10" />
            </motion.div>
            <h1 className="text-4xl md:text-6xl font-heading font-black mb-6 bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              SamparkPlus
            </h1>
            <p className="text-text-muted max-w-2xl mx-auto text-lg md:text-xl">
              Elevate your local experience. Zero convenience fees, free deliveries, and exclusive neighborhood deals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            
            {/* Free Plan */}
            <div className="glass-card p-8 rounded-[2rem] border border-border bg-background shadow-sm flex flex-col">
                <div className="mb-8">
                    <h3 className="text-xl font-bold text-text-muted mb-2">Basic Member</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-text">₹0</span>
                        <span className="text-text-muted font-bold">/ forever</span>
                    </div>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                    {[
                        'Access all local shops',
                        'Standard delivery fees (₹30-50)',
                        'Community forum access',
                        'Earn base SamparkCoins',
                        'Basic support'
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="font-medium text-text">{feature}</span>
                        </div>
                    ))}
                </div>

                <Button variant="outline" className="w-full py-6 text-lg rounded-2xl">Current Plan</Button>
            </div>

            {/* Premium Plan */}
            <motion.div initial={{ y: 20 }} animate={{ y: 0 }} className="glass-card p-8 rounded-[2rem] border-2 border-purple-500 bg-background shadow-2xl shadow-purple-500/20 flex flex-col relative transform md:-translate-y-4">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                    Recommended
                </div>

                <div className="mb-8">
                    <h3 className="text-xl font-bold text-purple-600 mb-2 flex items-center gap-2"><Crown className="w-5 h-5"/> SamparkPlus</h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-black text-text">₹199</span>
                        <span className="text-text-muted font-bold">/ month</span>
                    </div>
                </div>

                <div className="space-y-4 mb-8 flex-1">
                    {[
                        { text: 'Zero convenience fees on bills', icon: Percent },
                        { text: 'Free delivery on orders ₹500+', icon: Truck },
                        { text: 'Premium verified badge', icon: ShieldCheck },
                        { text: 'Exclusive flash deals (Save up to 40%)', icon: Star },
                        { text: '2x SamparkCoins earning rate', icon: Zap }
                    ].map((feature, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600">
                                <feature.icon className="w-3.5 h-3.5" />
                            </div>
                            <span className="font-bold text-text">{feature.text}</span>
                        </div>
                    ))}
                </div>

                <Button className="w-full py-6 text-lg rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-xl shadow-purple-500/30 border-none">
                    Upgrade to Plus
                </Button>
            </motion.div>

          </div>

          {/* Exclusive Deals Section */}
          <div className="mt-24">
            <div className="text-center mb-12">
                <h2 className="text-3xl font-black mb-4">Exclusive Plus Deals</h2>
                <p className="text-text-muted">Available only for SamparkPlus members in Dhanori.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { shop: 'FreshMart Supermarket', offer: 'Flat 15% OFF', desc: 'On all groceries above ₹1000' },
                    { shop: 'Glow Salon & Spa', offer: 'Buy 1 Get 1', desc: 'On all premium haircuts and styling' },
                    { shop: 'Dhanori Diagnostics', offer: 'Free Home Collection', desc: 'Plus 10% discount on total bill' },
                ].map((deal, i) => (
                    <div key={i} className="glass-card p-6 rounded-3xl border border-purple-500/20 bg-background relative overflow-hidden group hover:-translate-y-1 transition-transform">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" />
                        <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 mb-4 inline-block">Plus Exclusive</Badge>
                        <h4 className="text-2xl font-black text-text mb-2">{deal.offer}</h4>
                        <p className="font-bold text-sm mb-1">{deal.shop}</p>
                        <p className="text-xs text-text-muted">{deal.desc}</p>
                    </div>
                ))}
            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
