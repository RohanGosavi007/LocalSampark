'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { 
  MessageSquare, Heart, Share2, MoreHorizontal, 
  MapPin, Clock, Image as ImageIcon, Link as LinkIcon, 
  Send, ThumbsUp, HelpCircle, CheckCircle, TrendingUp,
  Award
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const INITIAL_POSTS = [
  {
    id: 1,
    author: { name: 'Priya Sharma', avatar: 'https://ui-avatars.com/api/?name=Priya+Sharma&background=random', isVerified: true, role: 'Top Contributor' },
    content: "Just tried the new organic farm stand near the main gate! The vegetables are incredibly fresh and prices are reasonable. Highly recommend the heirloom tomatoes! 🍅🥬",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=400&fit=crop",
    time: "2 hours ago",
    location: "Dhanori Main Road",
    likes: 24,
    comments: [
      { id: 101, author: 'Rahul V.', content: 'Do they have fresh basil?', time: '1 hr ago' },
      { id: 102, author: 'Priya Sharma', content: 'Yes! Lots of herbs too.', time: '45m ago' }
    ],
    type: 'recommendation'
  },
  {
    id: 2,
    author: { name: 'Dhanori RWA', avatar: 'https://ui-avatars.com/api/?name=RWA&background=10b981&color=fff', isVerified: true, role: 'Official Admin' },
    content: "IMPORTANT NOTICE: Water supply will be interrupted tomorrow between 10 AM and 2 PM due to pipeline maintenance near Porwal road. Please store water accordingly. 💧🚧",
    time: "4 hours ago",
    location: "Entire Dhanori",
    likes: 156,
    comments: [],
    type: 'announcement'
  },
  {
    id: 3,
    author: { name: 'Amit Kumar', avatar: 'https://ui-avatars.com/api/?name=Amit+Kumar&background=random', isVerified: false, role: 'Resident' },
    content: "Does anyone know a good reliable plumber who can fix a geyser issue today? Need it urgently before the weekend. 🛠️",
    time: "5 hours ago",
    location: "Ganga Arcadia",
    likes: 5,
    comments: [
      { id: 103, author: 'Suresh Plumber', content: 'I am available sir. Calling you now.', time: '4 hrs ago', isPro: true }
    ],
    type: 'help'
  }
];

export default function TownSquare() {
  const [posts, setPosts] = useState(INITIAL_POSTS);
  const [activeTab, setActiveTab] = useState('feed'); // feed, polls, notices
  const [newPost, setNewPost] = useState('');
  
  const handlePost = () => {
    if (!newPost.trim()) return;
    const post = {
      id: Date.now(),
      author: { name: 'You', avatar: 'https://ui-avatars.com/api/?name=You&background=6366f1&color=fff', isVerified: false, role: 'Resident' },
      content: newPost,
      time: "Just now",
      location: "Your Location",
      likes: 0,
      comments: [],
      type: 'general'
    };
    setPosts([post, ...posts]);
    setNewPost('');
  };

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="container max-w-5xl">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Sidebar */}
            <div className="lg:w-64 shrink-0 flex flex-col gap-6">
              <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm text-center">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 p-1 mx-auto mb-4 relative">
                  <img src="https://ui-avatars.com/api/?name=You&background=6366f1&color=fff" className="w-full h-full rounded-full" alt="Profile" />
                  <div className="absolute -bottom-2 -right-2 bg-background rounded-full p-1 border border-border">
                    <Award className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <h3 className="font-heading font-black text-lg mb-1">Your Profile</h3>
                <p className="text-sm text-text-muted mb-4">Level 4 Contributor</p>
                <div className="grid grid-cols-2 gap-2 text-sm border-t border-border pt-4">
                  <div><div className="font-bold text-text">142</div><div className="text-text-muted text-xs">Points</div></div>
                  <div><div className="font-bold text-text">12</div><div className="text-text-muted text-xs">Posts</div></div>
                </div>
              </div>

              <div className="glass-card p-4 rounded-3xl border border-border bg-background shadow-sm space-y-2">
                <button onClick={() => setActiveTab('feed')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'feed' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                  <MessageSquare className="w-5 h-5" /> Local Feed
                </button>
                <button onClick={() => setActiveTab('polls')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'polls' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                  <TrendingUp className="w-5 h-5" /> Community Polls
                </button>
                <button onClick={() => setActiveTab('notices')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'notices' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                  <CheckCircle className="w-5 h-5" /> Official Notices
                </button>
              </div>
            </div>

            {/* Main Feed */}
            <div className="flex-1 flex flex-col gap-6">
              
              {/* Create Post */}
              {activeTab === 'feed' && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm">
                    <div className="flex gap-4">
                      <img src="https://ui-avatars.com/api/?name=You&background=6366f1&color=fff" className="w-12 h-12 rounded-full shrink-0" alt="You" />
                      <div className="flex-1">
                        <textarea 
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          placeholder="What's happening in your neighborhood?" 
                          className="w-full bg-background-alt border border-border rounded-2xl p-4 text-text placeholder:text-text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none min-h-[100px]"
                        />
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex gap-2">
                            <button className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors"><ImageIcon className="w-5 h-5"/></button>
                            <button className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors"><MapPin className="w-5 h-5"/></button>
                            <button className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-full transition-colors"><LinkIcon className="w-5 h-5"/></button>
                          </div>
                          <Button onClick={handlePost} disabled={!newPost.trim()} icon={Send}>Post</Button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
              )}

              {/* Feed Content */}
              {activeTab === 'feed' && (
                  <div className="flex flex-col gap-6">
                    {posts.map((post, idx) => (
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={post.id} className="glass-card rounded-3xl border border-border bg-background shadow-sm overflow-hidden">
                        
                        <div className="p-6 pb-4 flex justify-between items-start">
                          <div className="flex gap-4">
                            <img src={post.author.avatar} alt={post.author.name} className="w-12 h-12 rounded-full shrink-0 border border-border" />
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-text">{post.author.name}</span>
                                {post.author.isVerified && <CheckCircle className="w-4 h-4 text-blue-500 fill-blue-500/20" />}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted font-medium mt-1">
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3"/> {post.time}</span>
                                <span className="flex items-center gap-1"><MapPin className="w-3 h-3"/> {post.location}</span>
                                {post.author.role === 'Official Admin' && <Badge variant="primary" className="py-0 px-1.5 h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Official</Badge>}
                              </div>
                            </div>
                          </div>
                          <button className="p-2 text-text-muted hover:bg-background-alt rounded-full transition-colors"><MoreHorizontal className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="px-6 pb-4">
                          <p className="text-text text-[15px] leading-relaxed whitespace-pre-wrap">{post.content}</p>
                          {post.image && (
                            <div className="mt-4 rounded-2xl overflow-hidden border border-border">
                              <img src={post.image} alt="Post attachment" className="w-full h-auto object-cover max-h-[400px]" />
                            </div>
                          )}
                        </div>
                        
                        <div className="px-6 py-3 border-t border-border flex gap-6">
                          <button className="flex items-center gap-2 text-text-muted hover:text-rose-500 transition-colors font-bold text-sm">
                            <Heart className="w-5 h-5" /> {post.likes}
                          </button>
                          <button className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors font-bold text-sm">
                            <MessageSquare className="w-5 h-5" /> {post.comments.length}
                          </button>
                          <button className="flex items-center gap-2 text-text-muted hover:text-primary transition-colors font-bold text-sm ml-auto">
                            <Share2 className="w-5 h-5" /> Share
                          </button>
                        </div>
                        
                        {/* Comments Section */}
                        {post.comments.length > 0 && (
                          <div className="bg-background-alt p-6 border-t border-border">
                            <div className="space-y-4">
                              {post.comments.map(comment => (
                                <div key={comment.id} className="flex gap-3">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 shrink-0 flex items-center justify-center text-xs font-bold text-primary">{comment.author[0]}</div>
                                  <div className="flex-1 bg-background p-3 rounded-2xl rounded-tl-none border border-border">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="font-bold text-sm">{comment.author}</span>
                                      {comment.isPro && <Badge className="py-0 px-1 text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">Verified Pro</Badge>}
                                      <span className="text-[10px] text-text-muted ml-auto">{comment.time}</span>
                                    </div>
                                    <p className="text-sm text-text">{comment.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex gap-3">
                              <input type="text" placeholder="Write a reply..." className="flex-1 bg-background border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-primary" />
                              <Button size="sm" className="rounded-full px-4"><Send className="w-4 h-4" /></Button>
                            </div>
                          </div>
                        )}
                        
                      </motion.div>
                    ))}
                  </div>
              )}

              {activeTab === 'polls' && (
                <div className="glass-card p-12 rounded-3xl border border-border bg-background shadow-sm text-center">
                  <TrendingUp className="w-16 h-16 text-primary mx-auto mb-4 opacity-50" />
                  <h2 className="text-2xl font-black mb-2">Community Polls</h2>
                  <p className="text-text-muted">Participate in local polls to earn rewards and shape your neighborhood.</p>
                </div>
              )}

              {activeTab === 'notices' && (
                <div className="glass-card p-12 rounded-3xl border border-border bg-background shadow-sm text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4 opacity-50" />
                  <h2 className="text-2xl font-black mb-2">Official Notices</h2>
                  <p className="text-text-muted">Important updates from RWA and local authorities will appear here.</p>
                </div>
              )}
              
            </div>
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
}
