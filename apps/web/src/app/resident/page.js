'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Store, MessageSquare, Briefcase, FileText, Wallet, PhoneCall, Check, X, Car } from 'lucide-react';
import { useRouter } from 'next/navigation';
import io from 'socket.io-client';

export default function ResidentSuperApp() {
  const router = useRouter();
  
  const [intercomCall, setIntercomCall] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Connect to WebSocket for Intercom Calls
    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const s = io(BACKEND_URL);
    setSocket(s);

    // Mock resident joining their flat room
    const mockSocietyId = 'SOC-123';
    const mockFlat = 'A-402';
    s.emit('join_flat_room', { societyId: mockSocietyId, flatNo: mockFlat });

    // Listen for gatekeeper calls
    s.on('VISITOR_ALERT', (data) => {
      setIntercomCall(data);
    });

    return () => s.disconnect();
  }, []);

  const handleIntercomAction = (status) => {
    if (socket && intercomCall) {
      socket.emit('VISITOR_RESPONSE', { visitorId: intercomCall.id, status });
    }
    setIntercomCall(null);
  };

  const services = [
    { title: 'Local Shops', icon: Store, color: '#3b82f6', route: '/search' },
    { title: 'Townsquare', icon: MessageSquare, color: '#a855f7', route: '/townsquare' },
    { title: 'Wallet & Rewards', icon: Wallet, color: '#ef4444', route: '/resident/wallet' },
    { title: 'Services', icon: Briefcase, color: '#f59e0b', route: '/resident' },
    { title: 'Notices', icon: FileText, color: '#22c55e', route: '/townsquare' },
    { title: 'My Vehicles', icon: Car, color: '#64748b', route: '/resident' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col md:bg-background-alt">
      <div className="hidden md:block"><Header /></div>

      {/* Mobile Frame Container */}
      <div className="flex-1 max-w-md w-full mx-auto bg-background md:mt-24 md:mb-12 md:rounded-[2rem] md:border-[8px] md:border-border md:shadow-2xl overflow-hidden relative flex flex-col">

        {/* App Bar */}
        <div className="bg-background-alt p-6 border-b border-border z-10 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-text">Green Valley</h1>
            <p className="text-text-muted text-sm">Flat A-402 • Rahul Sharma</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
            R
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Quick Pay Card */}
          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-500/30 rounded-2xl p-6 mb-8 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-blue-500/20 blur-3xl rounded-full"></div>
            <p className="text-text-muted text-sm mb-1">Maintenance Due (Aug)</p>
            <h2 className="text-3xl font-black text-text mb-4">₹4,250</h2>
            <button className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-2 rounded-xl text-sm transition-colors shadow-lg">
              Pay Now
            </button>
          </div>

          <h3 className="text-text font-bold mb-4 px-1">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-4 mb-8">
            {services.map((s, i) => (
              <button
                key={i}
                onClick={() => router.push(s.route)}
                className="bg-background-alt hover:bg-card-bg border border-border rounded-xl p-4 flex flex-col items-center gap-3 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-background border border-border group-hover:border-border transition-colors">
                  <s.icon size={20} style={{ color: s.color }} />
                </div>
                <span className="text-text-muted text-xs font-bold whitespace-nowrap">{s.title}</span>
              </button>
            ))}
          </div>

          {/* Recent Activity */}
          <h3 className="text-text font-bold mb-4 px-1">Recent Activity</h3>
          <div className="bg-background-alt border border-border rounded-2xl p-1 divide-y divide-border/50">
            {[
              { text: 'Water Supply Notice posted', time: '2h ago', icon: FileText, color: 'text-blue-400' },
              { text: 'Zomato Delivery entered', time: 'Yesterday', icon: Store, color: 'text-green-400' },
              { text: 'Maintenance paid successfully', time: 'Aug 2', icon: Wallet, color: 'text-purple-400' },
            ].map((a, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                  <a.icon size={16} className={a.color} />
                </div>
                <div>
                  <p className="text-text text-sm">{a.text}</p>
                  <p className="text-text-muted text-xs mt-0.5">{a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incoming Intercom Call Modal (Full Screen Overlay) */}
        {intercomCall && (
          <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex flex-col items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/20 blur-3xl rounded-full animate-pulse"></div>
            </div>
            
            <PhoneCall size={64} className="text-blue-400 mb-8 animate-bounce" />
            
            <h2 className="text-3xl font-black text-text text-center mb-2">Gatekeeper Alert</h2>
            <p className="text-blue-400 font-bold mb-8 text-center uppercase tracking-widest text-sm">Visitor at Main Gate</p>

            <div className="bg-background-alt border border-blue-500/30 rounded-3xl p-8 w-full shadow-2xl mb-12">
              <div className="text-center mb-6">
                <p className="text-text-muted text-sm mb-1 uppercase tracking-wider font-bold">Name</p>
                <p className="text-2xl font-bold text-text">{intercomCall.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-text-muted text-xs mb-1 uppercase tracking-wider font-bold">Purpose</p>
                  <p className="text-text font-bold">{intercomCall.purpose}</p>
                </div>
                <div>
                  <p className="text-text-muted text-xs mb-1 uppercase tracking-wider font-bold">Phone</p>
                  <p className="text-text font-bold">{intercomCall.phone}</p>
                </div>
              </div>
            </div>

            <div className="flex w-full gap-4 relative z-10">
              <button 
                onClick={() => handleIntercomAction('denied')}
                className="flex-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 text-red-500 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
              >
                <X size={24} /> Deny
              </button>
              <button 
                onClick={() => handleIntercomAction('approved')}
                className="flex-1 bg-green-500 hover:bg-green-400 border border-green-400 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-colors"
              >
                <Check size={24} /> Allow Entry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
