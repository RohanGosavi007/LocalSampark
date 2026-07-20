'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Avatar } from '../components/ui/Avatar';
import { Chip } from '../components/ui/Chip';
import {
  AlertTriangle, CalendarDays, HelpCircle, MessageCircle, ThumbsUp,
  MessageSquare, Pin, Share2, BarChart3, Send, Image as ImageIcon,
  Video, Smile, MapPin, ShieldCheck, TrendingUp, Users, Plus, Filter,
  ChevronDown
} from 'lucide-react';
import TrustFeed from './TrustFeed';

const POSTS = [
  { id: 1, author: 'Rohan Joshi', society: 'Goodwill Woodlands', time: '1 hr ago', type: 'question', content: 'Did anyone else experience a power outage in Phase 2 last night? Any updates from the power department on restoration ETA?', likes: 14, comments: 6, pinned: false },
  { id: 2, author: 'Pooja Mehta', society: 'Pride Aashiyana', time: '3 hrs ago', type: 'event', content: 'Organizing a Neighborhood Clean-Up Drive this Sunday morning. Starting 7:30 AM from the main gate. All volunteers welcome — gloves and bags provided!', likes: 28, comments: 11, pinned: false },
  { id: 3, author: 'Admin Announcement', society: 'Dhanori Ward', time: '1 day ago', type: 'alert', content: '⚠️ Notice: Road repair works begin on Tingre Nagar road from Monday 8 AM. Expect delays during peak hours (8–10 AM, 5–8 PM). Use Bhairav Nagar lane as alternate route.', likes: 45, comments: 8, pinned: true },
  { id: 4, author: 'Sunita Bhosale', society: 'Ganga Aria', time: '2 days ago', type: 'discussion', content: 'Great news! The Dhanori community health camp is happening next Saturday at Goodwill Clubhouse. Free BP, sugar, and eye checkups. Please spread the word!', likes: 62, comments: 19, pinned: false },
  { id: 5, author: 'Cricket Club', society: 'Dhanori Ground', time: '3 days ago', type: 'event', content: 'Annual LocalSampark Cricket Cup registrations are now open! 12 slots available. Register your team of 11 before July 5th. Prize: ₹5,000 + trophy!', likes: 89, comments: 34, pinned: false },
];

const POLLS = [
  { q: 'Should we request a speed breaker near the main gate?', options: [{ l: 'Yes, definitely!', v: 78 }, { l: 'No, not needed', v: 14 }] },
  { q: 'Best time for weekly garbage collection?', options: [{ l: 'Morning 6-8 AM', v: 112 }, { l: 'Evening 5-7 PM', v: 43 }] },
];

const typeConfig = {
  alert: { color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: AlertTriangle, label: 'ALERT' },
  event: { color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: CalendarDays, label: 'EVENT' },
  question: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', icon: HelpCircle, label: 'QUESTION' },
  discussion: { color: 'text-accent', bg: 'bg-accent/10', border: 'border-accent/20', icon: MessageCircle, label: 'DISCUSSION' },
};

const FILTERS = ['All', 'Alerts', 'Events', 'Questions', 'Discussions'];
const filterMap = { 'Alerts': 'alert', 'Events': 'event', 'Questions': 'question', 'Discussions': 'discussion' };

export default function CommunityPage() {
  const [posts, setPosts] = useState(POSTS);
  const [likedIds, setLikedIds] = useState([]);
  const [activeFilter, setActiveFilter] = useState('All');
  const [pollVotes, setPollVotes] = useState({});
  const [newPostText, setNewPostText] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const toggleLike = (id) => {
    if (likedIds.includes(id)) {
      setLikedIds(likedIds.filter(x => x !== id));
      setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes - 1 } : p));
    } else {
      setLikedIds([...likedIds, id]);
      setPosts(posts.map(p => p.id === id ? { ...p, likes: p.likes + 1 } : p));
    }
  };

  const votePoll = (qi, oi) => {
    if (pollVotes[qi] !== undefined) return;
    setPollVotes({ ...pollVotes, [qi]: oi });
  };

  const filtered = activeFilter === 'All'
    ? posts
    : posts.filter(p => p.type === filterMap[activeFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">

        {/* Hero */}
        <section className="relative pt-32 pb-16 overflow-hidden">
          <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500/15 rounded-full blur-[100px] animate-blobBounce" />
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/15 rounded-full blur-[100px] animate-blobBounce" style={{ animationDelay: '4s' }} />
          <div className="container relative z-10 text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Badge variant="primary" pulse className="mb-6 px-4 py-1.5 text-sm uppercase tracking-widest">
                Town Square
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-heading font-black tracking-tight leading-[1.1] mb-4 text-text">
                Your{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 via-primary to-secondary animate-shimmer bg-[length:200%_auto]">
                  Community Hub
                </span>
              </h1>
              <p className="text-lg text-text-muted max-w-2xl mx-auto">
                Verified neighborhood discussions, alerts, events, and polls — all from OTP-verified residents.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-6 bg-gradient-to-r from-purple-600 to-primary mb-8">
          <div className="container grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-white">
            {[
              { v: '5,200+', l: 'Verified Residents' },
              { v: '1,340', l: 'Posts This Month' },
              { v: '78', l: 'Active Polls' },
              { v: '15', l: 'Zones Connected' },
            ].map((s, i) => (
              <motion.div key={s.l} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <p className="text-2xl font-heading font-black mb-0.5">{s.v}</p>
                <p className="text-xs font-semibold uppercase tracking-wider text-white/80">{s.l}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <div className="container pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Feed */}
            <div className="lg:col-span-2 space-y-4">
              {/* Compose */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl border border-border p-5"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name="Abhi" size="md" status="online" verified />
                  <button onClick={() => setShowCompose(!showCompose)}
                    className="flex-1 text-left text-sm text-text-muted bg-background-alt rounded-xl px-4 py-2.5 border border-border hover:border-primary/30 transition-colors"
                  >
                    Share something with your neighborhood...
                  </button>
                </div>
                <AnimatePresence>
                  {showCompose && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <textarea
                        rows={3}
                        value={newPostText}
                        onChange={e => setNewPostText(e.target.value)}
                        placeholder="What's happening in your area?"
                        className="w-full p-3 rounded-xl border border-border bg-background text-text placeholder:text-text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none mb-3"
                      />
                      <div className="flex items-center justify-between">
                        <div className="flex gap-2">
                          <button className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"><ImageIcon className="w-4 h-4" /></button>
                          <button className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"><Video className="w-4 h-4" /></button>
                          <button className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"><BarChart3 className="w-4 h-4" /></button>
                          <button className="p-2 rounded-lg hover:bg-primary/10 text-text-muted hover:text-primary transition-colors"><MapPin className="w-4 h-4" /></button>
                        </div>
                        <Button size="sm"><Send className="w-3.5 h-3.5 mr-1.5" /> Post</Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Filters */}
              <div className="flex gap-2 flex-wrap">
                {FILTERS.map(f => (
                  <Chip key={f} selected={activeFilter === f} onClick={() => setActiveFilter(f)}>{f}</Chip>
                ))}
              </div>

              {/* Posts */}
              <AnimatePresence mode="popLayout">
                {filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)).map((post, i) => {
                  const config = typeConfig[post.type] || typeConfig.discussion;
                  const TypeIcon = config.icon;
                  return (
                    <motion.div key={post.id} layout initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.05 }}
                      className={`glass-card rounded-2xl border ${post.pinned ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'} p-5 hover:shadow-md transition-shadow`}
                    >
                      {post.pinned && (
                        <div className="flex items-center gap-1.5 mb-3 text-xs font-bold text-amber-600">
                          <Pin className="w-3 h-3" /> Pinned Announcement
                        </div>
                      )}
                      <div className="flex items-start gap-3">
                        <Avatar name={post.author} size="md" verified={post.author === 'Admin Announcement'} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-heading font-bold text-text">{post.author}</span>
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                            <span className="text-xs text-text-muted">• {post.society}</span>
                            <span className="text-xs text-text-muted">• {post.time}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.bg} ${config.color} mb-2`}>
                            <TypeIcon className="w-3 h-3" /> {config.label}
                          </span>
                          <p className="text-sm text-text leading-relaxed mb-3">{post.content}</p>
                          <div className="flex items-center gap-4 pt-2 border-t border-border">
                            <button onClick={() => toggleLike(post.id)}
                              className={`flex items-center gap-1.5 text-xs font-semibold transition-colors ${likedIds.includes(post.id) ? 'text-primary' : 'text-text-muted hover:text-primary'}`}
                            >
                              <ThumbsUp className="w-4 h-4" /> {post.likes}
                            </button>
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors">
                              <MessageSquare className="w-4 h-4" /> {post.comments}
                            </button>
                            <button className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-primary transition-colors">
                              <Share2 className="w-4 h-4" /> Share
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Trending */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="glass-card rounded-2xl border border-border p-5"
              >
                <h3 className="text-sm font-heading font-bold text-text flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-primary" /> Trending in Dhanori
                </h3>
                {['#RoadRepair', '#CricketCup2026', '#GaneshFestival', '#CleanDrive', '#EV_Charging'].map((tag, i) => (
                  <div key={tag} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <span className="text-sm font-semibold text-primary">{tag}</span>
                    <span className="text-xs text-text-muted">{Math.floor(Math.random() * 50 + 10)} posts</span>
                  </div>
                ))}
              </motion.div>

              {/* Active Polls */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
                className="glass-card rounded-2xl border border-border p-5"
              >
                <h3 className="text-sm font-heading font-bold text-text flex items-center gap-2 mb-4">
                  <BarChart3 className="w-4 h-4 text-secondary" /> Active Polls
                </h3>
                {POLLS.map((poll, qi) => {
                  const total = poll.options.reduce((s, o) => s + o.v, 0);
                  return (
                    <div key={qi} className="mb-4 last:mb-0">
                      <p className="text-sm font-semibold text-text mb-2">{poll.q}</p>
                      {poll.options.map((opt, oi) => {
                        const pct = Math.round((opt.v / total) * 100);
                        const voted = pollVotes[qi] !== undefined;
                        return (
                          <button key={oi} onClick={() => votePoll(qi, oi)} disabled={voted}
                            className={`w-full mb-1.5 rounded-xl border text-left relative overflow-hidden transition-all ${
                              voted
                                ? pollVotes[qi] === oi ? 'border-primary/30 bg-primary/5' : 'border-border'
                                : 'border-border hover:border-primary/30 cursor-pointer'
                            }`}
                          >
                            {voted && (
                              <div className="absolute inset-0 bg-primary/10 rounded-xl" style={{ width: `${pct}%` }} />
                            )}
                            <div className="relative z-10 px-3 py-2 flex justify-between items-center">
                              <span className="text-xs font-semibold text-text">{opt.l}</span>
                              {voted && <span className="text-xs font-bold text-primary">{pct}%</span>}
                            </div>
                          </button>
                        );
                      })}
                      <p className="text-[10px] text-text-muted mt-1">{total} votes</p>
                    </div>
                  );
                })}
              </motion.div>

              {/* Community Guidelines */}
              <div className="glass-card rounded-2xl border border-border p-5">
                <h3 className="text-sm font-heading font-bold text-text mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent" /> Community Guidelines
                </h3>
                <ul className="space-y-2 text-xs text-text-muted">
                  <li className="flex items-start gap-2"><span className="text-accent">✓</span> Be respectful to all neighbors</li>
                  <li className="flex items-start gap-2"><span className="text-accent">✓</span> Only verified residents can post</li>
                  <li className="flex items-start gap-2"><span className="text-accent">✓</span> No spam or self-promotion</li>
                  <li className="flex items-start gap-2"><span className="text-accent">✓</span> Report inappropriate content</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
