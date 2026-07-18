'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Users, MessageSquare, Plus, Heart, Share2, Flame, MapPin } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function CommunityHubPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const [lostRes, garageRes] = await Promise.allSettled([
        fetch(`${API_URL}/api/v1/community-hub/lost/active`, { headers }),
        fetch(`${API_URL}/api/v1/community-hub/garage/items`, { headers })
      ]);
      const combined = [];
      if (lostRes.status === 'fulfilled') {
        const lostData = await lostRes.value.json();
        const items = lostData.data || lostData.rows || (Array.isArray(lostData) ? lostData : []);
        items.forEach(item => combined.push({ ...item, tag: 'Lost & Found' }));
      }
      if (garageRes.status === 'fulfilled') {
        const garageData = await garageRes.value.json();
        const items = garageData.data || garageData.rows || (Array.isArray(garageData) ? garageData : []);
        items.forEach(item => combined.push({ ...item, tag: 'Garage Sale' }));
      }
      if (combined.length > 0) {
        setPosts(combined);
      } else {
        setPosts([
          { id: 1, author: 'Priya Sharma', time: '2 hours ago', content: 'Does anyone know a good reliable maid in Viman Nagar area? Our previous one moved back to her village.', likes: 12, comments: 8, tag: 'Help Wanted' },
          { id: 2, author: 'Rahul Verma', time: '5 hours ago', content: 'Just tried the new bakery on 4th cross street. Their sourdough bread is amazing! Highly recommend supporting this new local business.', likes: 45, comments: 12, tag: 'Recommendation' },
          { id: 3, author: 'Kalyani Nagar Residents', time: '1 day ago', content: 'Reminder: The weekly farmers market is happening tomorrow at the community park from 7 AM to 11 AM.', likes: 89, comments: 4, tag: 'Event Update' },
        ]);
      }
    } catch (e) {
      console.error('Community Hub API failed, using mock data:', e);
      setPosts([
        { id: 1, author: 'Priya Sharma', time: '2 hours ago', content: 'Does anyone know a good reliable maid in Viman Nagar area?', likes: 12, comments: 8, tag: 'Help Wanted' },
        { id: 2, author: 'Rahul Verma', time: '5 hours ago', content: 'Just tried the new bakery on 4th cross street. Amazing sourdough!', likes: 45, comments: 12, tag: 'Recommendation' },
        { id: 3, author: 'Kalyani Nagar Residents', time: '1 day ago', content: 'Reminder: Weekly farmers market tomorrow at community park 7-11 AM.', likes: 89, comments: 4, tag: 'Event Update' },
      ]);
    }
    setLoading(false);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16">
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20" />
          <div className="max-w-4xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-4">
              Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Hub</span>
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Discuss, ask for help, and connect with your neighbors in real-time.
            </p>
            <button className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition flex items-center gap-2 mx-auto">
              <Plus className="w-5 h-5" /> Create Post
            </button>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-12">
          {loading ? (
            <div className="space-y-6">
              {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-800/60 rounded-3xl animate-pulse" />)}
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map((post, i) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-blue-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center text-white font-bold">
                        {post.author[0]}
                      </div>
                      <div>
                        <h4 className="text-white font-bold text-sm">{post.author}</h4>
                        <span className="text-slate-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3" /> {post.time}</span>
                      </div>
                    </div>
                    <span className="px-3 py-1 bg-slate-800 text-slate-300 text-xs font-semibold rounded-full border border-slate-700">
                      {post.tag}
                    </span>
                  </div>
                  
                  <p className="text-slate-300 mb-6 text-sm leading-relaxed">{post.content}</p>
                  
                  <div className="flex items-center gap-6 pt-4 border-t border-slate-800">
                    <button className="flex items-center gap-2 text-slate-400 hover:text-rose-500 transition text-sm font-medium">
                      <Heart className="w-5 h-5" /> {post.likes}
                    </button>
                    <button className="flex items-center gap-2 text-slate-400 hover:text-blue-500 transition text-sm font-medium">
                      <MessageSquare className="w-5 h-5" /> {post.comments} Comments
                    </button>
                    <button className="flex items-center gap-2 text-slate-400 hover:text-emerald-500 transition text-sm font-medium ml-auto">
                      <Share2 className="w-5 h-5" /> Share
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
