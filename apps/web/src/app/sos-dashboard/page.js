'use client';
import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AlertTriangle, MapPin, Phone, CheckCircle, 
  ShieldAlert, Activity, Droplet, Users, Navigation
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

const SOSMap = dynamic(() => import('./components/SOSMap'), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-800 animate-pulse flex items-center justify-center rounded-3xl border border-slate-700">
      <div className="flex flex-col items-center gap-2 text-slate-500">
        <Navigation className="w-6 h-6 animate-bounce" />
        <span className="font-bold">Loading Live Radar...</span>
      </div>
    </div>
  )
});

export default function SOSDashboard() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock fetch active alerts
    setTimeout(() => {
      setAlerts([
        { id: 'SOS-001', type: 'Medical', full_name: 'Rahul Verma', phone: '+91 9876543210', location: 'Ganga Arcadia, Lohegaon', latitude: 18.5810, longitude: 73.8820, created_at: new Date().toISOString(), status: 'active' },
        { id: 'SOS-002', type: 'Blood', bloodGroup: 'O+', full_name: 'Priya Sharma', phone: '+91 9123456789', location: 'Dhanori Animal Hospital', latitude: 18.5750, longitude: 73.8780, created_at: new Date(Date.now() - 1800000).toISOString(), status: 'active' }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const handleResolve = (id, resolution) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
    alert(`Alert ${id} marked as ${resolution}.`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans">
      <Header />
      
      <main className="flex-1 py-8 lg:py-12">
        <div className="container max-w-7xl">
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-slate-800 pb-8">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </div>
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-3 uppercase tracking-wider font-bold">Live Feed</Badge>
              </div>
              <h1 className="text-3xl lg:text-5xl font-black text-white">Emergency Response Radar</h1>
              <p className="text-slate-400 mt-2 text-lg">Monitoring real-time SOS alerts and critical community requests.</p>
            </div>
            
            <div className="flex gap-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center text-red-500"><AlertTriangle className="w-6 h-6"/></div>
                    <div>
                        <div className="text-sm text-slate-400 font-bold uppercase">Active SOS</div>
                        <div className="text-2xl font-black text-white">{alerts.filter(a => a.type !== 'Blood').length}</div>
                    </div>
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500"><Droplet className="w-6 h-6"/></div>
                    <div>
                        <div className="text-sm text-slate-400 font-bold uppercase">Blood Requests</div>
                        <div className="text-2xl font-black text-white">{alerts.filter(a => a.type === 'Blood').length}</div>
                    </div>
                </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[700px]">
            
            {/* Left Side: Alerts List */}
            <div className="col-span-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center h-40">
                    <div className="w-8 h-8 border-4 border-slate-800 border-t-red-500 rounded-full animate-spin"></div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center h-full flex flex-col items-center justify-center">
                    <ShieldAlert className="w-16 h-16 text-emerald-500/50 mb-4" />
                    <h3 className="text-xl font-bold text-white mb-2">All Clear</h3>
                    <p className="text-slate-400">No active emergencies in your monitored zones.</p>
                </div>
              ) : (
                <AnimatePresence>
                    {alerts.map(alert => (
                        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, scale: 0.9 }} key={alert.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-lg">
                            {alert.type !== 'Blood' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />}
                            {alert.type === 'Blood' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-pink-500" />}
                            
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    {alert.type === 'Blood' ? (
                                        <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 px-3 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><Droplet className="w-3 h-3"/> Blood Required: {alert.bloodGroup}</Badge>
                                    ) : (
                                        <Badge className="bg-red-500/10 text-red-500 border-red-500/20 px-3 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5"><Activity className="w-3 h-3"/> Medical Emergency</Badge>
                                    )}
                                    <h3 className="text-xl font-bold text-white">{alert.full_name}</h3>
                                </div>
                                <div className="text-xs font-bold text-slate-500 bg-slate-950 px-2 py-1 rounded-md">
                                    {new Date(alert.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </div>
                            </div>
                            
                            <div className="space-y-3 mb-6 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                                <div className="flex items-center gap-3 text-sm">
                                    <Phone className="w-4 h-4 text-slate-400" />
                                    <span className="font-mono text-slate-300">{alert.phone}</span>
                                </div>
                                <div className="flex items-start gap-3 text-sm">
                                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                                    <span className="text-slate-300 leading-tight">{alert.location}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Button size="sm" variant="outline" className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500 hover:text-white" onClick={() => handleResolve(alert.id, 'resolved')}>
                                    <CheckCircle className="w-4 h-4 mr-2"/> Resolved
                                </Button>
                                <Button size="sm" variant="outline" className="border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white" onClick={() => handleResolve(alert.id, 'false alarm')}>
                                    Mark Fake
                                </Button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
              )}
            </div>

            {/* Right Side: Map */}
            <div className="col-span-1 lg:col-span-2 rounded-3xl border border-slate-800 overflow-hidden bg-slate-900 shadow-2xl relative">
                <SOSMap alerts={alerts} />
                
                {/* Map Overlay Controls */}
                <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
                    <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-2xl shadow-lg w-48">
                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Legend</h4>
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></span> Medical SOS</div>
                            <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-rose-500 animate-pulse"></span> Blood Request</div>
                            <div className="flex items-center gap-2 text-sm"><span className="w-3 h-3 rounded-full bg-blue-500"></span> Volunteers</div>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
