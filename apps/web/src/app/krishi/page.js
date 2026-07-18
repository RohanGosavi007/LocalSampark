'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import MandiTicker from '../components/MandiTicker';
import { useLanguage } from '../components/LanguageToggle';
import { RURAL_CATEGORIES, TOP_FEATURES } from '../data/rural-services';
import { motion } from 'framer-motion';
import { ArrowRight, Leaf, Sprout, Tractor } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

export default function KrishiPage() {
  const { t } = useLanguage();
  const [activeCategory, setActiveCategory] = useState(null);

  const scrollToCategory = (id) => {
    setActiveCategory(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -100;
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <MandiTicker />
      
      <main className="flex-1 overflow-hidden">
        {/* Rural Hero Section */}
        <section className="relative pt-24 pb-20 overflow-hidden bg-gradient-to-br from-green-500/10 to-amber-500/10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/20 rounded-full blur-[100px] animate-blobBounce" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[100px] animate-blobBounce" style={{ animationDelay: '2s' }} />

          <div className="container relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <Badge variant="success" className="mb-6 px-4 py-1.5 text-sm uppercase tracking-widest flex items-center gap-2 mx-auto w-fit">
                <Leaf className="w-4 h-4" /> {t('nav_krishi')}
              </Badge>
              
              <h1 className="text-5xl lg:text-7xl font-heading font-black tracking-tight leading-[1.1] mb-6 text-text max-w-4xl mx-auto">
                {t('hero_krishi_title') || 'Transforming Rural India'}
              </h1>
              
              <p className="text-lg lg:text-xl text-text-muted mb-10 max-w-2xl mx-auto leading-relaxed">
                {t('hero_krishi_sub') || 'Digital marketplace for farmers. Direct Mandi rates, rent equipment, sell produce without middlemen, and access expert advice.'}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="shadow-xl shadow-green-500/20 bg-green-600 hover:bg-green-700 hover:-translate-y-1 text-white border-green-600">
                  Join as Farmer
                </Button>
                <Button size="lg" variant="secondary" className="hover:-translate-y-1">
                  Explore Services
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Top Priority Features */}
        <section className="py-16 bg-background">
          <div className="container">
            <div className="flex items-center gap-3 mb-10">
              <Sprout className="w-8 h-8 text-green-500" />
              <h2 className="text-3xl font-heading font-bold text-text">Trending & Priority Features</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {TOP_FEATURES.map((feature, i) => (
                <motion.a 
                  key={feature.id} 
                  href={feature.path}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 group hover:-translate-y-2 transition-all duration-300 relative overflow-hidden"
                  style={{ borderTop: `4px solid ${feature.color}` }}
                >
                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 group-hover:scale-150 transition-all duration-500">
                    <span className="text-6xl">{feature.icon}</span>
                  </div>
                  <div className="text-4xl mb-4 relative z-10">{feature.icon}</div>
                  <h3 className="text-xl font-heading font-bold text-text mb-2 relative z-10">{t(feature.title_key)}</h3>
                  <p className="text-sm text-text-muted leading-relaxed relative z-10">{t(feature.desc_key)}</p>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* Sticky Category Navigation */}
        <div className="sticky top-[72px] bg-background/80 backdrop-blur-md border-b border-border z-40 shadow-sm">
          <div className="container py-4 flex gap-3 overflow-x-auto no-scrollbar scroll-smooth">
            {RURAL_CATEGORIES.map(cat => (
              <button 
                key={cat.id} 
                onClick={() => scrollToCategory(cat.id)}
                className={`px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-300 ${
                  activeCategory === cat.id 
                  ? 'bg-green-600 text-white shadow-lg shadow-green-600/30' 
                  : 'bg-card-bg text-text border border-border hover:border-green-500/50 hover:text-green-600'
                }`}
              >
                {t(cat.title_key)}
              </button>
            ))}
          </div>
        </div>

        {/* All Categories Grid */}
        <section className="py-16 bg-section-alt">
          <div className="container">
            <div className="space-y-24">
              {RURAL_CATEGORIES.map((cat, idx) => (
                <motion.div 
                  key={cat.id} 
                  id={cat.id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ duration: 0.5 }}
                >
                  <h2 className="text-3xl font-heading font-black mb-8 flex items-center gap-4 text-text">
                    <span className="w-4 h-8 rounded-full" style={{ background: cat.color }}></span>
                    {t(cat.title_key)}
                  </h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {cat.features.map((feature) => (
                      <a key={feature.id} href={feature.path} className="group outline-none">
                        <div className="glass-card p-8 h-full border-t-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center flex flex-col items-center" style={{ borderTopColor: cat.color }}>
                          <div className="w-20 h-20 bg-background/50 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl mb-6 shadow-sm group-hover:scale-110 transition-transform duration-300">
                            {feature.icon}
                          </div>
                          <h3 className="text-xl font-heading font-bold text-text mb-3 group-hover:text-green-600 transition-colors">
                            {t(feature.title_key)}
                          </h3>
                          <p className="text-sm text-text-muted leading-relaxed">
                            {t(feature.desc_key)}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-br from-green-600 to-emerald-800 relative overflow-hidden text-center">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
          <div className="container relative z-10">
            <Tractor className="w-16 h-16 text-white/80 mx-auto mb-6" />
            <h2 className="text-4xl lg:text-5xl font-heading font-black text-white mb-6">Are you a rural entrepreneur?</h2>
            <p className="text-xl text-green-100 max-w-2xl mx-auto mb-10 font-medium">
              Become a Zone Franchise in your Taluka and help farmers go digital while building a sustainable business.
            </p>
            <Button size="lg" className="bg-white text-green-700 hover:bg-green-50 border-white text-lg px-8 shadow-xl hover:-translate-y-1">
              View Franchise Details
            </Button>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
