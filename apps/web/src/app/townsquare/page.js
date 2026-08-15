'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import { MessageSquare, Image as ImageIcon, ThumbsUp, Share2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function TownsquarePage() {
  const [activeFilter, setActiveFilter] = useState('All');

  const posts = [
    {
      id: 1,
      author: 'Secretary (RWA)',
      avatar: 'S',
      type: 'Notice',
      isOfficial: true,
      time: '2 hours ago',
      content: 'Water supply will be interrupted tomorrow between 2 PM and 5 PM due to tank cleaning. Please store water accordingly.',
      likes: 45,
      comments: 12
    },
    {
      id: 2,
      author: 'Priya Mehta',
      avatar: 'P',
      type: 'Discussion',
      isOfficial: false,
      time: '5 hours ago',
      content: 'Has anyone seen a stray golden retriever puppy near Block B? He has a blue collar.',
      likes: 12,
      comments: 34
    },
    {
      id: 3,
      author: 'Rahul Sharma',
      avatar: 'R',
      type: 'Buy/Sell',
      isOfficial: false,
      time: '1 day ago',
      content: 'Selling my 2-year-old washing machine. Excellent condition. DM for price.',
      likes: 4,
      comments: 2
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="max-w-3xl mx-auto pt-24 px-4 pb-20">
        
        {/* Cover / Header */}
        <div className="bg-background border border-border rounded-2xl p-6 mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-text flex items-center gap-2">
              Green Valley Townsquare <ShieldCheck size={20} className="text-blue-500" />
            </h1>
            <p className="text-text-muted mt-1">1,204 Verified Residents</p>
          </div>
          <button className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors">
            <AlertTriangle size={18} /> SOS
          </button>
        </div>

        {/* Create Post */}
        <div className="bg-background border border-border rounded-2xl p-4 mb-6 flex gap-4">
          <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0">
            Me
          </div>
          <div className="flex-1">
            <input 
              type="text" 
              placeholder="What's happening in the society?"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-text outline-none focus:border-blue-500 transition-colors mb-3"
            />
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <button className="text-text-muted hover:text-blue-400 p-2 rounded-lg hover:bg-card-bg transition-colors"><ImageIcon size={18} /></button>
                <button className="text-text-muted hover:text-blue-400 p-2 rounded-lg hover:bg-card-bg transition-colors">Poll</button>
              </div>
              <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-xl transition-colors">
                Post
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
          {['All', 'Notices', 'Discussions', 'Buy/Sell', 'Complaints'].map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition-colors ${
                activeFilter === f 
                  ? 'bg-slate-200 text-slate-900' 
                  : 'bg-background text-text-muted border border-border hover:bg-card-bg'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="space-y-4">
          {posts.map(post => (
            <div key={post.id} className="bg-background border border-border rounded-2xl p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${post.isOfficial ? 'bg-blue-600' : 'bg-slate-700'}`}>
                    {post.avatar}
                  </div>
                  <div>
                    <h3 className="font-bold text-text flex items-center gap-1">
                      {post.author} 
                      {post.isOfficial && <ShieldCheck size={14} className="text-blue-500" />}
                    </h3>
                    <p className="text-text-muted text-xs">{post.time} • {post.type}</p>
                  </div>
                </div>
              </div>
              
              <p className="text-text-muted mb-4 text-[15px] leading-relaxed">
                {post.content}
              </p>

              <div className="flex items-center gap-6 pt-4 border-t border-border text-text-muted">
                <button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                  <ThumbsUp size={18} /> <span className="text-sm font-bold">{post.likes}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-blue-400 transition-colors">
                  <MessageSquare size={18} /> <span className="text-sm font-bold">{post.comments}</span>
                </button>
                <button className="flex items-center gap-2 hover:text-blue-400 transition-colors ml-auto">
                  <Share2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
