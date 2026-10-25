'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import FloatingDevDock from './components/FloatingDevDock';
import { motion, useScroll, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, Store, Wrench, Building2, Package, Car, 
  Home, HandCoins, ArrowRight, ShieldCheck, Zap, HeartHandshake, Map,
  Download, UserPlus, ShoppingBag, Truck, Activity, MapPin, Users,
  Clock, CheckCircle, Star, TrendingUp, Smartphone, Sparkles, Leaf,
  ChevronRight, Eye
} from 'lucide-react';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { cn } from './components/ui/Button';
import { StoreIcon, CommunityIcon, DeliveryIcon, ProduceIcon } from './components/ui/RichIcons';
import { useLanguage } from './components/LanguageToggle';
import PlatformMap, { PlatformRail } from './components/PlatformMap';
import { API_BASE } from '@/lib/api';

// ── Data ──────────────────────────────────────────────────────

const PILLARS = [
  { 
    title: 'pillar_community', 
    iconComp: <CommunityIcon size={48} />, 
    link: '/community', 
    desc: 'pillar_community_desc',
    badge: '💬 Community',
    gradient: 'from-rose-500/20 via-pink-500/10 to-transparent',
    borderHover: 'hover:border-rose-500/40',
    span: 'col-span-2 row-span-2',
  },
  { 
    title: 'pillar_shops', 
    iconComp: <StoreIcon size={48} />, 
    link: '/shops', 
    desc: 'pillar_shops_desc',
    badge: '🏪 Local shops',
    gradient: 'from-orange-500/20 via-amber-500/10 to-transparent',
    borderHover: 'hover:border-orange-500/40',
    span: 'col-span-2',
  },
  { 
    title: 'pillar_hyperlocal', 
    iconComp: <DeliveryIcon size={48} />, 
    link: '/download', 
    desc: 'pillar_hyperlocal_desc',
    badge: '🚚 Local delivery',
    gradient: 'from-violet-500/20 via-purple-500/10 to-transparent',
    borderHover: 'hover:border-violet-500/40',
    span: '',
  },
  { 
    title: 'pillar_fresh', 
    iconComp: <ProduceIcon size={48} />, 
    link: '/shops?category=fresh', 
    desc: 'pillar_fresh_desc',
    badge: '🌿 Fresh produce',
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent',
    borderHover: 'hover:border-emerald-500/40',
    span: '',
  },
  { 
    title: 'pillar_society', 
    icon: Home, 
    link: '/society', 
    desc: 'pillar_society_desc',
    badge: '🏘️ Societies',
    gradient: 'from-indigo-500/20 via-blue-500/10 to-transparent',
    borderHover: 'hover:border-indigo-500/40',
    span: '',
  },
  { 
    title: 'pillar_real_estate', 
    icon: Building2, 
    link: '/properties', 
    desc: 'pillar_real_estate_desc',
    badge: '🏢 Real estate',
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent',
    borderHover: 'hover:border-amber-500/40',
    span: '',
  },
  { 
    title: 'pillar_earn', 
    icon: HandCoins, 
    link: '/earn', 
    desc: 'pillar_earn_desc',
    badge: '💼 Earn',
    gradient: 'from-green-500/20 via-emerald-500/10 to-transparent',
    borderHover: 'hover:border-green-500/40',
    span: 'col-span-2',
  },
];

// ── 3D Tilt Card Component ──────────────────────────────────

function BentoCard({ pillar, index }) {
  const { t } = useLanguage();
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });

  const handleMouseMove = useCallback((e) => {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  const IconComp = pillar.icon;

  return (
    <motion.a
      ref={cardRef}
      href={pillar.link}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className={cn(
        "glass-card-v2-light group cursor-pointer block relative p-6 lg:p-8",
        "hover:scale-[1.02] transition-all duration-300",
        pillar.span,
        pillar.borderHover
      )}
    >
      {/* Background gradient overlay */}
      <div className={`absolute inset-0 rounded-[inherit] bg-gradient-to-br ${pillar.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-500`} />
      
      {/* Badge pill */}
      {pillar.badge && (
        <div className="absolute top-4 right-4 badge-pill-glow bg-white/80 text-[10px] text-slate-900 font-black z-10">
          {pillar.badge}
        </div>
      )}

      <div className="relative z-10" style={{ transform: 'translateZ(20px)' }}>
        {/* Icon */}
        <div className="mb-5">
          {pillar.iconComp || (
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center glow-ring">
              <IconComp className="w-7 h-7 text-primary" />
            </div>
          )}
        </div>

        <h3 className="text-xl font-heading font-bold mb-2 text-text group-hover:text-primary transition-colors">
          {t(pillar.title)}
        </h3>
        <p className="text-sm text-text-muted leading-relaxed flex-1">{t(pillar.desc)}</p>
        
        <div className="mt-5 flex items-center text-sm font-semibold text-primary opacity-0 -translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
          Explore <ArrowRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </motion.a>
  );
}

// ── Main Page ────────────────────────────────────────────────

export default function HomePage() {
  const { t } = useLanguage();
  // Real counts from GET /public/stats. This was an animation counting up to 12,450 neighbours,
  // 347 shops and "₹120k commission saved" whatever the real numbers were.
  const [stats, setStats] = useState({ neighbors: 0, shops: 0, zones: [] });
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/public/stats`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d) setStats({ neighbors: d.neighbors || 0, shops: d.shops || 0, zones: d.zones || [] }); })
      .catch(() => { /* leave the counters hidden */ });
    return () => { alive = false; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background mesh-gradient-bg selection:bg-primary/30 overflow-x-hidden" ref={containerRef}>
      <Header />

      <main id="main-content" tabIndex="-1" className="flex-1 focus:outline-none">
        {/* ══════════════════════════════════════════════════════════
            HERO SECTION — Spatial Design with Mesh Gradient
           ══════════════════════════════════════════════════════════ */}
        <section className="relative pt-20 pb-10 lg:pt-24 lg:pb-14 overflow-hidden">
          {/* Animated mesh gradient orbs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] animate-blobBounce" />
            <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-secondary/15 blur-[120px] animate-blobBounce" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-[10%] left-[30%] w-[30%] h-[30%] rounded-full bg-violet-500/10 blur-[100px] animate-blobBounce" style={{ animationDelay: '5s' }} />
          </div>

          <div className="container relative z-10">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
              
              {/* Hero Content */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="max-w-2xl"
                style={{ y: heroY, opacity: heroOpacity }}
              >
                <Badge variant="success" pulse className="mb-6 px-4 py-1.5 text-sm shimmer-hover">
                  <span className="status-dot-live mr-2"></span>
                  {t('hero_badge')}
                </Badge>
                
                <h1 className="text-5xl lg:text-7xl font-heading font-black tracking-tight leading-[1.1] mb-6 text-text">
                  {t('hero_main_title').split(',')[0]}, <br/>
                  <span className="gradient-text-v2">
                    {t('hero_main_title').split(',')[1] || 'Connected.'}
                  </span>
                </h1>
                
                <p className="text-lg lg:text-xl text-text-muted mb-8 leading-relaxed max-w-xl">
                  {t('hero_main_sub')}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mb-10">
                  <Button asChild size="lg" icon={ArrowRight} iconPosition="right" className="w-full sm:w-auto shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/40 hover:-translate-y-1 shimmer-hover">
                    <a href="/download">{t('hero_btn_download')}</a>
                  </Button>
                  <Button asChild size="lg" variant="secondary" icon={Store} className="w-full sm:w-auto hover:-translate-y-1">
                    <a href="/register">{t('hero_btn_register')}</a>
                  </Button>
                </div>

                {/* Was three micro-stats — 0% commission, 2hrs delivery, 25+
                    zones — which repeated three of the four counters in the
                    stats ticker immediately below and told a first-time
                    visitor nothing about what the app actually does. The rail
                    puts the platform's breadth in the first viewport, which
                    was the audit's central finding about this page. */}
                <PlatformRail />
              </motion.div>

              {/* Hero Visual — 3D App Feature Showcase */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.2 }}
                className="relative h-[360px] lg:h-[500px] w-full rounded-3xl overflow-hidden"
              >
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 rounded-3xl" />
                <div className="absolute top-[20%] left-[30%] w-[200px] h-[200px] rounded-full bg-primary/20 blur-[80px]" />
                <div className="absolute bottom-[20%] right-[20%] w-[200px] h-[200px] rounded-full bg-secondary/20 blur-[80px]" />
                
                {/* Central Phone Mockup */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[220px] h-[420px] glass-card-v2-light rounded-[2rem] border-2 border-white/30 shadow-2xl overflow-hidden">
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
                  className="absolute top-10 right-10 glass-card-v2-light p-3 flex items-center gap-3 rounded-2xl shadow-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center"><ShieldCheck className="w-5 h-5"/></div>
                  <div>
                    <p className="text-xs font-bold text-text">Verified Neighbor</p>
                    <p className="text-[10px] text-text-muted">Phone OTP sign-in</p>
                  </div>
                </motion.div>

                <motion.div 
                  animate={{ y: [10, -10, 10] }} transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-10 left-10 glass-card-v2-light p-3 flex items-center gap-3 rounded-2xl shadow-2xl"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/20 text-primary flex items-center justify-center"><Zap className="w-5 h-5"/></div>
                  <div>
                    <p className="text-xs font-bold text-text">Fast Delivery</p>
                    <p className="text-[10px] text-text-muted">From shops nearby</p>
                  </div>
                </motion.div>

              </motion.div>

            </div>
          </div>
        </section>

        {stats.zones.length > 0 && (
          <section className="py-16 bg-background overflow-hidden">
            <div className="container text-center">
              <h2 className="text-3xl font-heading font-black mb-6">Active <span className="gradient-text-v2">Zones</span></h2>
              <div className="flex flex-wrap justify-center gap-3">
                {stats.zones.map((z) => (
                  <span key={z} className="px-4 py-2 rounded-full border border-border bg-background-alt font-semibold">{z}</span>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ══════════════════════════════════════════════════════════
            PLATFORM MAP — what this app actually is
            Placed directly under the hero, above the stats ticker. The audit's
            central finding about this page was that a first-time visitor saw a
            hero, a download button and three counters — a delivery-app first
            impression for a platform running 24 verticals. The bento grid that
            named those verticals sat below the fold, behind three overlays.
           ══════════════════════════════════════════════════════════ */}
        <PlatformMap />

        {/* ══════════════════════════════════════════════════════════
            STATS TICKER — Animated Counter
           ══════════════════════════════════════════════════════════ */}
        <section className="py-10 border-y border-border bg-background-alt/50 backdrop-blur-sm relative z-20">
          <div className="container">
            <div className="flex flex-wrap justify-center lg:justify-between items-center gap-8 text-center">
              {[
                stats.neighbors > 0 && { val: stats.neighbors.toLocaleString('en-IN'), label: 'Neighbors joined' },
                stats.shops > 0 && { val: stats.shops.toLocaleString('en-IN'), label: 'Local Shops' },
                stats.zones.length > 0 && { val: String(stats.zones.length), label: stats.zones.length === 1 ? 'Active Zone' : 'Active Zones' },
              ].filter(Boolean).map((s, i) => (
                <motion.div 
                  key={s.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex-1 min-w-[150px]"
                >
                  <h3 className="text-4xl lg:text-5xl font-heading font-black gradient-text-v2 mb-1">{s.val}</h3>
                  <p className="text-sm text-text-muted font-medium uppercase tracking-wider">{s.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            3D BENTO GRID — 8 Pillars with Tilt Effect
           ══════════════════════════════════════════════════════════ */}
        <section className="py-24 relative" id="features">
          <div className="container">
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4 border-primary/20 text-primary uppercase tracking-widest text-xs px-3 py-1">Ecosystem</Badge>
              <h2 className="text-4xl lg:text-5xl font-heading font-black text-text mb-4">
                {t('sec_what_is')} <span className="gradient-text-v2">LocalSampark</span>
              </h2>
              <p className="text-lg text-text-muted">{t('sec_what_is_desc')}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5" style={{ perspective: '1200px' }}>
              {PILLARS.map((pillar, i) => (
                <BentoCard key={i} pillar={pillar} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════
            HOW IT WORKS — Step Timeline
           ══════════════════════════════════════════════════════════ */}
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
                  <div className={`w-24 h-24 mx-auto rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white shadow-lg mb-6 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-300 glow-ring`}>
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

        {/* ══════════════════════════════════════════════════════════
            CTA BANNER — 3D Glass with Shimmer Download Button
           ══════════════════════════════════════════════════════════ */}
        <section className="py-32 relative overflow-hidden isolate">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-indigo-600 to-secondary -z-10" />
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 -z-10 mix-blend-overlay" />
          <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-white/10 blur-[100px] animate-blobBounce -z-10" />
          <div className="absolute bottom-[10%] right-[15%] w-[250px] h-[250px] rounded-full bg-indigo-500/20 blur-[80px] animate-blobBounce -z-10" style={{ animationDelay: '3s' }} />
          
          <div className="container relative z-10">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="glass-card-v2 p-12 lg:p-20 text-center max-w-5xl mx-auto rounded-3xl"
            >
              <div className="w-20 h-20 mx-auto bg-white/10 rounded-2xl flex items-center justify-center mb-8 backdrop-blur-md glow-ring border border-white/20">
                <Map className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-4xl lg:text-6xl font-heading font-black text-white mb-6 tracking-tight leading-tight">
                Join the Dhanori Movement
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                Download LocalSampark and transform how your community shops, talks, and earns together.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="bg-white text-primary hover:bg-white/90 hover:-translate-y-1 shadow-xl text-lg px-8 shimmer-hover">
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
      <FloatingDevDock />
    </div>
  );
}
