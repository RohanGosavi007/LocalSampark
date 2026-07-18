'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, Map as MapIcon, TrendingUp, Navigation, 
  Clock, ShieldCheck, MapPin, Truck, AlertTriangle, 
  CheckCircle2, X, Wallet
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const DeliveryMap = dynamic(() => import('./components/DeliveryMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-background-alt animate-pulse flex items-center justify-center rounded-2xl border border-border">
      <div className="flex flex-col items-center gap-2 text-text-muted">
        <Navigation className="w-6 h-6 animate-bounce" />
        <span className="font-bold">Loading Fleet Map...</span>
      </div>
    </div>
  )
});

export default function DeliveryDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [availableJobs, setAvailableJobs] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [otpModal, setOtpModal] = useState({ show: false, jobId: null, otp: '' });

  useEffect(() => {
    fetchJobs();
  }, [activeTab]);

  const fetchJobs = () => {
    setLoading(true);
    setTimeout(() => {
      if (activeTab === 'available') {
        setAvailableJobs([
          { id: 'JOB-901', item_details: 'Grocery (2 items)', pickup_location: 'Sharma Grocery, Dhanori', dropoff_location: 'Ganga Arcadia, Lohegaon', price_fiat: 45, distance: '2.1 km', type: 'grocery' },
          { id: 'JOB-902', item_details: 'Medicines (Prescription)', pickup_location: 'Apollo Pharmacy, Viman Nagar', dropoff_location: 'Rohan Mithila, Viman Nagar', price_fiat: 30, distance: '1.2 km', type: 'pharmacy' },
        ]);
      } else if (activeTab === 'active') {
        setMyJobs([
          { id: 'JOB-801', item_details: 'Bakery Items (Cake)', pickup_location: 'Cake & Co, Dhanori', dropoff_location: 'Porwal Road, Dhanori', price_fiat: 50, coords: { pickup: [18.5793, 73.8780], dropoff: [18.5820, 73.8850] } }
        ]);
      }
      setLoading(false);
    }, 800);
  };

  const handleAcceptJob = (jobId) => {
    alert('Smart Dispatch: Job Assigned! Route optimized.');
    setActiveTab('active');
  };

  const handleCompleteJob = () => {
    if (otpModal.otp === '1234') {
        alert('Delivery Completed Successfully! 🎉 Payment of ₹50 added to wallet.');
        setOtpModal({ show: false, jobId: null, otp: '' });
        fetchJobs();
    } else {
        alert('Invalid OTP. Please check with customer.');
    }
  };

  const stats = [
      { label: "Today's Earnings", value: "₹1,240", icon: TrendingUp, color: "text-green-500", bg: "bg-green-500/10" },
      { label: "Deliveries", value: "28", icon: Package, color: "text-blue-500", bg: "bg-blue-500/10" },
      { label: "Active Runs", value: myJobs.length.toString(), icon: Navigation, color: "text-primary", bg: "bg-primary/10" },
      { label: "Runner Rating", value: "4.9 ⭐", icon: ShieldCheck, color: "text-amber-500", bg: "bg-amber-500/10" }
  ];

  const navItems = [
      { id: "dashboard", label: "Overview", icon: TrendingUp },
      { id: "available", label: "Available Orders", icon: Package },
      { id: "active", label: "Active Map & Route", icon: MapIcon },
      { id: "earnings", label: "Wallet & Earnings", icon: Wallet }
  ];

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <Header />
      
      <div className="flex flex-1 overflow-hidden pt-16 lg:pt-0">
        
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-72 bg-background border-r border-border p-6 shadow-sm z-10 overflow-y-auto">
            <div className="mb-8">
                <Badge variant="secondary" className="mb-2">Runner Portal</Badge>
                <h2 className="text-2xl font-heading font-black">Dashboard</h2>
            </div>
            
            <nav className="space-y-2 flex-1">
                {navItems.map(item => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button 
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl font-bold transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105' : 'text-text-muted hover:bg-background-alt hover:text-text'}`}
                        >
                            <Icon className="w-5 h-5" />
                            {item.label}
                        </button>
                    )
                })}
            </nav>
            
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                <div className="flex items-center gap-2 text-red-500 font-bold mb-1"><AlertTriangle className="w-4 h-4" /> SOS Alert</div>
                <p className="text-xs text-text-muted mb-3">Press in case of emergency during delivery.</p>
                <Button variant="outline" className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white" size="sm">Trigger SOS</Button>
            </div>
        </aside>

        {/* Mobile Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 flex justify-between z-40 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
            {navItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                    <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex flex-col items-center gap-1 p-2 ${isActive ? 'text-primary' : 'text-text-muted'}`}>
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] font-bold">{item.label}</span>
                    </button>
                )
            })}
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-10 pb-32 lg:pb-10 bg-section-alt">
            
            <AnimatePresence mode="wait">
                {activeTab === 'dashboard' && (
                    <motion.div key="dash" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div className="mb-8">
                            <h2 className="text-3xl font-heading font-black mb-2">Welcome Back, Runner! 🚀</h2>
                            <p className="text-text-muted">Here is your performance snapshot for today.</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            {stats.map((s, i) => {
                                const Icon = s.icon;
                                return (
                                    <div key={i} className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm hover:-translate-y-1 transition-transform">
                                        <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center mb-4`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-sm font-bold text-text-muted mb-1">{s.label}</div>
                                        <div className="text-3xl font-black">{s.value}</div>
                                    </div>
                                )
                            })}
                        </div>
                        
                        <div className="glass-card p-8 rounded-3xl border border-border bg-background shadow-sm text-center">
                            <div className="text-6xl mb-4">📈</div>
                            <h3 className="text-2xl font-bold mb-2">Detailed Analytics Locked</h3>
                            <p className="text-text-muted max-w-md mx-auto">Full performance graphs and hotspot maps are available on the mobile application.</p>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'available' && (
                    <motion.div key="avail" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-3xl font-heading font-black">Available Orders</h2>
                            <Badge variant="outline" className="animate-pulse bg-green-500/10 text-green-600 border-green-500/20"><Navigation className="w-3 h-3 mr-1"/> Searching Area</Badge>
                        </div>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin"></div></div>
                        ) : availableJobs.length === 0 ? (
                            <div className="text-center py-20 glass-card rounded-3xl border border-border bg-background">
                                <div className="text-6xl mb-4 opacity-50">📡</div>
                                <h3 className="text-xl font-bold mb-2">No Local Jobs</h3>
                                <p className="text-text-muted">Waiting for local shops to broadcast new deliveries...</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {availableJobs.map((job, i) => (
                                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} key={job.id} className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <Badge variant="secondary" className="bg-primary/10 text-primary">{job.type.toUpperCase()}</Badge>
                                                <span className="text-sm font-bold text-text-muted">{job.distance}</span>
                                            </div>
                                            <h3 className="text-xl font-bold mb-4">{job.item_details}</h3>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div className="flex gap-3">
                                                    <div className="mt-1"><MapPin className="w-5 h-5 text-text-muted" /></div>
                                                    <div>
                                                        <div className="text-xs font-bold text-text-muted uppercase">Pickup</div>
                                                        <div className="text-sm font-medium">{job.pickup_location}</div>
                                                    </div>
                                                </div>
                                                <div className="flex gap-3">
                                                    <div className="mt-1"><MapPin className="w-5 h-5 text-primary" /></div>
                                                    <div>
                                                        <div className="text-xs font-bold text-text-muted uppercase">Dropoff</div>
                                                        <div className="text-sm font-medium">{job.dropoff_location}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 md:pl-6">
                                            <div className="text-center md:text-right mb-0 md:mb-4">
                                                <div className="text-xs font-bold text-text-muted uppercase">Earn</div>
                                                <div className="text-3xl font-black text-green-500">₹{job.price_fiat}</div>
                                            </div>
                                            <Button onClick={() => handleAcceptJob(job.id)} className="shadow-lg shadow-primary/20">Accept Job</Button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'active' && (
                    <motion.div key="active" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="h-full flex flex-col">
                        <h2 className="text-3xl font-heading font-black mb-6">Active Map & Route</h2>
                        
                        {loading ? (
                            <div className="flex items-center justify-center py-20"><div className="w-10 h-10 border-4 border-border border-t-primary rounded-full animate-spin"></div></div>
                        ) : myJobs.length === 0 ? (
                            <div className="text-center py-20 glass-card rounded-3xl border border-border bg-background">
                                <div className="text-6xl mb-4 opacity-50">🗺️</div>
                                <h3 className="text-xl font-bold mb-2">No Active Runs</h3>
                                <p className="text-text-muted">Accept a job from the Available Orders tab to start.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                                {/* Left Side: Job Info */}
                                <div className="col-span-1 flex flex-col gap-6 overflow-y-auto pr-2">
                                    {myJobs.map(job => (
                                        <div key={job.id} className="glass-card p-6 rounded-3xl border border-primary/50 bg-primary/5 shadow-md">
                                            <div className="flex justify-between items-start mb-4">
                                                <Badge variant="primary" className="animate-pulse flex gap-1"><Truck className="w-3 h-3"/> In Transit</Badge>
                                                <div className="text-2xl font-black text-green-500">₹{job.price_fiat}</div>
                                            </div>
                                            
                                            <h3 className="text-xl font-bold mb-6">{job.item_details}</h3>
                                            
                                            <div className="relative pl-6 space-y-6 before:absolute before:inset-0 before:ml-[9px] before:h-full before:w-0.5 before:bg-border mb-6">
                                                <div className="relative">
                                                    <div className="absolute -left-[30px] w-4 h-4 rounded-full border-2 border-primary bg-background shadow-sm" />
                                                    <div className="text-xs font-bold text-text-muted uppercase mb-1">Pickup Location</div>
                                                    <div className="font-medium bg-background border border-border p-3 rounded-xl">{job.pickup_location}</div>
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-primary shadow-sm shadow-primary/40" />
                                                    <div className="text-xs font-bold text-text-muted uppercase mb-1">Dropoff Location</div>
                                                    <div className="font-medium bg-background border border-border p-3 rounded-xl">{job.dropoff_location}</div>
                                                </div>
                                            </div>

                                            <Button size="lg" className="w-full bg-green-500 hover:bg-green-600 border-green-500 text-white shadow-lg shadow-green-500/20" onClick={() => setOtpModal({ show: true, jobId: job.id, otp: '' })}>
                                                Complete Delivery
                                            </Button>
                                        </div>
                                    ))}
                                    
                                    <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-2xl">
                                        <div className="flex items-start gap-3">
                                            <Navigation className="w-5 h-5 text-blue-500 mt-0.5" />
                                            <div>
                                                <div className="font-bold text-blue-700 dark:text-blue-400 mb-1">Smart Route Active</div>
                                                <p className="text-sm text-blue-600/80 dark:text-blue-300/80">Follow the highlighted path on the map for the fastest delivery route avoiding traffic.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Right Side: Map */}
                                <div className="col-span-1 lg:col-span-2 rounded-3xl border border-border overflow-hidden bg-background shadow-sm relative">
                                    <DeliveryMap coords={myJobs[0]?.coords} />
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'earnings' && (
                    <motion.div key="earn" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
                        <div className="text-center py-20 glass-card rounded-3xl border border-border bg-background">
                            <div className="text-6xl mb-4 opacity-50">💰</div>
                            <h3 className="text-xl font-bold mb-2">Wallet Module</h3>
                            <p className="text-text-muted">Payouts and transaction history are handled in the mobile app.</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
        </main>
      </div>

      {/* OTP Modal */}
      <AnimatePresence>
        {otpModal.show && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="bg-card-bg w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl border border-border">
                    <div className="p-6 border-b border-border flex justify-between items-center bg-background">
                        <h2 className="text-xl font-heading font-black flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-green-500"/> Complete Order</h2>
                        <button onClick={() => setOtpModal({ show: false, jobId: null, otp: '' })} className="p-2 hover:bg-background-alt rounded-full transition-colors"><X className="w-5 h-5"/></button>
                    </div>
                    <div className="p-6 text-center">
                        <p className="text-text-muted mb-6 text-sm font-medium">Ask the customer for their 4-digit Delivery PIN to securely complete this drop-off.</p>
                        
                        <input 
                            type="text" 
                            maxLength="4"
                            placeholder="• • • •"
                            className="w-full bg-background-alt border border-border rounded-2xl p-4 text-center text-4xl font-black tracking-[1rem] mb-8 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-text-muted/30" 
                            value={otpModal.otp}
                            onChange={(e) => setOtpModal({...otpModal, otp: e.target.value.replace(/[^0-9]/g, '')})}
                        />
                        
                        <Button 
                            size="lg"
                            className="w-full shadow-lg shadow-green-500/20 bg-green-500 hover:bg-green-600 border-green-500 text-white"
                            disabled={otpModal.otp.length !== 4}
                            onClick={handleCompleteJob}
                        >
                            Verify & Submit
                        </Button>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
