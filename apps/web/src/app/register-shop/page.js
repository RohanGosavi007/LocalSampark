'use client';
import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Store, MapPin, UploadCloud, CheckCircle2, StoreIcon } from 'lucide-react';
import { Button } from '../components/ui/Button';

export default function RegisterShopPage() {
  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-12 lg:py-20 relative overflow-hidden">
        {/* Background Decorative */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="container max-w-6xl relative z-10 flex flex-col lg:flex-row gap-12 items-center">
          
          <div className="flex-1">
            <Badge className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 mb-6">Merchant Portal</Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-black mb-6 leading-tight">
              Bring your local store <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Online</span>
            </h1>
            <p className="text-text-muted text-lg mb-8 max-w-lg">
              Set up your digital storefront in minutes. Reach thousands of customers in your neighborhood and manage orders with ease.
            </p>
            
            <div className="space-y-4 mb-8">
              {[
                  'Zero onboarding fees',
                  'Instant payout to your bank',
                  'Dedicated local delivery fleet',
                  'Inventory & Analytics Dashboard'
              ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                      <span className="font-bold text-text">{item}</span>
                  </div>
              ))}
            </div>
            
            <div className="flex gap-4">
                <Button size="lg" className="rounded-2xl px-8 shadow-xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 text-white border-none">
                    Start Onboarding
                </Button>
                <Button size="lg" variant="outline" className="rounded-2xl px-8">
                    Learn More
                </Button>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md lg:max-w-none">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, type: 'spring' }} className="glass-card p-8 rounded-[3rem] border border-border bg-background shadow-2xl relative">
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-white shadow-xl shadow-amber-500/30 transform rotate-12">
                    <Store size={40} />
                </div>
                
                <h3 className="text-2xl font-black mb-6">Quick Registration</h3>
                <form className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-text-muted mb-2">Store Name</label>
                        <input type="text" className="w-full bg-background-alt border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="e.g. Sharma Kirana" />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-muted mb-2">Category</label>
                        <select className="w-full bg-background-alt border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none">
                            <option>Grocery & Staples</option>
                            <option>Pharmacy</option>
                            <option>Electronics</option>
                            <option>Services</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-text-muted mb-2">Location</label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                            <input type="text" className="w-full bg-background-alt border border-border rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" placeholder="Enter shop address" />
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <Button className="w-full rounded-xl py-6 bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 border-none">
                            Create Digital Storefront
                        </Button>
                    </div>
                </form>
            </motion.div>
          </div>
          
        </div>
      </main>
      
      <Footer />
    </div>
  );
}

// Dummy badge component for local use
function Badge({ children, className }) {
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}
