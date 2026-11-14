'use client';
import React, { useState, useEffect } from 'react';
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
import WebRTCIntercom from '../../components/WebRTCIntercom';
import { useAuth } from '@/context/AuthContext';
import { apiGet } from '@/lib/api';
import { useVisibleLinks } from '@/lib/useFeatureRegistry';
import PlatformMap from '../components/PlatformMap';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('feed');


  // Was a hardcoded "Abhi!" regardless of who was signed in or what time it
  // was. A dashboard that greets everyone by the same name is worse than no
  // greeting at all.
  const greeting = React.useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);
  const firstName = (user?.name || '').trim().split(' ')[0];

  // Everything on this page comes from the API. It used to be local placeholder state: a wallet
  // of ₹1,250.50, three orders from named shops, a salon appointment, three jobs, five feed
  // items (a lost cat with a phone number), "3 rides nearby" and "12 new gigs".
  const [walletBalance, setWalletBalance] = useState(null);
  const [orders, setOrders] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [jobsList, setJobsList] = useState([]);
  const [feedItems, setFeedItems] = useState([]);
  const [failed, setFailed] = useState({});

  useEffect(() => {
    if (!user) return undefined;
    let alive = true;
    const day = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
    const label = (v) => { const t = String(v || 'pending').replace(/_/g, ' '); return t.charAt(0).toUpperCase() + t.slice(1); };
    const list = (r) => (Array.isArray(r) ? r : (r && (r.data || r.rows || r.posts)) || []);
    const jobs = [
      ['wallet', apiGet('/wallet/history'), (r) => setWalletBalance(typeof r.balance === 'number' ? r.balance : null)],
      ['orders', apiGet('/orders/my-orders'), (r) => setOrders(list(r).slice(0, 10).map((o) => ({
        id: `#${String(o.id).slice(0, 8)}`, shop: o.shop_name, amount: `₹${Number(o.total_amount) || 0}`,
        items: Number(o.items_count) ? `${o.items_count} item${Number(o.items_count) === 1 ? '' : 's'}` : '',
        status: label(o.status), date: day(o.created_at),
      })))],
      ['appointments', apiGet('/services/my-bookings'), (r) => setAppointments(list(r).slice(0, 10).map((b) => ({
        id: b.id, shop: b.provider || 'Service provider', service: b.service_name || 'Service', date: day(b.scheduled_time), status: label(b.status),
      })))],
      ['jobs', apiGet('/jobs-board'), (r) => setJobsList(list(r).slice(0, 10).map((j) => ({
        id: j.id, title: j.title, location: j.location, salary: j.salary_range || '', type: label(j.job_type),
      })))],
      ['feed', apiGet('/feed/posts?limit=10'), (r) => setFeedItems(list(r).map((p) => ({
        id: p.id, type: p.post_type === 'alert' ? 'alert' : 'post', title: p.full_name || 'Neighbour',
        text: p.content || '', time: day(p.created_at), priority: p.post_type === 'alert' ? 'high' : 'low',
      })))],
    ];
    jobs.forEach(([key, request, apply]) => {
      request.then((r) => { if (alive) apply(r || {}); }).catch(() => { if (alive) setFailed((f) => ({ ...f, [key]: true })); });
    });
    return () => { alive = false; };
  }, [user]);

  const money = (n) => (n === null ? '—' : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

  // Only modules that are on (the live registry): the dashboard listed Wallet,
  // Society, Carpool, Jobs and more, each leading to "Coming soon" at launch.
  const visibleLinks = useVisibleLinks();

  const quickLinks = visibleLinks([
    { label: 'My Wallet', href: '/wallet', sub: money(walletBalance) },
    { label: 'Society', href: '/society', sub: 'Gate Pass & Notices' },
    { label: 'Carpool', href: '/carpool', sub: 'Find or offer a ride' },
    { label: 'Health SOS', href: '/health', sub: 'Emergency & Hospitals' },
    { label: 'My Orders', href: '/order-tracking', sub: orders.length ? `${orders.length} recent` : 'Track an order' },
    { label: 'Jobs', href: '/jobs', sub: jobsList.length ? `${jobsList.length} open` : 'Browse gigs' },
    { label: 'Earn Now', href: '/earn', sub: 'Gigs & Referrals' },
    { label: 'Refer & Earn', href: '/referral', sub: 'Invite your neighbours' },
    { label: 'SamparkPlus', href: '/premium', sub: 'Membership benefits' },
    { label: 'Events', href: '/events', sub: "What's on nearby" },
  ]);

  const glanceTiles = visibleLinks([
    { label: 'Wallet', value: money(walletBalance), note: 'Tap to top up', href: '/wallet', Icon: Wallet, tone: 'var(--accent-text)' },
    {
      label: 'Active orders',
      value: orders.filter((o) => !['Delivered', 'Cancelled', 'Completed'].includes(o.status)).length,
      note: 'On their way', href: '/order-tracking', Icon: Package, tone: 'var(--warning)',
    },
    { label: 'Community', value: feedItems.length, note: 'Recent neighbourhood posts', href: '/community', Icon: Building2, tone: 'var(--info)' },
    { label: 'Bookings', value: appointments.length, note: 'Service bookings', href: '/services', Icon: CalendarDays, tone: 'var(--info)' },
  ]);

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
      <main className="flex-1 pt-20 lg:pt-24 pb-16">
        <div className="container">


          {/* ── AT A GLANCE ──────────────────────────────────────────
              This page used to open on "Neighborhood Services" and three
              identical service cards - same generic icon, same
              "(4.8 - 120 Reviews)", same full-width green button - with the
              greeting buried below them. A dashboard's first job is to answer
              "what needs my attention", so state comes first and browsing
              follows.

              Built on surface and ink tokens rather than a white-on-gradient
              block. The old banner hardcoded white text over an
              emerald-to-indigo gradient, so it looked identical in both themes
              and carried an indigo that is not in the brand.
             ────────────────────────────────────────────────────────── */}
          <div className="mb-8">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-[color:var(--ink-muted)] mb-1 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" aria-hidden="true" />
                  {user?.zone || 'Dhanori, Pune'}
                </p>
                <h1 className="text-3xl lg:text-4xl font-heading font-black text-[color:var(--ink)]">
                  {greeting}{firstName ? ', ' + firstName : ''}
                </h1>
              </div>
              <a
                href="/profile"
                className="inline-flex items-center gap-2 px-4 min-h-[var(--tap-min)]
                  rounded-full border border-[color:var(--line)] bg-[color:var(--surface-1)]
                  text-sm font-semibold text-[color:var(--ink-muted)]
                  hover:text-[color:var(--ink)] hover:border-[color:var(--line-accent)]
                  transition-colors"
              >
                <Eye className="w-4 h-4" aria-hidden="true" /> View profile
              </a>
            </div>

            {/* The live state row. Four numbers a resident checks, each one a
                link to the screen that resolves it - not decoration. */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {glanceTiles.map(({ label, value, note, href, Icon, tone }) => (
                <a
                  key={label}
                  href={href}
                  className="group flex flex-col gap-1 p-4 rounded-[var(--radius-sm)]
                    bg-[color:var(--surface-1)] border border-[color:var(--line)]
                    hover:border-[color:var(--line-accent)]
                    focus-visible:outline-none focus-visible:ring-2
                    focus-visible:ring-[color:var(--accent)]
                    transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm text-[color:var(--ink-muted)]">
                    <Icon className="w-4 h-4" style={{ color: tone }} aria-hidden="true" />
                    {label}
                  </span>
                  <span className="text-2xl font-heading font-black text-[color:var(--ink)] tabular-nums">
                    {value}
                  </span>
                  <span className="text-sm text-[color:var(--ink-subtle)]">{note}</span>
                </a>
              ))}
            </div>
          </div>

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

          {/* ── WHAT ELSE IS HERE ────────────────────────────────────
              A first-time user reaching the dashboard has seen the hero and
              little else. This is the same vertical map as the landing page,
              in its compact form, so the platform's full surface is reachable
              from the one screen people actually land on after signing in.
             ────────────────────────────────────────────────────────── */}
          <div className="mb-4">
            <PlatformMap compact heading="Everything else in your neighbourhood" />
          </div>

          {/* ── TOP SERVICES ────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <Badge variant="primary" pulse className="mb-4 px-4 py-1.5 text-xs uppercase tracking-widest">
              On-Demand Services
            </Badge>
            <h1 className="text-3xl lg:text-4xl font-heading font-black text-text mb-2">Neighborhood Services</h1>
            <p className="text-text-muted text-sm max-w-lg mx-auto">Book verified laundry, logistics, maids, or car washers directly in your area.</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {SERVICES.filter((c) => c.value).slice(0, 8).map((c) => (
              <a key={c.value} href={`/services?category=${c.value}`}
                className="glass-card rounded-2xl border border-border p-5 text-center hover:-translate-y-1 hover:shadow-md transition-all">
                <div className="text-3xl mb-2">{c.icon}</div>
                <div className="text-sm font-heading font-bold text-text">{c.label}</div>
              </a>
            ))}
          </div>
          <div className="text-center mb-12">
            <Button variant="secondary" asChild><a href="/services">View All Services →</a></Button>
          </div>

          {/* ── TABS: Feed / Jobs / Orders / Appointments ─── */}
          <div className="flex flex-wrap gap-2 mb-6">
            {['feed', 'jobs', 'orders', 'appointments'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`px-5 py-2 min-h-[var(--tap-min)] inline-flex items-center rounded-full text-sm font-heading font-bold transition-colors ${
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
              {feedItems.length === 0 && <p className="text-sm text-text-muted">{failed.feed ? 'The community feed could not be loaded.' : 'No posts from your neighbourhood yet.'}</p>}
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
              {jobsList.length === 0 && <p className="text-sm text-text-muted">{failed.jobs ? 'Jobs could not be loaded.' : 'No open jobs right now.'}</p>}
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
              {orders.length === 0 && <p className="text-sm text-text-muted">{failed.orders ? 'Your orders could not be loaded.' : 'You have not placed an order yet.'}</p>}
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
              {appointments.length === 0 && <p className="text-sm text-text-muted">{failed.appointments ? 'Your bookings could not be loaded.' : 'You have no service bookings.'}</p>}
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

      <WebRTCIntercom flatNumber={user?.flatNumber || ""} />
      <Footer />
    </div>
  );
}
