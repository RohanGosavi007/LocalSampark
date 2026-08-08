'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { ProgressBar } from '../components/ui/ProgressBar';
import { SERVICE_CATEGORIES as SERVICES } from '../services/page';
import {
  Wallet, Building2, Car, HeartPulse, Package, Zap, Gift,
  Star, CalendarDays, PawPrint, Megaphone, ShoppingCart, PartyPopper,
  AlertTriangle, MessageCircle, ChevronRight, Bell, TrendingUp,
  Clock, MapPin, Briefcase, CheckCircle, Eye, ArrowRight, Sparkles
} from 'lucide-react';
import StoriesRow from '../components/StoriesRow';

// Map service IDs to lucide icons
const SERVICE_ICON_MAP = {
  laundry: Package, logistics: Car, maid: Sparkles, carwash: Car,
  parcel: Package, water: Sparkles, wfh: Zap, catering: Sparkles,
};

const ICON_MAP = {
  'My Wallet': Wallet,
  'Society': Building2,
  'Carpool': Car,
  'Health SOS': HeartPulse,
  'My Orders': Package,
  'Jobs': Briefcase,
  'Earn Now': Zap,
  'Refer & Earn': Gift,
  'SamparkPlus': Star,
  'Events': CalendarDays,
};

const COLOR_MAP = {
  'My Wallet': 'from-indigo-500 to-violet-600',
  'Society': 'from-emerald-500 to-green-600',
  'Carpool': 'from-orange-500 to-amber-600',
  'Health SOS': 'from-red-500 to-rose-600',
  'My Orders': 'from-sky-500 to-cyan-600',
  'Jobs': 'from-blue-500 to-indigo-600',
  'Earn Now': 'from-violet-500 to-purple-600',
  'Refer & Earn': 'from-emerald-500 to-teal-600',
  'SamparkPlus': 'from-amber-500 to-yellow-600',
  'Events': 'from-pink-500 to-rose-600',
};

const FEED_ICON_MAP = {
  alert: AlertTriangle,
  deal: ShoppingCart,
  event: PartyPopper,
  carpool: Car,
  lost: PawPrint,
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState('feed');
  const [selectedService, setSelectedService] = useState(null);
  const [requestSent, setRequestSent] = useState(false);

  const handleBook = (service) => { setSelectedService(service); setRequestSent(false); };
  const confirmBooking = (e) => { e.preventDefault(); setRequestSent(true); };

  const [walletBalance] = useState(1250.50);
  const [orders] = useState([
    { id: '#LS-2041', shop: 'Sharma Grocery', items: 'Milk × 2, Bread × 1', amount: '₹88', status: 'Delivered', date: 'Today, 10:30 AM' },
    { id: '#LS-2039', shop: 'Golden Crumb Bakery', items: 'Chocolate Cake × 1', amount: '₹420', status: 'Out for Delivery', date: 'Today, 9:15 AM' },
    { id: '#LS-2034', shop: 'Pune Pharmacy', items: 'Crocin × 2, Vitamin C', amount: '₹210', status: 'Delivered', date: 'Yesterday' },
  ]);

  const [appointments] = useState([
    { id: 'apt1', shop: 'Glow & Glamour Salon', service: 'Premium Haircut', date: 'Today, 11:00 AM', status: 'Confirmed' }
  ]);

  const [jobsList] = useState([
    { id: 'j1', title: 'Need Electrician for AC repair', location: 'Dhanori', salary: '₹500 - ₹800', type: 'One-time' },
    { id: 'j2', title: 'Part-time Delivery Boy', location: 'Viman Nagar', salary: '₹8,000/mo', type: 'Part-time' },
    { id: 'j3', title: 'Math Tutor for 10th Std', location: 'Lohegaon', salary: '₹3,000/mo', type: 'Part-time' },
  ]);

  const feedItems = [
    { id: 1, type: 'alert', title: 'Society Security Alert', text: 'Unknown vehicle spotted near Gate B. Report to security at ext. 201.', time: '2 min ago', priority: 'high' },
    { id: 2, type: 'deal', title: 'Sharma Grocery Flash Deal', text: 'Fresh organic Paneer arrived! ₹80 per 200g. Only 20 units left.', time: '15 min ago', priority: 'low' },
    { id: 3, type: 'event', title: 'Ganesh Festival Community Puja', text: 'Dhanori Residents Welfare Association invites everyone. Saturday, 6 PM at Society Ground.', time: '1 hr ago', priority: 'low' },
    { id: 4, type: 'carpool', title: 'Carpool to Hinjewadi', text: 'Rohan Patil offering ride to Hinjewadi Phase 1. Departure 8:45 AM. 2 seats left.', time: '2 hrs ago', priority: 'low' },
    { id: 5, type: 'lost', title: 'Lost Pet: Coco (Tabby Cat)', text: 'Last seen near Goodwill Square. Brown fur, orange collar. Please contact Priya: 98765-43210.', time: '3 hrs ago', priority: 'medium' },
  ];

  const quickLinks = [
    { label: 'My Wallet', href: '/wallet', sub: `₹${walletBalance.toLocaleString()}` },
    { label: 'Society', href: '/society', sub: 'Gate Pass & Notices' },
    { label: 'Carpool', href: '/carpool', sub: '3 rides nearby' },
    { label: 'Health SOS', href: '/health', sub: 'Emergency & Hospitals' },
    { label: 'My Orders', href: '/order-tracking', sub: `${orders.length} recent` },
    { label: 'Jobs', href: '/jobs', sub: '12 new gigs' },
    { label: 'Earn Now', href: '/earn', sub: 'Gigs & Referrals' },
    { label: 'Refer & Earn', href: '/referral', sub: '₹50 per neighbor' },
    { label: 'SamparkPlus', href: '/premium', sub: '₹99/mo benefits' },
    { label: 'Events', href: '/events', sub: '2 upcoming' },
  ];

  const priorityConfig = {
    high: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20' },
    medium: { color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
    low: { color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/10' },
  };

  const statusColors = {
    'Delivered': 'text-accent bg-accent/10',
    'Out for Delivery': 'text-amber-500 bg-amber-500/10',
    'Confirmed': 'text-blue-500 bg-blue-500/10',
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-24 pb-16">
        <div className="container">

          {/* ── TOP SERVICES ────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <Badge variant="primary" pulse className="mb-4 px-4 py-1.5 text-xs uppercase tracking-widest">
              On-Demand Services
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-heading font-black text-text mb-2">Neighborhood Services</h1>
            <p className="text-text-muted text-sm max-w-lg mx-auto">Book verified laundry, logistics, maids, or car washers directly in your area.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
            {SERVICES.slice(0, 3).map((s, i) => {
              const IconComp = SERVICE_ICON_MAP[s.value] || Sparkles;
              return (
                <motion.div key={s.value} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                  className="glass-card rounded-2xl border border-border p-6 flex flex-col justify-between group hover:-translate-y-1 hover:shadow-xl hover:border-primary/30 transition-all duration-300"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-primary-light flex items-center justify-center mb-4 text-primary group-hover:scale-110 transition-transform">
                      <IconComp className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-heading font-bold text-text mb-1">{s.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-amber-500 text-xs">★★★★★</span>
                      <span className="text-xs text-text-muted">(4.8 • 120 Reviews)</span>
                    </div>
                    <p className="text-sm text-text-muted leading-relaxed mb-2">{s.desc}</p>
                    <p className="text-xs text-text-muted">Provider: <strong className="text-text">{s.provider}</strong></p>
                  </div>
                  <div className="border-t border-border pt-4 mt-4">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-lg font-heading font-black text-primary">{s.rate}</span>
                      <span className="text-[10px] text-text-muted">{s.commission}</span>
                    </div>
                    <Button onClick={() => handleBook(s)} className="w-full">Book Service</Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="text-center mb-12">
            <a href="/services"><Button variant="secondary">View All Services →</Button></a>
          </div>

          {/* ── WELCOME BANNER ──────────────────────── */}
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-3xl p-8 mb-10 bg-gradient-to-br from-primary via-indigo-500 to-secondary text-white relative overflow-hidden shadow-xl shadow-primary/20"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-white/80 mb-1">Welcome back,</p>
                <h2 className="text-2xl lg:text-3xl font-heading font-black mb-2">Abhi! 👋</h2>
                <p className="text-sm text-white/70">Your neighborhood is buzzing with activity today.</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-3xl font-heading font-black">₹{walletBalance.toLocaleString()}</p>
                  <p className="text-xs text-white/70 mt-1">Wallet Balance</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-heading font-black">3</p>
                  <p className="text-xs text-white/70 mt-1">Notifications</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── STORIES ROW ──────────────────────────── */}
          <StoriesRow />

          {/* ── QUICK LINKS GRID ────────────────────── */}
          <h2 className="text-xl font-heading font-bold text-text mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" /> Quick Access
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-12">
            {quickLinks.map((link, i) => {
              const IconComp = ICON_MAP[link.label] || Star;
              const gradient = COLOR_MAP[link.label] || 'from-primary to-indigo-500';
              return (
                <motion.a key={link.label} href={link.href}
                  initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                  className="glass-card rounded-2xl p-4 border border-border flex flex-col items-center text-center group hover:-translate-y-1 hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center mb-3 text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <IconComp className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-heading font-bold text-text mb-0.5">{link.label}</span>
                  <span className="text-[10px] text-text-muted">{link.sub}</span>
                </motion.a>
              );
            })}
          </div>

          {/* ── TABS: Feed / Jobs / Orders / Appointments ─── */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['feed', 'jobs', 'orders', 'appointments'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 rounded-full text-sm font-heading font-bold transition-all duration-300 ${
                  activeTab === tab
                    ? 'bg-primary text-white shadow-md shadow-primary/30'
                    : 'bg-background-alt text-text-muted border border-border hover:text-primary hover:border-primary/50'
                }`}
              >
                {tab === 'feed' ? 'Community Feed' : tab === 'jobs' ? 'Local Jobs' : tab === 'orders' ? 'Recent Orders' : 'Appointments'}
              </button>
            ))}
          </div>

          {/* ── FEED TAB ───────────────────────────── */}
          {activeTab === 'feed' && (
            <div className="space-y-4 mb-12">
              {feedItems.map((item, i) => {
                const FeedIcon = FEED_ICON_MAP[item.type] || MessageCircle;
                const pConfig = priorityConfig[item.priority] || priorityConfig.low;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                    className={`glass-card rounded-2xl p-5 border ${pConfig.border} hover:shadow-md transition-shadow`}
                  >
                    <div className="flex gap-4">
                      <div className={`w-10 h-10 rounded-xl ${pConfig.bg} flex items-center justify-center shrink-0`}>
                        <FeedIcon className={`w-5 h-5 ${pConfig.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-heading font-bold text-text">{item.title}</h4>
                          <span className="text-[10px] text-text-muted whitespace-nowrap flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {item.time}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted leading-relaxed">{item.text}</p>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── JOBS TAB ───────────────────────────── */}
          {activeTab === 'jobs' && (
            <div className="space-y-4 mb-12">
              {jobsList.map((job, i) => (
                <motion.div key={job.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}
                  className="glass-card rounded-2xl p-5 border border-border hover:shadow-md transition-shadow"
                >
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-sm font-heading font-bold text-text">{job.title}</h4>
                        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                          {job.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-text-muted mt-2">
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location}</span>
                        <span className="flex items-center gap-1 font-semibold text-text"><Wallet className="w-3 h-3 text-primary" /> {job.salary}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              <div className="text-center pt-4">
                <a href="/jobs"><Button variant="secondary">Browse All Jobs →</Button></a>
              </div>
            </div>
          )}

          {/* ── ORDERS TAB ─────────────────────────── */}
          {activeTab === 'orders' && (
            <div className="space-y-3 mb-12">
              {orders.map((order, i) => (
                <motion.div key={order.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-2xl p-5 border border-border hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center text-primary">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-heading font-bold text-text">{order.shop}</p>
                        <p className="text-xs text-text-muted">{order.id} • {order.date}</p>
                      </div>
                    </div>
                    <span className="text-lg font-heading font-black text-text">{order.amount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-muted">{order.items}</p>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[order.status] || 'text-text-muted bg-background-alt'}`}>
                      {order.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* ── APPOINTMENTS TAB ───────────────────── */}
          {activeTab === 'appointments' && (
            <div className="space-y-3 mb-12">
              {appointments.map((apt, i) => (
                <motion.div key={apt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="glass-card rounded-2xl p-5 border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-secondary-light flex items-center justify-center text-secondary">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm font-heading font-bold text-text">{apt.shop}</p>
                        <p className="text-xs text-text-muted">{apt.service} • {apt.date}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusColors[apt.status] || 'text-text-muted bg-background-alt'}`}>
                      {apt.status}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Booking Modal */}
      {selectedService && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
          onClick={() => setSelectedService(null)}
        >
          <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
            className="bg-background rounded-3xl shadow-2xl border border-border max-w-md w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            {requestSent ? (
              <div className="text-center py-4">
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-accent" />
                </div>
                <h3 className="text-lg font-heading font-bold text-accent mb-2">Booking Request Sent!</h3>
                <p className="text-sm text-text-muted mb-4">Our local territory runner is matching you with the provider.</p>
                <Button onClick={() => setSelectedService(null)} className="w-full">Close</Button>
              </div>
            ) : (
              <form onSubmit={confirmBooking} className="space-y-4">
                <h3 className="text-lg font-heading font-bold text-text">Confirm Booking</h3>
                <p className="text-sm text-text-muted">Specify details for <strong className="text-text">{selectedService.name}</strong>.</p>
                <input type="datetime-local" required className="w-full px-4 py-2.5 rounded-xl border border-border bg-background-alt text-text focus:ring-2 focus:ring-primary/30 outline-none" />
                <input placeholder="Flat No, Wing, Society Name" required className="w-full px-4 py-2.5 rounded-xl border border-border bg-background-alt text-text placeholder:text-text-muted focus:ring-2 focus:ring-primary/30 outline-none" />
                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="secondary" onClick={() => setSelectedService(null)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1">Confirm</Button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}

      <Footer />
    </div>
  );
}
