'use client';
import React, { useState, useEffect, useRef } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, MapPin, Calculator, Shield, Leaf, Upload, DollarSign, Search, AlertTriangle, CheckCircle2, Zap, TrendingUp, Award, FileText, Briefcase, Bell, Users, Star, Send, X, Eye, Heart, ChevronDown } from 'lucide-react';
import { API_URL } from '@/lib/api';

const TABS = [
  { key: 'cost-calc', label: '🧮 Cost Splitter', icon: Calculator },
  { key: 'otp', label: '🔐 Ride OTP', icon: Shield },
  { key: 'carbon', label: '🌿 Carbon Dashboard', icon: Leaf },
  { key: 'price-ai', label: '💰 AI Price', icon: DollarSign },
  { key: 'escrow', label: '🛡️ Safe Pay', icon: Shield },
  { key: 'trust', label: '⭐ Trust Score', icon: Award },
  { key: 'resume', label: '📄 Resume Parser', icon: FileText },
  { key: 'skill-gap', label: '📈 Skill Gap', icon: TrendingUp },
  { key: 'alerts', label: '🔔 Job Alerts', icon: Bell },
  { key: 'employer', label: '👔 Employer', icon: Briefcase },
  { key: 'auctions', label: '🔨 Auctions', icon: Zap },
  { key: 'quizzes', label: '📝 Skill Quiz', icon: CheckCircle2 },
  { key: 'gamify', label: '🏆 Gamification', icon: Award },
  { key: 'groups', label: '👥 Ride Groups', icon: Users },
];

// ═══ PHASE B COMPONENTS ═══

function AuctionsTab({ authHeaders, API_URL, Card, Btn, Label, Input }) {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    fetch(`${API_URL}/api/v1/marketplace/auctions`, { headers: authHeaders }).then(r => r.json()).then(d => { setAuctions(d.auctions || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const placeBid = async (auctionId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/auctions/${auctionId}/bid`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ bid_amount: parseFloat(bidAmount) })
      });
      const data = await res.json();
      if (data.success) { alert('Bid placed!'); setBidAmount(''); setSelectedAuction(null); }
      else alert(data.error);
    } catch (e) { alert('Failed'); }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-black text-text">🔨 Live Auctions</h2>
        <span className="text-xs text-text-muted bg-card-bg border border-border px-3 py-1 rounded-full">{auctions.length} active</span>
      </div>
      {loading ? <p className="text-text-muted text-center py-8">Loading...</p> : auctions.length === 0 ? (
        <Card className="text-center py-12"><p className="text-4xl mb-3">🔨</p><p className="text-text-muted">No active auctions. Create one from Marketplace!</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {auctions.map(a => (
            <Card key={a.id} className="hover:border-amber-500/30 transition cursor-pointer" onClick={() => setSelectedAuction(a)}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-text font-bold text-sm">{a.title || 'Auction Item'}</h3>
                  <p className="text-text-muted text-[10px]">{a.category}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${a.seconds_remaining < 3600 ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-amber-500/20 text-amber-400'}`}>
                  ⏱ {formatTime(a.seconds_remaining)}
                </span>
              </div>
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center mb-3">
                <p className="text-text-muted text-[10px]">Current Bid</p>
                <p className="text-2xl font-black text-amber-400">₹{(a.current_bid || 0).toLocaleString()}</p>
                <p className="text-text-muted text-[10px]">{a.total_bids || 0} bids</p>
              </div>
              <div className="flex gap-2">
                <input type="number" placeholder={`Min ₹${(a.current_bid || 0) + a.bid_increment}`} value={selectedAuction?.id === a.id ? bidAmount : ''}
                  onChange={e => { setSelectedAuction(a); setBidAmount(e.target.value); }} onClick={e => e.stopPropagation()}
                  className="flex-1 bg-background-alt text-text rounded-lg px-3 py-2 text-sm border border-border outline-none" />
                <button onClick={(e) => { e.stopPropagation(); placeBid(a.id); }}
                  className="px-4 py-2 rounded-lg bg-amber-500 text-white font-bold text-sm hover:bg-amber-400 transition">Bid</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function QuizzesTab({ authHeaders, API_URL, Card, Btn }) {
  const [assessments, setAssessments] = useState([]);
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [quizResult, setQuizResult] = useState(null);
  const [currentQ, setCurrentQ] = useState(0);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/jobs/assessments`, { headers: authHeaders }).then(r => r.json()).then(d => setAssessments(d.assessments || [])).catch(() => {});
  }, []);

  const startQuiz = (assessment) => {
    setActiveQuiz(assessment);
    setAnswers(new Array(assessment.total_questions).fill(-1));
    setCurrentQ(0);
    setQuizResult(null);
  };

  const submitQuiz = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/assessments/${activeQuiz.id}/submit`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ answers })
      });
      const data = await res.json();
      setQuizResult(data.result);
    } catch (e) { alert('Failed'); }
  };

  if (quizResult) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="max-w-2xl mx-auto">
          <div className="text-center mb-6">
            <p className="text-5xl mb-3">{quizResult.passed ? '🎉' : '📚'}</p>
            <h2 className="text-2xl font-black text-text">{quizResult.passed ? 'You Passed!' : 'Keep Practicing!'}</h2>
            <div className="w-20 h-20 rounded-full border-4 mx-auto my-4 flex items-center justify-center" style={{ borderColor: quizResult.passed ? '#10b981' : '#ef4444' }}>
              <span className="text-2xl font-black text-text">{quizResult.score}%</span>
            </div>
            <p className="text-text-muted text-sm">{quizResult.correct}/{quizResult.total} correct</p>
            {quizResult.badge && <p className="text-emerald-400 font-bold mt-2">{quizResult.badge}</p>}
          </div>
          <div className="space-y-2 mb-4">
            {quizResult.breakdown?.map((r, i) => (
              <div key={i} className={`rounded-lg p-3 text-sm ${r.correct ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                <p className="text-text font-bold text-xs mb-1">{r.question}</p>
                <p className="text-text-muted text-[10px]">Your: {r.your_answer} {r.correct ? '✅' : `❌ → ${r.correct_answer}`}</p>
              </div>
            ))}
          </div>
          <Btn onClick={() => { setActiveQuiz(null); setQuizResult(null); }} className="w-full">Back to Quizzes</Btn>
        </Card>
      </motion.div>
    );
  }

  if (activeQuiz) {
    const q = activeQuiz.questions[currentQ];
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Card className="max-w-2xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-black text-text">{activeQuiz.skill_name} Quiz</h3>
            <span className="text-xs text-text-muted bg-background-alt px-3 py-1 rounded-full">{currentQ + 1}/{activeQuiz.total_questions}</span>
          </div>
          <div className="w-full bg-background-alt rounded-full h-1.5 mb-6"><div className="bg-cyan-500 h-1.5 rounded-full transition-all" style={{ width: `${((currentQ + 1) / activeQuiz.total_questions) * 100}%` }} /></div>
          <p className="text-text font-bold mb-4">{q?.q}</p>
          <div className="space-y-2 mb-6">
            {q?.opts?.map((opt, oi) => (
              <button key={oi} onClick={() => { const n = [...answers]; n[currentQ] = oi; setAnswers(n); }}
                className={`w-full text-left p-3 rounded-xl border text-sm font-medium transition ${answers[currentQ] === oi ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400' : 'bg-background-alt border-border text-text hover:border-cyan-500/30'}`}>
                {String.fromCharCode(65 + oi)}. {opt}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            {currentQ > 0 && <button onClick={() => setCurrentQ(currentQ - 1)} className="flex-1 py-3 rounded-xl border border-border text-text-muted font-bold text-sm">← Back</button>}
            {currentQ < activeQuiz.total_questions - 1 ? (
              <Btn onClick={() => setCurrentQ(currentQ + 1)} className="flex-1">Next →</Btn>
            ) : (
              <Btn onClick={submitQuiz} color="emerald" className="flex-1">Submit Quiz ✅</Btn>
            )}
          </div>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h2 className="text-xl font-black text-text mb-2">📝 Skill Assessment Quizzes</h2>
      <p className="text-text-muted text-sm mb-6">Pass a quiz to get a Verified Skill ✅ badge on your profile</p>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assessments.map(a => (
          <Card key={a.id} className="hover:border-cyan-500/30 transition">
            <h3 className="text-text font-bold mb-1">{a.skill_name}</h3>
            <p className="text-text-muted text-xs mb-3">{a.total_questions} questions · {Math.round(a.time_limit_seconds / 60)}min · Pass: {a.passing_score}%</p>
            <Btn onClick={() => startQuiz(a)} className="w-full">Start Quiz 📝</Btn>
          </Card>
        ))}
      </div>
    </motion.div>
  );
}

function GamificationTab({ authHeaders, API_URL, Card }) {
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState(null);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/gamification/profile`, { headers: authHeaders }).then(r => r.json()).then(d => setProfile(d.profile)).catch(() => {});
    fetch(`${API_URL}/api/v1/gamification/leaderboard`, { headers: authHeaders }).then(r => r.json()).then(d => setLeaderboard(d.leaderboard)).catch(() => {});
  }, []);

  if (!profile) return <Card className="text-center py-12"><p className="text-text-muted">Loading...</p></Card>;

  const progress = Math.min(100, (profile.coins / profile.next_level_coins) * 100);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {/* Profile Card */}
      <Card className="mb-6 bg-gradient-to-br from-card-bg to-amber-500/5">
        <div className="text-center mb-6">
          <p className="text-5xl mb-2">{profile.level_emoji}</p>
          <h2 className="text-2xl font-black text-text">{profile.name || 'User'}</h2>
          <p className="text-amber-400 font-bold">{profile.level} Level</p>
        </div>
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center mb-4">
          <p className="text-4xl font-black text-amber-400">🪙 {profile.coins}</p>
          <p className="text-text-muted text-xs mt-1">Total Coins</p>
          <div className="w-full bg-background-alt rounded-full h-2 mt-3"><div className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} /></div>
          <p className="text-text-muted text-[10px] mt-1">{profile.coins}/{profile.next_level_coins} to next level</p>
        </div>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {Object.entries(profile.stats).map(([k, v]) => (
            <div key={k} className="bg-background-alt rounded-lg p-2 text-center">
              <p className="text-text font-bold text-lg">{v}</p>
              <p className="text-text-muted text-[8px] font-bold">{k.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Badges */}
      <Card className="mb-6">
        <h3 className="text-lg font-black text-text mb-4">🏅 Badges ({profile.badges.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {profile.badges.map(b => (
            <div key={b.name} className="bg-background-alt rounded-xl p-3 text-center border border-border hover:border-amber-500/30 transition">
              <p className="text-2xl mb-1">{b.icon}</p>
              <p className="text-text font-bold text-xs">{b.name}</p>
              <p className="text-text-muted text-[9px]">{b.description}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Leaderboard */}
      {leaderboard && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <h3 className="text-lg font-black text-text mb-3">🚗 Top Drivers</h3>
            {leaderboard.top_drivers?.map(d => (
              <div key={d.rank} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{d.rank === 1 ? '🥇' : d.rank === 2 ? '🥈' : d.rank === 3 ? '🥉' : `#${d.rank}`}</span>
                  <span className="text-text text-sm font-bold">{d.name}</span>
                </div>
                <span className="text-text-muted text-xs">{d.rides} rides</span>
              </div>
            ))}
          </Card>
          <Card>
            <h3 className="text-lg font-black text-text mb-3">🛍️ Top Sellers</h3>
            {leaderboard.top_sellers?.map(s => (
              <div key={s.rank} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{s.rank === 1 ? '🥇' : s.rank === 2 ? '🥈' : s.rank === 3 ? '🥉' : `#${s.rank}`}</span>
                  <span className="text-text text-sm font-bold">{s.name}</span>
                </div>
                <span className="text-text-muted text-xs">{s.sold} sold</span>
              </div>
            ))}
          </Card>
        </div>
      )}
    </motion.div>
  );
}

function GroupsTab({ authHeaders, API_URL, Card, Btn, Label, Input }) {
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', from_location: '', to_location: '', departure_time: '08:00', group_type: 'commute' });

  useEffect(() => {
    fetch(`${API_URL}/api/v1/carpool/groups`, { headers: authHeaders }).then(r => r.json()).then(d => setGroups(d.groups || [])).catch(() => {});
  }, []);

  const createGroup = async () => {
    try {
      await fetch(`${API_URL}/api/v1/carpool/groups`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(form)
      });
      setShowCreate(false);
      const r = await fetch(`${API_URL}/api/v1/carpool/groups`, { headers: authHeaders });
      const d = await r.json();
      setGroups(d.groups || []);
    } catch (e) { alert('Failed'); }
  };

  const joinGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/groups/${groupId}/join`, { method: 'POST', headers: authHeaders });
      const d = await res.json();
      alert(d.message || 'Joined!');
    } catch (e) { alert('Failed'); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-xl font-black text-text">👥 Ride Sharing Groups</h2><p className="text-text-muted text-xs">Join or create commute groups</p></div>
        <Btn onClick={() => setShowCreate(!showCreate)}>+ Create Group</Btn>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Group Name</Label><Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g., IT Park Commuters" /></div>
            <div><Label>Type</Label>
              <select value={form.group_type} onChange={e => setForm({...form, group_type: e.target.value})} className="w-full bg-background-alt text-text rounded-xl px-4 py-3 border border-border text-sm outline-none">
                <option value="commute">🏢 Office Commute</option><option value="school">🏫 School Run</option><option value="weekend">🌄 Weekend Trip</option>
              </select>
            </div>
            <div><Label>From</Label><Input value={form.from_location} onChange={e => setForm({...form, from_location: e.target.value})} placeholder="Pickup area" /></div>
            <div><Label>To</Label><Input value={form.to_location} onChange={e => setForm({...form, to_location: e.target.value})} placeholder="Drop area" /></div>
          </div>
          <Btn onClick={createGroup} className="mt-4">Create Group 👥</Btn>
        </Card>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(g => (
          <Card key={g.id}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="text-text font-bold">{g.name}</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-bold">{g.group_type}</span>
            </div>
            <p className="text-text-muted text-xs mb-1">📍 {g.from_location} → {g.to_location}</p>
            <p className="text-text-muted text-xs mb-3">👥 {g.member_count}/{g.max_members} members · by {g.creator_name}</p>
            <button onClick={() => joinGroup(g.id)} className="w-full py-2 rounded-xl bg-cyan-600/20 text-cyan-400 font-bold text-sm hover:bg-cyan-600/30 transition">Join Group</button>
          </Card>
        ))}
        {groups.length === 0 && <Card className="col-span-full text-center py-8"><p className="text-3xl mb-2">👥</p><p className="text-text-muted">No groups yet. Create the first one!</p></Card>}
      </div>
    </motion.div>
  );
}

export default function AdvancedFeaturesPage() {
  const [activeTab, setActiveTab] = useState('cost-calc');
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // ═══ COST CALCULATOR STATE ═══
  const [costForm, setCostForm] = useState({ distance_km: 25, fuel_price_per_liter: 105, mileage_kmpl: 15, toll_amount: 0, passengers: 2 });
  const [costResult, setCostResult] = useState(null);

  // ═══ OTP STATE ═══
  const [otpRideId, setOtpRideId] = useState('');
  const [otps, setOtps] = useState([]);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [verifyBookingId, setVerifyBookingId] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);

  // ═══ CARBON STATE ═══
  const [carbonData, setCarbonData] = useState(null);

  // ═══ AI PRICE STATE ═══
  const [priceForm, setPriceForm] = useState({ category: 'Electronics', condition: 'Good', title: '' });
  const [priceResult, setPriceResult] = useState(null);

  // ═══ ESCROW STATE ═══
  const [escrowForm, setEscrowForm] = useState({ listing_id: '', amount: '' });
  const [escrowResult, setEscrowResult] = useState(null);

  // ═══ TRUST SCORE STATE ═══
  const [trustSellerId, setTrustSellerId] = useState('');
  const [trustResult, setTrustResult] = useState(null);

  // ═══ RESUME STATE ═══
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeResult, setResumeResult] = useState(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const fileRef = useRef(null);

  // ═══ SKILL GAP STATE ═══
  const [gapJobId, setGapJobId] = useState('');
  const [gapResult, setGapResult] = useState(null);

  // ═══ ALERTS STATE ═══
  const [alertForm, setAlertForm] = useState({ keywords: '', job_type: '', min_salary: '', frequency: 'daily' });
  const [alerts, setAlerts] = useState([]);

  // ═══ EMPLOYER STATE ═══
  const [employerDash, setEmployerDash] = useState(null);

  // ═══ HANDLERS ═══
  const calculateCost = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/cost-calculator`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(costForm)
      });
      const data = await res.json();
      setCostResult(data.calculation);
    } catch (e) { alert('Failed'); }
  };

  const generateOTP = async () => {
    if (!otpRideId) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides/${otpRideId}/generate-otp`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      setOtps(data.otps || []);
    } catch (e) { alert('Failed to generate OTP'); }
  };

  const handleVerifyOtp = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides/${otpRideId}/verify-otp`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ otp_code: verifyOtp, booking_id: parseInt(verifyBookingId) })
      });
      const data = await res.json();
      if (data.success) setOtpVerified(true);
      else alert(data.error);
    } catch (e) { alert('Verification failed'); }
  };

  const loadCarbon = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/carbon-dashboard`, { headers: authHeaders });
      const data = await res.json();
      setCarbonData(data.dashboard);
    } catch (e) {}
  };

  const suggestPrice = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/price-suggest`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(priceForm)
      });
      const data = await res.json();
      setPriceResult(data.suggestion);
    } catch (e) { alert('Failed'); }
  };

  const createEscrow = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/escrow/create`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ listing_id: escrowForm.listing_id, amount: parseFloat(escrowForm.amount) })
      });
      const data = await res.json();
      setEscrowResult(data.escrow);
    } catch (e) { alert('Failed'); }
  };

  const checkTrust = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/seller-score/${trustSellerId}`, { headers: authHeaders });
      const data = await res.json();
      setTrustResult(data);
    } catch (e) { alert('Failed'); }
  };

  const uploadResume = async () => {
    if (!resumeFile) return;
    setResumeLoading(true);
    try {
      const formData = new FormData();
      formData.append('resume', resumeFile);
      const res = await fetch(`${API_URL}/api/v1/jobs/resume-upload`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData
      });
      const data = await res.json();
      setResumeResult(data);
    } catch (e) { alert('Upload failed'); }
    setResumeLoading(false);
  };

  const analyzeSkillGap = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/skill-gap`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ job_id: gapJobId })
      });
      const data = await res.json();
      setGapResult(data.analysis);
    } catch (e) { alert('Failed'); }
  };

  const createAlert = async () => {
    try {
      await fetch(`${API_URL}/api/v1/jobs/alerts`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(alertForm)
      });
      loadAlerts();
      setAlertForm({ keywords: '', job_type: '', min_salary: '', frequency: 'daily' });
    } catch (e) { alert('Failed'); }
  };

  const loadAlerts = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/alerts`, { headers: authHeaders });
      const data = await res.json();
      setAlerts(data.alerts || []);
    } catch (e) {}
  };

  const loadEmployer = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/jobs/employer/dashboard`, { headers: authHeaders });
      const data = await res.json();
      setEmployerDash(data.dashboard);
    } catch (e) {}
  };

  useEffect(() => {
    if (activeTab === 'carbon') loadCarbon();
    if (activeTab === 'alerts') loadAlerts();
    if (activeTab === 'employer') loadEmployer();
  }, [activeTab]);

  const Card = ({ children, className = '' }) => (
    <div className={`bg-card-bg border border-border rounded-2xl p-6 ${className}`}>{children}</div>
  );
  const Label = ({ children }) => <label className="block text-text-muted text-xs font-bold mb-1.5 uppercase tracking-wider">{children}</label>;
  const Input = ({ ...props }) => <input {...props} className="w-full bg-background-alt text-text rounded-xl px-4 py-3 border border-border text-sm outline-none focus:border-cyan-500/50 transition" />;
  const Btn = ({ children, onClick, color = 'cyan', className = '' }) => (
    <button onClick={onClick} className={`px-6 py-3 rounded-xl font-bold text-sm text-white transition ${color === 'cyan' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500' : color === 'amber' ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400' : color === 'emerald' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : color === 'purple' ? 'bg-gradient-to-r from-purple-600 to-indigo-600' : ''} ${className}`}>{children}</button>
  );
  const StatCard = ({ label, value, icon, color = 'cyan' }) => (
    <div className={`bg-${color}-500/10 border border-${color}-500/20 rounded-xl p-4 text-center`}>
      <p className="text-3xl font-black text-text mb-1">{value}</p>
      <p className="text-text-muted text-xs font-bold">{label}</p>
    </div>
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-6 pb-20 px-4 md:px-8 max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-black text-text mb-2">⚡ Advanced Features Hub</h1>
          <p className="text-text-muted">Phase A — Cost Calculator · Safe Pay · AI Pricing · Resume Parser · Skill Gap · Alerts</p>
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex-shrink-0 px-4 py-2.5 rounded-xl font-bold text-xs transition whitespace-nowrap ${activeTab === t.key ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' : 'bg-card-bg text-text-muted border border-border hover:border-cyan-500/30'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ═══════════════════════════════════════════ */}
        {/* 🧮 COST CALCULATOR */}
        {activeTab === 'cost-calc' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1 flex items-center gap-2">🧮 Ride Cost Splitter</h2>
              <p className="text-text-muted text-xs mb-6">Calculate fare split and compare with Ola/Uber</p>
              <div className="space-y-4">
                <div><Label>Distance (km)</Label><Input type="number" value={costForm.distance_km} onChange={e => setCostForm({...costForm, distance_km: parseFloat(e.target.value)})} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Fuel ₹/L</Label><Input type="number" value={costForm.fuel_price_per_liter} onChange={e => setCostForm({...costForm, fuel_price_per_liter: parseFloat(e.target.value)})} /></div>
                  <div><Label>Mileage km/L</Label><Input type="number" value={costForm.mileage_kmpl} onChange={e => setCostForm({...costForm, mileage_kmpl: parseFloat(e.target.value)})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Toll ₹</Label><Input type="number" value={costForm.toll_amount} onChange={e => setCostForm({...costForm, toll_amount: parseFloat(e.target.value)})} /></div>
                  <div><Label>Passengers</Label><Input type="number" value={costForm.passengers} onChange={e => setCostForm({...costForm, passengers: parseInt(e.target.value)})} /></div>
                </div>
                <Btn onClick={calculateCost} className="w-full">Calculate Split 🧮</Btn>
              </div>
            </Card>
            {costResult && (
              <Card className="bg-gradient-to-br from-card-bg to-cyan-500/5">
                <h3 className="text-lg font-black text-text mb-4">📊 Results</h3>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-cyan-400">₹{costResult.per_person_cost}</p>
                    <p className="text-text-muted text-xs font-bold">Per Person</p>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                    <p className="text-3xl font-black text-emerald-400">₹{costResult.comparison.savings_per_person}</p>
                    <p className="text-text-muted text-xs font-bold">You Save vs Ola</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Total fuel cost</span><span className="text-text font-bold">₹{costResult.fuel_cost}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Ola estimate</span><span className="text-red-400 font-bold line-through">₹{costResult.comparison.ola_estimate}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Savings</span><span className="text-emerald-400 font-bold">{costResult.comparison.savings_percent}% cheaper</span></div>
                  <div className="flex justify-between border-t border-border pt-2 mt-2"><span className="text-text-muted">🌿 CO₂ saved</span><span className="text-emerald-400 font-bold">{costResult.eco_impact.co2_saved_grams}g</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">🌳 = Trees</span><span className="text-emerald-400 font-bold">{costResult.eco_impact.trees_equivalent}</span></div>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 🔐 RIDE OTP */}
        {activeTab === 'otp' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">🔐 Generate Ride OTP</h2>
              <p className="text-text-muted text-xs mb-6">4-digit verification before ride starts</p>
              <Label>Ride ID</Label>
              <Input value={otpRideId} onChange={e => setOtpRideId(e.target.value)} placeholder="Enter your ride ID" />
              <Btn onClick={generateOTP} className="w-full mt-4">Generate OTP 🔑</Btn>
              {otps.length > 0 && (
                <div className="mt-4 space-y-2">
                  <h3 className="text-sm font-bold text-text">OTPs Generated:</h3>
                  {otps.map((o, i) => (
                    <div key={i} className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex justify-between items-center">
                      <span className="text-text-muted text-sm">Booking #{o.booking_id}</span>
                      <span className="text-2xl font-black text-emerald-400 tracking-[0.3em]">{o.otp}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <h2 className="text-xl font-black text-text mb-1">✅ Verify OTP</h2>
              <p className="text-text-muted text-xs mb-6">Passenger verifies before boarding</p>
              <div className="space-y-4">
                <div><Label>Booking ID</Label><Input value={verifyBookingId} onChange={e => setVerifyBookingId(e.target.value)} placeholder="Booking ID" /></div>
                <div><Label>OTP Code</Label><Input value={verifyOtp} onChange={e => setVerifyOtp(e.target.value)} placeholder="4-digit OTP" maxLength={4} /></div>
                <Btn onClick={handleVerifyOtp} color="emerald" className="w-full">Verify & Start Ride ✅</Btn>
                {otpVerified && <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"><p className="text-emerald-400 font-bold text-lg">✅ OTP Verified! Ride can start.</p></div>}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 🌿 CARBON DASHBOARD */}
        {activeTab === 'carbon' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Card>
              <h2 className="text-xl font-black text-text mb-6 flex items-center gap-2">🌿 Your Green Impact</h2>
              {carbonData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-emerald-400">{carbonData.total_co2_saved_kg}</p><p className="text-text-muted text-xs font-bold">kg CO₂ Saved</p></div>
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-cyan-400">{carbonData.total_km}</p><p className="text-text-muted text-xs font-bold">km Shared</p></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-amber-400">₹{carbonData.total_money_saved}</p><p className="text-text-muted text-xs font-bold">Money Saved</p></div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-purple-400">🌳 {carbonData.trees_equivalent}</p><p className="text-text-muted text-xs font-bold">Trees Equivalent</p></div>
                </div>
              ) : (
                <div className="text-center py-12"><p className="text-4xl mb-4">🌱</p><p className="text-text-muted">Start sharing rides to build your green impact!</p></div>
              )}
            </Card>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 💰 AI PRICE SUGGESTION */}
        {activeTab === 'price-ai' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">💰 AI Price Suggestion</h2>
              <p className="text-text-muted text-xs mb-6">Get the best price for your item</p>
              <div className="space-y-4">
                <div><Label>Title</Label><Input value={priceForm.title} onChange={e => setPriceForm({...priceForm, title: e.target.value})} placeholder="e.g., iPhone 13 Pro" /></div>
                <div><Label>Category</Label>
                  <select value={priceForm.category} onChange={e => setPriceForm({...priceForm, category: e.target.value})} className="w-full bg-background-alt text-text rounded-xl px-4 py-3 border border-border text-sm outline-none">
                    {['Electronics','Furniture','Home Appliances','Sports & Fitness','Books & Stationery','Vehicles','Kitchen & Dining'].map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div><Label>Condition</Label>
                  <div className="flex gap-2">{['Like New','Excellent','Good','Fair'].map(c => (
                    <button key={c} onClick={() => setPriceForm({...priceForm, condition: c})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${priceForm.condition === c ? 'bg-cyan-600 text-white' : 'bg-background-alt text-text-muted border border-border'}`}>{c}</button>
                  ))}</div>
                </div>
                <Btn onClick={suggestPrice} color="amber" className="w-full">Get AI Price 🤖</Btn>
              </div>
            </Card>
            {priceResult && (
              <Card className="bg-gradient-to-br from-card-bg to-amber-500/5">
                <h3 className="text-lg font-black text-text mb-4">🎯 Price Recommendation</h3>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 text-center mb-4">
                  <p className="text-text-muted text-xs font-bold mb-1">Recommended Price</p>
                  <p className="text-4xl font-black text-amber-400">₹{priceResult.recommended_price?.toLocaleString()}</p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Price range</span><span className="text-text font-bold">₹{priceResult.price_range?.min?.toLocaleString()} — ₹{priceResult.price_range?.max?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Market avg</span><span className="text-text font-bold">₹{priceResult.market_data?.avg_price?.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Based on</span><span className="text-text font-bold">{priceResult.market_data?.sample_size} listings</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Condition</span><span className="text-text font-bold">{priceResult.condition_adjustment}</span></div>
                </div>
                <p className="mt-4 text-xs text-cyan-400 font-bold bg-cyan-500/10 rounded-lg p-3">💡 {priceResult.tip}</p>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 🛡️ ESCROW SAFE PAY */}
        {activeTab === 'escrow' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">🛡️ Escrow Safe Pay</h2>
              <p className="text-text-muted text-xs mb-6">Your money is held safely until you receive the item</p>
              <div className="space-y-4">
                <div><Label>Listing ID</Label><Input value={escrowForm.listing_id} onChange={e => setEscrowForm({...escrowForm, listing_id: e.target.value})} placeholder="Paste listing ID" /></div>
                <div><Label>Amount (₹)</Label><Input type="number" value={escrowForm.amount} onChange={e => setEscrowForm({...escrowForm, amount: e.target.value})} placeholder="₹ Amount to pay" /></div>
                <Btn onClick={createEscrow} color="emerald" className="w-full">Hold Payment Safely 🔒</Btn>
              </div>
              <div className="mt-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-xs text-text-muted space-y-1">
                <p>✅ 1. You pay → money held by platform</p>
                <p>✅ 2. Seller delivers the item</p>
                <p>✅ 3. You confirm receipt → money released</p>
                <p>✅ 4. Issue? → Raise dispute within 48h</p>
              </div>
            </Card>
            {escrowResult && (
              <Card className="bg-gradient-to-br from-card-bg to-emerald-500/5">
                <h3 className="text-lg font-black text-text mb-4">💰 Payment Held</h3>
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center mb-4">
                  <p className="text-3xl font-black text-emerald-400">₹{escrowResult.amount?.toLocaleString()}</p>
                  <p className="text-text-muted text-xs mt-1">Status: <span className="text-amber-400 font-bold uppercase">{escrowResult.status}</span></p>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-text-muted">Platform fee</span><span className="text-text font-bold">₹{escrowResult.platform_fee}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Seller gets</span><span className="text-emerald-400 font-bold">₹{escrowResult.net_to_seller}</span></div>
                  <div className="flex justify-between"><span className="text-text-muted">Escrow ID</span><span className="text-text font-mono text-xs">{escrowResult.id?.substring(0, 12)}...</span></div>
                </div>
                <p className="mt-4 text-xs text-emerald-400 font-bold bg-emerald-500/10 rounded-lg p-3">{escrowResult.message}</p>
                <div className="flex gap-2 mt-4">
                  <button onClick={async () => {
                    try {
                      const res = await fetch(`${API_URL}/api/v1/marketplace/escrow/${escrowResult.id}/release`, { method: 'POST', headers: authHeaders });
                      const data = await res.json();
                      alert(data.message || 'Payment released to seller!');
                    } catch (e) { alert('Failed'); }
                  }} className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition shadow-lg">
                    Confirm & Release Pay ✅
                  </button>
                  <button onClick={async () => {
                    try {
                      const res = await fetch(`${API_URL}/api/v1/marketplace/escrow/${escrowResult.id}/dispute`, {
                        method: 'POST', headers: authHeaders, body: JSON.stringify({ reason: 'Item not as described' })
                      });
                      const data = await res.json();
                      alert(data.message || 'Dispute raised. Admin will review within 48h.');
                    } catch (e) { alert('Failed'); }
                  }} className="py-2.5 px-4 bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30 font-bold rounded-xl text-xs transition">
                    Raise Dispute ⚠️
                  </button>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ⭐ TRUST SCORE */}
        {activeTab === 'trust' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">⭐ Seller Trust Score</h2>
              <p className="text-text-muted text-xs mb-6">Check any seller's credibility before buying</p>
              <Label>Seller ID</Label>
              <Input value={trustSellerId} onChange={e => setTrustSellerId(e.target.value)} placeholder="Enter seller ID" />
              <Btn onClick={checkTrust} color="purple" className="w-full mt-4">Check Trust Score ⭐</Btn>
            </Card>
            {trustResult && (
              <Card className="bg-gradient-to-br from-card-bg to-purple-500/5">
                <div className="text-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500/20 to-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                    <span className="text-4xl font-black text-purple-400">{trustResult.trust_score?.score}</span>
                  </div>
                  <p className="text-lg font-bold text-text">{trustResult.seller?.name}</p>
                  <p className="text-sm font-bold text-purple-400">{trustResult.trust_score?.level}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-background-alt rounded-lg p-3 text-center"><p className="text-text font-bold">{trustResult.trust_score?.total_listings}</p><p className="text-text-muted text-[10px]">Listings</p></div>
                  <div className="bg-background-alt rounded-lg p-3 text-center"><p className="text-text font-bold">{trustResult.trust_score?.total_sold}</p><p className="text-text-muted text-[10px]">Sold</p></div>
                  <div className="bg-background-alt rounded-lg p-3 text-center"><p className="text-text font-bold">{trustResult.trust_score?.account_age_days}d</p><p className="text-text-muted text-[10px]">Account Age</p></div>
                  <div className="bg-background-alt rounded-lg p-3 text-center"><p className="text-text font-bold">{trustResult.trust_score?.verified_phone ? '✅' : '❌'}</p><p className="text-text-muted text-[10px]">Phone Verified</p></div>
                </div>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 📄 RESUME PARSER */}
        {activeTab === 'resume' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">📄 AI Resume Parser</h2>
              <p className="text-text-muted text-xs mb-6">Upload PDF/TXT — auto-extract skills, education, experience</p>
              <div onClick={() => fileRef.current?.click()} className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-cyan-500/50 transition">
                <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-text-muted text-sm">{resumeFile ? resumeFile.name : 'Click to upload resume (PDF, TXT, DOCX)'}</p>
              </div>
              <input type="file" ref={fileRef} onChange={e => setResumeFile(e.target.files[0])} accept=".pdf,.txt,.docx" className="hidden" />
              <Btn onClick={uploadResume} className="w-full mt-4" color="purple">{resumeLoading ? 'Parsing...' : 'Upload & Parse Resume 🧠'}</Btn>
            </Card>
            {resumeResult?.parsed && (
              <Card className="bg-gradient-to-br from-card-bg to-indigo-500/5 overflow-y-auto max-h-[600px]">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-text">🎯 Parsed Results</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${resumeResult.parsed.health_score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : resumeResult.parsed.health_score >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>{resumeResult.parsed.health_score}% Health</span>
                </div>
                {resumeResult.parsed.name && <div className="mb-2"><Label>Name</Label><p className="text-text font-bold">{resumeResult.parsed.name}</p></div>}
                {resumeResult.parsed.email && <div className="mb-2"><Label>Email</Label><p className="text-text text-sm">{resumeResult.parsed.email}</p></div>}
                {resumeResult.parsed.phone && <div className="mb-2"><Label>Phone</Label><p className="text-text text-sm">{resumeResult.parsed.phone}</p></div>}
                {resumeResult.parsed.experience_years > 0 && <div className="mb-2"><Label>Experience</Label><p className="text-text text-sm">{resumeResult.parsed.experience_years} years</p></div>}
                {resumeResult.parsed.skills?.length > 0 && (
                  <div className="mb-3">
                    <Label>Skills ({resumeResult.parsed.skills.length})</Label>
                    <div className="flex flex-wrap gap-1.5 mt-1">{resumeResult.parsed.skills.map(s => <span key={s} className="px-2 py-1 bg-cyan-500/10 text-cyan-400 text-[10px] font-bold rounded-lg">{s}</span>)}</div>
                  </div>
                )}
                {resumeResult.parsed.education?.length > 0 && (
                  <div className="mb-3"><Label>Education</Label>{resumeResult.parsed.education.map(e => <p key={e} className="text-text text-sm">🎓 {e}</p>)}</div>
                )}
                {resumeResult.parsed.languages?.length > 0 && (
                  <div><Label>Languages</Label><p className="text-text text-sm">{resumeResult.parsed.languages.join(', ')}</p></div>
                )}
                <p className="mt-4 text-xs text-cyan-400">{resumeResult.message}</p>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 📈 SKILL GAP */}
        {activeTab === 'skill-gap' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">📈 Skill Gap Analyzer</h2>
              <p className="text-text-muted text-xs mb-6">See what skills you need for any job</p>
              <Label>Job Posting ID</Label>
              <Input value={gapJobId} onChange={e => setGapJobId(e.target.value)} placeholder="Enter job ID to analyze" />
              <Btn onClick={analyzeSkillGap} color="amber" className="w-full mt-4">Analyze My Fit 📊</Btn>
            </Card>
            {gapResult && (
              <Card>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 rounded-full border-4 border-cyan-500/30 flex items-center justify-center mx-auto mb-2" style={{ background: `conic-gradient(#06b6d4 ${gapResult.current_match}%, transparent 0)` }}>
                    <div className="w-14 h-14 rounded-full bg-card-bg flex items-center justify-center"><span className="text-xl font-black text-text">{gapResult.current_match}%</span></div>
                  </div>
                  <p className="text-text-muted text-xs">Current Match Score</p>
                </div>
                {gapResult.matched_skills?.length > 0 && (
                  <div className="mb-4"><p className="text-xs font-bold text-emerald-400 mb-2">✅ Skills You Have ({gapResult.matched_skills.length})</p>
                    <div className="flex flex-wrap gap-1.5">{gapResult.matched_skills.map(s => <span key={s.skill} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg">✅ {s.skill}</span>)}</div>
                  </div>
                )}
                {gapResult.missing_skills?.length > 0 && (
                  <div className="mb-4"><p className="text-xs font-bold text-red-400 mb-2">❌ Skills You Need ({gapResult.missing_skills.length})</p>
                    {gapResult.missing_skills.map(s => (
                      <div key={s.skill} className="flex items-center justify-between bg-red-500/5 rounded-lg p-2 mb-1">
                        <span className="text-text text-sm font-bold">{s.skill}</span>
                        <a href={s.learn_url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-cyan-400 font-bold hover:underline">Learn Free →</a>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-cyan-400 font-bold bg-cyan-500/10 rounded-lg p-3">{gapResult.recommendation}</p>
              </Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 🔔 JOB ALERTS */}
        {activeTab === 'alerts' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid md:grid-cols-2 gap-6">
            <Card>
              <h2 className="text-xl font-black text-text mb-1">🔔 Job Alerts</h2>
              <p className="text-text-muted text-xs mb-6">Get notified for matching jobs</p>
              <div className="space-y-4">
                <div><Label>Keywords</Label><Input value={alertForm.keywords} onChange={e => setAlertForm({...alertForm, keywords: e.target.value})} placeholder="e.g., React Developer" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Job Type</Label><Input value={alertForm.job_type} onChange={e => setAlertForm({...alertForm, job_type: e.target.value})} placeholder="Full-time" /></div>
                  <div><Label>Min Salary ₹</Label><Input type="number" value={alertForm.min_salary} onChange={e => setAlertForm({...alertForm, min_salary: e.target.value})} placeholder="15000" /></div>
                </div>
                <div><Label>Frequency</Label>
                  <div className="flex gap-2">{['instant','daily','weekly'].map(f => (
                    <button key={f} onClick={() => setAlertForm({...alertForm, frequency: f})} className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize ${alertForm.frequency === f ? 'bg-cyan-600 text-white' : 'bg-background-alt text-text-muted border border-border'}`}>{f}</button>
                  ))}</div>
                </div>
                <Btn onClick={createAlert} className="w-full">Create Alert 🔔</Btn>
              </div>
            </Card>
            <Card>
              <h3 className="text-lg font-black text-text mb-4">📋 My Alerts ({alerts.length})</h3>
              {alerts.length === 0 ? (
                <div className="text-center py-8"><p className="text-3xl mb-2">🔕</p><p className="text-text-muted text-sm">No alerts yet</p></div>
              ) : alerts.map(a => (
                <div key={a.id} className="bg-background-alt rounded-xl p-3 mb-2 flex justify-between items-center">
                  <div>
                    <p className="text-text font-bold text-sm">{a.keywords || 'All Jobs'}</p>
                    <p className="text-text-muted text-[10px]">{a.job_type || 'Any'} · {a.frequency} · Min ₹{a.min_salary || '0'}</p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
              ))}
            </Card>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 👔 EMPLOYER DASHBOARD */}
        {activeTab === 'employer' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {employerDash ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-cyan-400">{employerDash.total_jobs}</p><p className="text-text-muted text-xs font-bold">Active Jobs</p></div>
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-purple-400">{employerDash.total_applications}</p><p className="text-text-muted text-xs font-bold">Applications</p></div>
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-amber-400">{employerDash.total_views}</p><p className="text-text-muted text-xs font-bold">Total Views</p></div>
                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center"><p className="text-3xl font-black text-emerald-400">{employerDash.conversion_rate}%</p><p className="text-text-muted text-xs font-bold">Conversion</p></div>
                </div>
                <div className="space-y-3">
                  {employerDash.jobs?.map(j => (
                    <Card key={j.job_id}>
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-text font-bold">{j.title}</h3>
                          <p className="text-text-muted text-xs">{j.total_applications} applicants · Avg match: {j.avg_match_score}%</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${j.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{j.status}</span>
                      </div>
                      {j.stage_breakdown && Object.keys(j.stage_breakdown).length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">{Object.entries(j.stage_breakdown).map(([stage, cnt]) => (
                          <span key={stage} className="text-[10px] px-2 py-1 rounded-lg bg-background-alt text-text-muted font-bold">{stage}: {cnt}</span>
                        ))}</div>
                      )}
                    </Card>
                  ))}
                </div>
              </>
            ) : (
              <Card className="text-center py-12"><p className="text-4xl mb-3">👔</p><p className="text-text-muted">Post jobs first to see employer dashboard</p></Card>
            )}
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* 🔨 AUCTIONS */}
        {activeTab === 'auctions' && <AuctionsTab authHeaders={authHeaders} API_URL={API_URL} Card={Card} Btn={Btn} Label={Label} Input={Input} />}

        {/* 📝 SKILL QUIZZES */}
        {activeTab === 'quizzes' && <QuizzesTab authHeaders={authHeaders} API_URL={API_URL} Card={Card} Btn={Btn} />}

        {/* 🏆 GAMIFICATION */}
        {activeTab === 'gamify' && <GamificationTab authHeaders={authHeaders} API_URL={API_URL} Card={Card} />}

        {/* 👥 RIDE GROUPS */}
        {activeTab === 'groups' && <GroupsTab authHeaders={authHeaders} API_URL={API_URL} Card={Card} Btn={Btn} Label={Label} Input={Input} />}

      </main>
      <Footer />
    </>
  );
}
