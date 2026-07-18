'use client';
import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  MessageSquare, Store, Wrench, Building2, Package, Car, 
  Home, HandCoins, ArrowRight, ShieldCheck, Zap, HeartHandshake, Map,
  Download, UserPlus, ShoppingBag, Truck, Activity, MapPin, Users,
  Clock, CheckCircle, Star, TrendingUp, Smartphone
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './components/ui/Card';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { cn } from './components/ui/Button';
import { GlassIcon } from './components/ui/GlassIcon';

const TESTIMONIALS = [
  { name: 'Sunita Bhosale', role: 'Housewife', text: 'I ordered vegetables from Sharma Grocery at 8 AM and they arrived by 9:15 AM — fresher than any big app!', zone: 'Dhanori' },
  { name: 'Rohan Patil', role: 'Delivery Runner', text: 'I make ₹14,000 extra every month just working 3 hours after my main job.', zone: 'Viman Nagar' },
  { name: 'Sunil Deshmukh', role: 'Franchise Partner', text: 'As a franchise partner managing 34 shops, I earned ₹42,600 in April alone.', zone: 'Dhanori' },
];

const PILLARS = [
  { 
    title: 'Community & Forums', icon: MessageSquare, link: '/community', 
    desc: 'Share local updates, post stories, create polls, and discuss development.', 
    className: 'bento-col-2 bento-row-2 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 border-indigo-200 dark:border-indigo-800 hover:shadow-[0_8px_30px_rgb(99,102,241,0.2)] hover:-translate-y-2',
    iconColor: 'text-indigo-600 dark:text-indigo-400', iconBg: 'bg-indigo-100 dark:bg-indigo-900/50'
  },
  { 
    title: 'Local Business', icon: Store, link: '/shops', 
    desc: 'Order direct from neighborhood stores with zero commission.', 
    className: 'bento-col-2 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/40 dark:to-red-950/40 border-orange-200 dark:border-orange-800 hover:shadow-[0_8px_30px_rgb(249,115,22,0.2)] hover:-translate-y-2',
    iconColor: 'text-orange-600 dark:text-orange-400', iconBg: 'bg-orange-100 dark:bg-orange-900/50'
  },
  { 
    title: 'Gig Economy', icon: Wrench, link: '/jobs', 
    desc: 'Hire verified local electricians, plumbers, or tutors.', 
    className: 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/40 dark:to-cyan-950/40 border-blue-200 dark:border-blue-800 hover:shadow-[0_8px_30px_rgb(59,130,246,0.2)] hover:-translate-y-2',
    iconColor: 'text-blue-600 dark:text-blue-400', iconBg: 'bg-blue-100 dark:bg-blue-900/50'
  },
  { 
    title: 'Real Estate Hub', icon: Building2, link: '/properties', 
    desc: 'Search for rental apartments, PGs, or commercial spaces.', 
    className: 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200 dark:border-emerald-800 hover:shadow-[0_8px_30px_rgb(16,185,129,0.2)] hover:-translate-y-2',
    iconColor: 'text-emerald-600 dark:text-emerald-400', iconBg: 'bg-emerald-100 dark:bg-emerald-900/50'
  },
  { 
    title: 'Hyperlocal Delivery', icon: Package, link: '/download', 
    desc: 'Send packages across your zone instantly.', 
    className: 'bento-col-2 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 border-pink-200 dark:border-pink-800 hover:shadow-[0_8px_30px_rgb(236,72,153,0.2)] hover:-translate-y-2',
    iconColor: 'text-pink-600 dark:text-pink-400', iconBg: 'bg-pink-100 dark:bg-pink-900/50'
  },
  { 
    title: 'Carpool & Travel', icon: Car, link: '/carpool', 
    desc: 'Share daily rides to IT Parks with verified neighbors.', 
    className: 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/40 dark:to-amber-950/40 border-yellow-200 dark:border-yellow-800 hover:shadow-[0_8px_30px_rgb(234,179,8,0.2)] hover:-translate-y-2',
    iconColor: 'text-yellow-600 dark:text-yellow-400', iconBg: 'bg-yellow-100 dark:bg-yellow-900/50'
  },
  { 
    title: 'Society Mgmt', icon: Home, link: '/society', 
    desc: 'Digital visitor passes, notices, and maintenance.', 
    className: 'bg-gradient-to-br from-violet-50 to-fuchsia-50 dark:from-violet-950/40 dark:to-fuchsia-950/40 border-violet-200 dark:border-violet-800 hover:shadow-[0_8px_30px_rgb(139,92,246,0.2)] hover:-translate-y-2',
    iconColor: 'text-violet-600 dark:text-violet-400', iconBg: 'bg-violet-100 dark:bg-violet-900/50'
  },
  { 
    title: 'Earn & Franchise', icon: HandCoins, link: '/earn', 
    desc: 'Become a partner and build recurring income.', 
    className: 'bento-col-2 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 border-green-200 dark:border-green-800 hover:shadow-[0_8px_30px_rgb(34,197,94,0.2)] hover:-translate-y-2',
    iconColor: 'text-green-600 dark:text-green-400', iconBg: 'bg-green-100 dark:bg-green-900/50'
  },
];

export default function HomePage() {
  const [stats, setStats] = useState({ neighbors: 1000, shops: 50, gigs: 10, commission: 5000 });
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        neighbors: prev.neighbors < 12450 ? prev.neighbors + 230 : 12450,
        shops: prev.shops < 347 ? prev.shops + 7 : 347,
        gigs: prev.gigs < 78 ? prev.gigs + 2 : 78,
        commission: prev.commission < 120000 ? prev.commission + 2500 : 120000
      }));
    }, 50);

    const testimonialInterval = setInterval(() => {
      setActiveTestimonial(prev => (prev + 1) % TESTIMONIALS.length);
    }, 5000);

    return () => { clearInterval(interval); clearInterval(testimonialInterval); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/30" ref={containerRef}>
      <Header />

      <main className="flex-1">
        {/* ── HERO ───────────────────────────────────────────── */}
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
          {/* Animated Background Gradients */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-blobBounce" />
            <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-secondary/20 blur-[120px] animate-blobBounce" style={{ animationDelay: '2s' }} />
          </div>

          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* Hero Content */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-2xl"
                style={{ y, opacity }}
              >
                <Badge variant="success" pulse className="mb-6 px-4 py-1.5 text-sm">
                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span>
                  Pilot Live in Dhanori, Pune
                </Badge>
                
                <h1 className="text-5xl lg:text-7xl font-heading font-black tracking-tight leading-[1.1] mb-6 text-text">
                  Your Neighborhood, <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-indigo-500 to-secondary animate-shimmer bg-[length:200%_auto]">
                    Connected.
                  </span>
                </h1>
                
                <p className="text-lg lg:text-xl text-text-muted mb-8 leading-relaxed max-w-xl">
                  LocalSampark is India's most comprehensive hyper-local super-app. Connect with neighbors, find service providers, shop from local stores, list properties, and earn money — all within your own zone.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Button asChild size="lg" icon={ArrowRight} iconPosition="right" className="w-full sm:w-auto shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1">
                    <a href="/download">Download the App</a>
                  </Button>
                  <Button asChild size="lg" variant="secondary" icon={Store} className="w-full sm:w-auto hover:-translate-y-1">
                    <a href="/register">Register Your Shop</a>
                  </Button>
                </div>

                {/* Micro Stats */}
                <div className="flex flex-wrap gap-8 items-center pt-6 border-t border-border/50">
                  <div>
                    <p className="text-3xl font-heading font-black text-text">0%</p>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Commission</p>
                  </div>
                  <div className="w-px h-10 bg-border"></div>
                  <div>
                    <p className="text-3xl font-heading font-black text-text">2hrs</p>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Avg Delivery</p>
                  </div>
                  <div className="w-px h-10 bg-border"></div>
                  <div>
                    <p className="text-3xl font-heading font-black text-text">25+</p>
                    <p className="text-xs text-text-muted uppercase tracking-wider font-semibold">Pune Zones</p>
                  </div>
                </div>
              </motion.div>

              {/* Hero Visual — App Feature Showcase */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative h-[400px] lg:h-[600px] w-full rounded-3xl overflow-hidden border border-border/30"
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
                <div className="absolute top-[20%] left-[30%] w-[200px] h-[200px] rounded-full bg-primary/20 blur-[80px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[200px] h-[200px] rounded-full bg-secondary/20 blur-[80px]" />
                
                {/* Central Phone Mockup */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[220px] h-[420px] bg-background-alt rounded-[2rem] border-2 border-border/50 shadow-2xl shadow-primary/10 overflow-hidden">
                    {/* Phone Header */}
                    <div className="bg-gradient-to-r from-primary to-indigo-500 p-4 pb-8 text-white">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-bold tracking-wider uppercase opacity-80">LocalSampark</p>
                        <div className="flex gap-1"><div className="w-1.5 h-1.5 rounded-full bg-white/60"></div><div className="w-1.5 h-1.5 rounded-full bg-white/60"></div><div className="w-1.5 h-1.5 rounded-full bg-white/60"></div></div>
                      </div>
                      <p className="text-sm font-bold">Good Morning!</p>
                      <p className="text-[10px] opacity-80">Dhanori, Pune</p>
                    </div>
                    {/* Phone Content */}
                    <div className="p-3 -mt-4 space-y-2">
                      {[
                        { name: 'Nearby Shops', color: 'bg-orange-500', count: '347' },
                        { name: 'Active Services', color: 'bg-blue-500', count: '78' },
                        { name: 'Carpool Rides', color: 'bg-green-500', count: '23' },
                        { name: 'Community Posts', color: 'bg-purple-500', count: '156' },
                        { name: 'Events Today', color: 'bg-pink-500', count: '5' },
                      ].map((item) => (
                        <div key={item.name} className="bg-background rounded-xl p-2.5 border border-border/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-lg ${item.color} opacity-80`}></div>
                            <span className="text-[10px] font-bold text-text">{item.name}</span>
                          </div>
                          <span className="text-[10px] font-bold text-primary">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Floating Cards */}
                <motion.div 
                  animate={{ y: [-10, 10, -10] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-10 right-10 bg-background-alt/90 backdrop-blur-xl p-3 flex items-center gap-3 rounded-2xl shadow-2xl border border-border/30"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div>
                  <div>
                    <p className="text-xs font-bold text-text">Verified Neighbor</p>
                    <p className="text-[10px] text-text-muted">Aadhaar + OTP</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [10, -10, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-10 left-10 bg-background-alt/90 backdrop-blur-xl p-3 flex items-center gap-3 rounded-2xl shadow-2xl border border-border/30"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center"><Zap className="w-5 h-5"/></div>
                  <div>
                    <p className="text-xs font-bold text-text">Fast Delivery</p>
                    <p className="text-[10px] text-text-muted">Under 45 mins</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ x: [-8, 8, -8] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-[50%] right-6 bg-background-alt/90 backdrop-blur-xl p-3 flex items-center gap-3 rounded-2xl shadow-2xl border border-border/30"
                >
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center"><Star className="w-5 h-5"/></div>
                  <div>
                    <p className="text-xs font-bold text-text">4.8★ Rating</p>
                    <p className="text-[10px] text-text-muted">12,450 users</p>
                  </div>
                </motion.div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ── STATS TICKER ──────────────────────────────────────── */}
        <section className="py-10 border-y border-border bg-background-alt/50 backdrop-blur-sm relative z-20">
          <div className="container">
            <div className="flex flex-wrap justify-center lg:justify-between items-center gap-8 text-center">
              {[
                { val: `${stats.neighbors.toLocaleString()}+`, label: 'Active Neighbors' },
                { val: `${stats.shops}+`, label: 'Verified Local Shops' },
                { val: `${stats.gigs}+`, label: 'On-Demand Gigs' },
                { val: `₹${(stats.commission / 1000).toFixed(0)}k+`, label: 'Commission Saved' },
              ].map((s, i) => (
                <motion.div 
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-1 min-w-[150px]"
                >
                  <h3 className="text-4xl lg:text-5xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary mb-1">{s.val}</h3>
                  <p className="text-sm text-text-muted font-medium uppercase tracking-wider">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8 PILLARS (BENTO GRID) ─────────────────────────────────────── */}
        <section className="py-24 relative" id="features">
          <div className="container">
            <div className="text-center max-w-3xl mx-auto mb-16">
              <Badge variant="outline" className="mb-4">Platform Architecture</Badge>
              <h2 className="text-4xl lg:text-5xl font-heading font-black tracking-tight mb-4">The 8 Pillars of LocalSampark</h2>
              <p className="text-lg text-text-muted">Everything your community needs, unified under a single platform to boost local trade and strengthen social bonds.</p>
            </div>
            
            <div className="bento-grid">
              {PILLARS.map((pillar, i) => (
                <motion.a 
                  key={i} 
                  href={pillar.link}
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                  className={cn(
                    "bento-item glass-card card-3d group cursor-pointer border",
                    pillar.className
                  )}
                >
                  <GlassIcon 
                    icon={pillar.icon} 
                    className="mb-6" 
                    bgClass={pillar.iconBg || "bg-white/5"} 
                    borderClass="border-white/20 dark:border-white/10" 
                    colorClass={pillar.iconColor || "text-text"}
                  />
                  <h3 className="text-xl font-heading font-bold mb-2 text-text group-hover:text-primary transition-colors">{pillar.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed flex-1">{pillar.desc}</p>
                  
                  <div className={`mt-6 flex items-center text-sm font-semibold opacity-0 -translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 ${pillar.iconColor || 'text-primary'}`}>
                    Explore <ArrowRight className="w-4 h-4 ml-1" />
                  </div>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ──────────────────────────────────── */}
        <section className="py-24 bg-background-alt border-y border-border overflow-hidden">
          <div className="container relative">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-4">Real Voices</Badge>
              <h2 className="text-4xl lg:text-5xl font-heading font-black tracking-tight mb-4">What Pune Says</h2>
              <p className="text-lg text-text-muted">Real residents, shop owners, and earners from Dhanori and beyond.</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {TESTIMONIALS.map((t, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-8 relative group hover:-translate-y-2 transition-all duration-300"
                >
                  <div className="absolute top-4 right-6 text-6xl font-serif text-primary/10 group-hover:text-primary/20 transition-colors">"</div>
                  <p className="text-lg font-medium italic text-text mb-6 relative z-10 leading-relaxed">"{t.text}"</p>
                  <div className="flex items-center gap-4 mt-auto">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white font-bold shadow-md">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-text">{t.name}</p>
                      <p className="text-xs text-text-muted">{t.role} · {t.zone}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ────────────────────────────────── */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="primary" className="mb-4">Simple & Quick</Badge>
              <h2 className="text-4xl lg:text-5xl font-heading font-black tracking-tight mb-4">How It Works</h2>
              <p className="text-lg text-text-muted">Get started in 4 simple steps — from download to delivery.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
              {/* Connection Line */}
              <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary via-secondary to-accent z-0" />

              {[
                { icon: Smartphone, title: 'Download App', desc: 'Get LocalSampark from Play Store or use the web app.', color: 'from-primary to-indigo-500', link: '/download' },
                { icon: UserPlus, title: 'Register & Verify', desc: 'OTP verification with your real address and society.', color: 'from-indigo-500 to-purple-500', link: '/register' },
                { icon: ShoppingBag, title: 'Order or Book', desc: 'Browse shops, services, events, or find carpools.', color: 'from-purple-500 to-secondary', link: '/shops' },
                { icon: Truck, title: 'Delivered!', desc: 'Lightning-fast hyperlocal delivery to your doorstep.', color: 'from-secondary to-accent', link: '/order-tracking' },
              ].map((step, i) => (
                <motion.a href={step.link} key={step.title} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.15 }}
                  className="relative z-10 text-center group block cursor-pointer"
                >
                  <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300`}>
                    <step.icon className="w-10 h-10" />
                  </div>
                  <div className="absolute top-9 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-background border-4 border-primary shadow-lg z-20 hidden md:flex items-center justify-center">
                    <span className="text-[10px] font-black text-primary">{i + 1}</span>
                  </div>
                  <h3 className="text-lg font-heading font-bold text-text mb-2">{step.title}</h3>
                  <p className="text-sm text-text-muted">{step.desc}</p>
                </motion.a>
              ))}
            </div>
          </div>
        </section>

        {/* ── LIVE ACTIVITY FEED ──────────────────────────── */}
        <section className="py-12 bg-background-alt border-y border-border overflow-hidden">
          <div className="container mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold font-heading text-accent uppercase tracking-widest">Live Activity</span>
            </div>
            <p className="text-sm text-text-muted">Real-time activity across the LocalSampark network</p>
          </div>
          <div className="relative">
            <div className="flex gap-6 animate-ticker">
              {[
                { icon: ShoppingBag, text: 'Sunita ordered Fresh Paneer from Sharma Grocery', time: '2 min ago', color: 'text-primary' },
                { icon: Car, text: 'Rohan shared a ride to Hinjewadi — 2 seats filled', time: '5 min ago', color: 'text-orange-500' },
                { icon: Truck, text: 'Delivery completed: Golden Crumb Bakery → Ganga Aria', time: '8 min ago', color: 'text-emerald-500' },
                { icon: Users, text: 'Pooja registered for Neighborhood Clean-Up Drive', time: '12 min ago', color: 'text-purple-500' },
                { icon: Star, text: 'Priya rated Dhanori Auto Washers ★★★★★', time: '15 min ago', color: 'text-amber-500' },
                { icon: CheckCircle, text: 'Plumber dispatched to Pride Aashiyana B-wing', time: '18 min ago', color: 'text-blue-500' },
                { icon: TrendingUp, text: 'Franchise Partner Sunil earned ₹2,400 today', time: '22 min ago', color: 'text-green-500' },
                { icon: Activity, text: '12 new neighbors joined from Tingre Nagar', time: '30 min ago', color: 'text-pink-500' },
                { icon: ShoppingBag, text: 'Sunita ordered Fresh Paneer from Sharma Grocery', time: '2 min ago', color: 'text-primary' },
                { icon: Car, text: 'Rohan shared a ride to Hinjewadi — 2 seats filled', time: '5 min ago', color: 'text-orange-500' },
                { icon: Truck, text: 'Delivery completed: Golden Crumb Bakery → Ganga Aria', time: '8 min ago', color: 'text-emerald-500' },
                { icon: Users, text: 'Pooja registered for Neighborhood Clean-Up Drive', time: '12 min ago', color: 'text-purple-500' },
              ].map((item, i) => (
                <div key={i} className="flex-shrink-0 flex items-center gap-3 glass-card px-5 py-3 rounded-2xl border border-border min-w-[340px]">
                  <div className={`w-8 h-8 rounded-xl bg-background-alt flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-text truncate">{item.text}</p>
                    <p className="text-[10px] text-text-muted flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ZONE MAP ────────────────────────────────────── */}
        <section className="py-24 bg-background overflow-hidden">
          <div className="container">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <Badge variant="secondary" className="mb-4">Growing Network</Badge>
              <h2 className="text-4xl lg:text-5xl font-heading font-black tracking-tight mb-4">Active Zones</h2>
              <p className="text-lg text-text-muted">LocalSampark is expanding across Pune — one neighborhood at a time.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { zone: 'Dhanori', neighbors: '5,200+', shops: 142, status: 'Live', color: 'from-primary to-indigo-500', statusColor: 'bg-green-500' },
                { zone: 'Viman Nagar', neighbors: '3,100+', shops: 98, status: 'Live', color: 'from-orange-500 to-amber-500', statusColor: 'bg-green-500' },
                { zone: 'Tingre Nagar', neighbors: '1,800+', shops: 56, status: 'Live', color: 'from-purple-500 to-pink-500', statusColor: 'bg-green-500' },
                { zone: 'Kharadi', neighbors: '1,200+', shops: 34, status: 'Launching', color: 'from-blue-500 to-cyan-500', statusColor: 'bg-amber-500' },
                { zone: 'Bhairav Nagar', neighbors: '900+', shops: 28, status: 'Live', color: 'from-emerald-500 to-teal-500', statusColor: 'bg-green-500' },
                { zone: 'Lohegaon', neighbors: '450+', shops: 12, status: 'Coming Soon', color: 'from-rose-500 to-red-500', statusColor: 'bg-gray-400' },
              ].map((z, i) => (
                <motion.div key={z.zone} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-2xl border border-border p-6 group hover:-translate-y-2 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${z.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                      <MapPin className="w-6 h-6" />
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${z.statusColor === 'bg-green-500' ? 'bg-green-500/10 text-green-600' : z.statusColor === 'bg-amber-500' ? 'bg-amber-500/10 text-amber-600' : 'bg-gray-400/10 text-gray-500'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${z.statusColor} ${z.statusColor === 'bg-green-500' ? 'animate-pulse' : ''}`} />
                      {z.status}
                    </span>
                  </div>
                  <h3 className="text-xl font-heading font-black text-text mb-3">{z.zone}</h3>
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-lg font-heading font-black text-primary">{z.neighbors}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Neighbors</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div>
                      <p className="text-lg font-heading font-black text-secondary">{z.shops}</p>
                      <p className="text-[10px] text-text-muted uppercase tracking-wider">Shops</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA BANNER ────────────────────────────────────── */}
        <section className="py-32 relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-secondary -z-20" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 -z-10 mix-blend-overlay" />
          
          <div className="container relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-card bg-white/10 backdrop-blur-2xl border-white/20 shadow-2xl p-12 lg:p-20 text-center max-w-5xl mx-auto rounded-3xl"
            >
              <div className="w-20 h-20 mx-auto bg-white/20 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md shadow-inner">
                <Map className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-heading font-black text-white mb-6 tracking-tight leading-tight">
                Join the Dhanori Movement
              </h2>
              <p className="text-xl text-white/90 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                Over 12,450 neighbors already connected. Download LocalSampark and transform how your community shops, talks, and earns together.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 hover:-translate-y-1 shadow-xl text-lg px-8">
                  <a href="/download">Download Now — It's Free</a>
                </Button>
                <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 hover:border-white text-lg px-8 backdrop-blur-sm">
                  <a href="/franchise">Become a Franchise Partner</a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
