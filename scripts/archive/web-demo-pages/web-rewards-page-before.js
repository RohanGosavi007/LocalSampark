'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Flame, Medal, Gift, Coins, TrendingUp, Zap, Target, Star, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';

export default function RewardsPage() {
  const [activeTab, setActiveTab] = useState('overview'); // overview, badges, redeem, spin, leaderboard
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDegrees, setSpinDegrees] = useState(0);
  const [spinResult, setSpinResult] = useState(null);

  const handleSpin = () => {
      setIsSpinning(true);
      setSpinResult(null);
      const newDegrees = spinDegrees + 1800 + Math.floor(Math.random() * 1800);
      setSpinDegrees(newDegrees);
      
      setTimeout(() => {
          setIsSpinning(false);
          const finalRotation = (newDegrees % 360);
          let won = "50 SC";
          if (finalRotation >= 45 && finalRotation < 135) won = "Free Delivery";
          else if (finalRotation >= 135 && finalRotation < 225) won = "Oops! Try Again";
          else if (finalRotation >= 225 && finalRotation < 315) won = "100 SC";
          setSpinResult(won);
      }, 4000);
  };

  return (
    <div className="min-h-screen bg-section-alt flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-6xl">
          
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Left Sidebar: Status */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
                <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm text-center relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                    
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-100 to-amber-50 mx-auto mb-4 flex items-center justify-center border-4 border-amber-500/20 shadow-inner">
                        <span className="text-5xl">👑</span>
                    </div>
                    <h2 className="text-2xl font-black mb-1">Local Legend</h2>
                    <p className="text-text-muted text-sm font-bold tracking-widest uppercase mb-6">Level 12</p>
                    
                    <div className="bg-background-alt p-4 rounded-2xl border border-border mb-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-amber-500 font-bold flex items-center gap-1"><Coins className="w-4 h-4"/> 1,450 SC</span>
                            <span className="text-xs text-text-muted">SamparkCoins</span>
                        </div>
                        <div className="w-full bg-border rounded-full h-2 mb-2">
                            <div className="bg-gradient-to-r from-amber-400 to-orange-500 h-2 rounded-full" style={{ width: '70%' }}></div>
                        </div>
                        <p className="text-xs text-text-muted text-left">550 SC to next level</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-left">
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3">
                            <div className="text-orange-500 mb-1"><Flame className="w-5 h-5"/></div>
                            <div className="text-xl font-black">14</div>
                            <div className="text-[10px] text-text-muted uppercase font-bold">Day Streak</div>
                        </div>
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                            <div className="text-purple-500 mb-1"><Medal className="w-5 h-5"/></div>
                            <div className="text-xl font-black">8</div>
                            <div className="text-[10px] text-text-muted uppercase font-bold">Badges Earned</div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-4 rounded-3xl border border-border bg-background shadow-sm space-y-2">
                    <button onClick={() => setActiveTab('overview')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'overview' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                        <div className="flex items-center gap-3"><TrendingUp className="w-5 h-5" /> Economy Overview</div>
                        {activeTab === 'overview' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setActiveTab('badges')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'badges' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                        <div className="flex items-center gap-3"><Medal className="w-5 h-5" /> Badges & Quests</div>
                        {activeTab === 'badges' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setActiveTab('spin')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'spin' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                        <div className="flex items-center gap-3"><Target className="w-5 h-5" /> Spin & Win</div>
                        {activeTab === 'spin' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setActiveTab('leaderboard')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'leaderboard' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                        <div className="flex items-center gap-3"><Star className="w-5 h-5" /> Leaderboard</div>
                        {activeTab === 'leaderboard' && <ChevronRight className="w-4 h-4" />}
                    </button>
                    <button onClick={() => setActiveTab('redeem')} className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl font-bold transition-all ${activeTab === 'redeem' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}>
                        <div className="flex items-center gap-3"><Gift className="w-5 h-5" /> Redeem Catalog</div>
                        {activeTab === 'redeem' && <ChevronRight className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1">
                
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <div className="glass-card p-8 rounded-3xl border border-border bg-background shadow-sm">
                            <h3 className="text-xl font-black mb-6 flex items-center gap-2"><Zap className="w-5 h-5 text-amber-500"/> How to Earn Coins</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { title: 'Daily Check-in', desc: 'Open the app every day', reward: '+10 SC' },
                                    { title: 'Community Post', desc: 'Share a helpful update', reward: '+50 SC' },
                                    { title: 'Help a Neighbor', desc: 'Answer a question or SOS', reward: '+100 SC' },
                                    { title: 'Shop Local', desc: 'Order from local stores', reward: 'Up to 500 SC' },
                                ].map((item, i) => (
                                    <div key={i} className="flex items-start gap-4 p-4 rounded-2xl border border-border bg-background-alt">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                                            <Target className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm">{item.title}</h4>
                                            <p className="text-xs text-text-muted mb-2">{item.desc}</p>
                                            <Badge variant="primary" className="bg-amber-500/10 text-amber-600 border-amber-500/20 py-0 text-[10px]">{item.reward}</Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="glass-card p-8 rounded-3xl border border-border bg-background shadow-sm">
                            <h3 className="text-xl font-black mb-6">Recent Transactions</h3>
                            <div className="space-y-4">
                                {[
                                    { action: 'Ordered Groceries from Sharma Store', type: 'earn', amount: 45, date: 'Today, 10:30 AM' },
                                    { action: 'Daily Streak Bonus (7 Days)', type: 'earn', amount: 100, date: 'Yesterday' },
                                    { action: 'Redeemed Free Delivery Voucher', type: 'spend', amount: -200, date: 'Mon, 14 Aug' },
                                    { action: 'Posted in Townsquare', type: 'earn', amount: 50, date: 'Sun, 13 Aug' },
                                ].map((tx, i) => (
                                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-border hover:bg-background-alt transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${tx.type === 'earn' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {tx.type === 'earn' ? <TrendingUp className="w-5 h-5"/> : <Gift className="w-5 h-5"/>}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-sm">{tx.action}</h4>
                                                <p className="text-xs text-text-muted">{tx.date}</p>
                                            </div>
                                        </div>
                                        <div className={`font-black ${tx.type === 'earn' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                            {tx.amount > 0 ? '+' : ''}{tx.amount} SC
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'badges' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                            {[
                                { title: 'Early Bird', icon: '🌅', desc: 'Joined in the first month', unlocked: true },
                                { title: 'Social Butterfly', icon: '🦋', desc: 'Made 50+ community posts', unlocked: true },
                                { title: 'Local Patron', icon: '🛍️', desc: 'Ordered from 10 different shops', unlocked: true },
                                { title: 'Helping Hand', icon: '🤝', desc: 'Resolved 5 SOS alerts', unlocked: false, progress: 60 },
                                { title: 'Recycler', icon: '♻️', desc: 'Sold scrap 5 times', unlocked: false, progress: 20 },
                                { title: 'Green Thumb', icon: '🌱', desc: 'Bought farm fresh 10 times', unlocked: false, progress: 90 },
                            ].map((badge, i) => (
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} key={i} className={`glass-card p-6 rounded-3xl border ${badge.unlocked ? 'border-amber-500/30 bg-amber-500/5' : 'border-border bg-background'} shadow-sm text-center relative overflow-hidden`}>
                                    {badge.unlocked && <div className="absolute top-3 right-3 text-emerald-500"><CheckCircle2 className="w-5 h-5"/></div>}
                                    <div className={`text-5xl mb-4 ${!badge.unlocked && 'grayscale opacity-50'}`}>{badge.icon}</div>
                                    <h4 className="font-black text-sm mb-1">{badge.title}</h4>
                                    <p className="text-xs text-text-muted mb-4">{badge.desc}</p>
                                    
                                    {!badge.unlocked && (
                                        <div className="w-full bg-border rounded-full h-1.5 mt-auto">
                                            <div className="bg-primary h-1.5 rounded-full" style={{ width: `${badge.progress}%` }}></div>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'redeem' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[
                            { title: 'Free Delivery', type: 'Voucher', cost: 200, desc: 'Waive off delivery charges on your next local order.', color: 'from-blue-500 to-cyan-500' },
                            { title: '₹50 Off at Sharma Grocery', type: 'Discount', cost: 500, desc: 'Instant discount on orders above ₹500.', color: 'from-emerald-500 to-teal-500' },
                            { title: '1 Month SamparkPlus', type: 'Premium', cost: 1500, desc: 'Unlock zero convenience fees and priority delivery.', color: 'from-purple-500 to-indigo-500' },
                            { title: 'Donate to RWA Fund', type: 'Charity', cost: 100, desc: 'Contribute your coins to the neighborhood development fund.', color: 'from-rose-500 to-pink-500' },
                        ].map((item, i) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={i} className="glass-card rounded-3xl border border-border bg-background shadow-sm overflow-hidden flex flex-col">
                                <div className={`h-24 bg-gradient-to-r ${item.color} p-6 relative`}>
                                    <Badge className="bg-white/20 text-white border-white/30 backdrop-blur">{item.type}</Badge>
                                    <div className="absolute -bottom-6 right-6 w-12 h-12 bg-background rounded-full flex items-center justify-center border-4 border-background shadow-lg text-xl">
                                        {item.type === 'Charity' ? '💖' : '🎟️'}
                                    </div>
                                </div>
                                <div className="p-6 flex-1 flex flex-col">
                                    <h4 className="font-black text-lg mb-2">{item.title}</h4>
                                    <p className="text-sm text-text-muted mb-6 flex-1">{item.desc}</p>
                                    <Button className="w-full shadow-lg shadow-amber-500/20 bg-amber-500 hover:bg-amber-600 text-white border-amber-500">
                                        Redeem for {item.cost} SC
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {activeTab === 'spin' && (
                    <div className="glass-card p-8 rounded-3xl border border-border bg-background shadow-sm text-center">
                        <h3 className="text-3xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Daily Spin & Win</h3>
                        <p className="text-text-muted mb-12">Spin the wheel to earn SamparkCoins, vouchers, and free deliveries! You have <strong className="text-amber-500">2 Spins</strong> left today.</p>
                        
                        <div className="relative w-72 h-72 mx-auto mb-12">
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 z-20">
                                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-md"></div>
                            </div>
                            <motion.div 
                                className="w-full h-full rounded-full border-8 border-amber-500 shadow-2xl overflow-hidden relative bg-white"
                                animate={{ rotate: spinDegrees }}
                                transition={{ duration: 4, type: 'spring', damping: 20, stiffness: 20 }}
                                style={{
                                    background: 'conic-gradient(#f59e0b 0% 25%, #10b981 25% 50%, #3b82f6 50% 75%, #ef4444 75% 100%)'
                                }}
                            >
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 font-black text-white drop-shadow-md z-10 rotate-[45deg] origin-bottom h-1/2 flex items-start pt-4">50 SC</div>
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 font-black text-white drop-shadow-md z-10 rotate-[135deg] origin-bottom h-1/2 flex items-start pt-4">Free Del</div>
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 font-black text-white drop-shadow-md z-10 rotate-[225deg] origin-bottom h-1/2 flex items-start pt-4">Oops!</div>
                                <div className="absolute top-8 left-1/2 -translate-x-1/2 font-black text-white drop-shadow-md z-10 rotate-[315deg] origin-bottom h-1/2 flex items-start pt-4">100 SC</div>
                                <div className="absolute inset-0 rounded-full border-[10px] border-white/20 z-10"></div>
                            </motion.div>
                            <button 
                                onClick={handleSpin}
                                disabled={isSpinning}
                                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-white rounded-full z-30 shadow-xl border-4 border-amber-500 flex items-center justify-center font-black text-amber-500 hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
                            >
                                SPIN
                            </button>
                        </div>

                        {spinResult && (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="inline-block px-8 py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-2xl font-black text-2xl shadow-lg shadow-amber-500/30">
                                🎉 You Won: {spinResult}!
                            </motion.div>
                        )}
                    </div>
                )}

                {activeTab === 'leaderboard' && (
                    <div className="glass-card p-8 rounded-3xl border border-border bg-background shadow-sm">
                        <h3 className="text-2xl font-black mb-6 flex items-center gap-2"><Star className="w-6 h-6 text-amber-500"/> Community Leaderboard</h3>
                        <p className="text-text-muted mb-6">Top contributors in your neighborhood this week. Top 3 win a 500 SC bonus!</p>
                        
                        <div className="space-y-3">
                            {[
                                { rank: 1, name: 'Anjali Desai', points: 3450, icon: '👑', color: 'bg-amber-500/20 text-amber-500 border-amber-500/30' },
                                { rank: 2, name: 'Vikram Singh', points: 2900, icon: '🥈', color: 'bg-slate-300/20 text-slate-400 border-slate-300/30' },
                                { rank: 3, name: 'Priya Mehta', points: 2100, icon: '🥉', color: 'bg-orange-700/20 text-orange-600 border-orange-700/30' },
                                { rank: 4, name: 'Rahul Joshi', points: 1850, icon: '4', color: 'bg-background-alt text-text-muted border-border' },
                                { rank: 5, name: 'You', points: 1450, icon: '5', color: 'bg-primary/10 text-primary border-primary/30 shadow-sm shadow-primary/10' },
                            ].map((user, i) => (
                                <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${user.color} transition-colors`}>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white/50 flex items-center justify-center font-black shadow-sm">
                                            {user.icon}
                                        </div>
                                        <h4 className="font-bold text-base">{user.name}</h4>
                                    </div>
                                    <div className="font-black text-lg">
                                        {user.points} SC
                                    </div>
                                </div>
                            ))}
                        </div>
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
