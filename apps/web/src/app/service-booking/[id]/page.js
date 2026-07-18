'use client';
import React, { useState, useEffect } from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, Phone, CheckCircle2, AlertCircle, MessageSquare, Send } from 'lucide-react';
import Link from 'next/link';

// Mock Bookings
const MOCK_BOOKINGS = {
  'B-1001': { id: 'B-1001', serviceName: 'AC Deep Cleaning', date: 'Oct 24, 2026', time: '11:00 AM', status: 'Confirmed', price: '₹799', provider: 'CoolBreeze Experts', providerPhone: '+91 9876543210', address: 'Flat 402, B Wing, Solitaire Society, Dhanori' },
  'B-1002': { id: 'B-1002', serviceName: 'Plumbing Repair', date: 'Oct 25, 2026', time: '02:00 PM', status: 'Pending', price: '₹450', provider: 'Local Plumbers Co', providerPhone: '+91 9123456789', address: 'Flat 402, B Wing, Solitaire Society, Dhanori' }
};

export default function BookingDetailPage({ params }) {
  const { id } = React.use(params);
  const [booking, setBooking] = useState(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    { id: 1, sender: 'provider', text: 'Hi! I have received your booking. Will be there on time.', time: '10:00 AM' }
  ]);

  useEffect(() => {
    // Simulate fetch
    if (id && MOCK_BOOKINGS[id]) {
      setBooking(MOCK_BOOKINGS[id]);
    } else {
      setBooking(MOCK_BOOKINGS['B-1001']); // Fallback
    }
  }, [id]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    const newMessage = {
      id: Date.now(),
      sender: 'user',
      text: chatMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatHistory([...chatHistory, newMessage]);
    setChatMessage('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (!booking) return <div className="min-h-screen bg-background pt-32 text-center text-text-muted">Loading...</div>;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-20">
        <div className="container max-w-5xl">
          
          <div className="mb-6">
            <Link href="/service-booking" className="text-sm font-bold text-text-muted hover:text-primary transition-colors">
              ← Back to Bookings
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Status Tracker */}
              <div className="bg-background-alt border border-border rounded-2xl p-6 flex items-center justify-between shadow-sm">
                <div>
                  <p className="text-sm text-text-muted uppercase tracking-wider font-bold mb-1">Status</p>
                  <div className={`inline-flex items-center text-sm font-bold px-3 py-1.5 rounded-full border ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-muted uppercase tracking-wider font-bold mb-1">Expected Arrival</p>
                  <p className="text-lg font-black text-text">{booking.time}</p>
                </div>
              </div>

              {/* Booking Info */}
              <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                <h2 className="text-xl font-heading font-black text-text mb-6 pb-4 border-b border-border flex items-center justify-between">
                  <span>{booking.serviceName}</span>
                  <span className="text-primary">{booking.price}</span>
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted font-bold uppercase">Date & Time</p>
                      <p className="text-sm font-medium text-text">{booking.date}</p>
                      <p className="text-sm font-medium text-text">{booking.time}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-text-muted font-bold uppercase">Service Address</p>
                      <p className="text-sm font-medium text-text">{booking.address}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Provider Info */}
              <div className="bg-background border border-border rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-heading font-black text-text-muted uppercase tracking-wider mb-4">Service Provider</h3>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 border-2 border-white shadow-md">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-text">{booking.provider}</h4>
                      <p className="text-sm text-text-muted flex items-center gap-1 mt-0.5">
                        <Phone className="w-3.5 h-3.5" /> {booking.providerPhone}
                      </p>
                    </div>
                  </div>
                  <button className="hidden md:flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg font-bold hover:bg-emerald-200 transition-colors">
                    <Phone className="w-4 h-4" /> Call Provider
                  </button>
                </div>
              </div>

            </div>

            {/* Right Column - Chat */}
            <div className="lg:col-span-1">
              <div className="bg-background border border-border rounded-2xl flex flex-col h-[600px] shadow-lg overflow-hidden">
                <div className="bg-primary p-4 flex items-center gap-3 text-white">
                  <MessageSquare className="w-5 h-5 opacity-80" />
                  <div>
                    <h3 className="font-bold leading-tight">Provider Chat</h3>
                    <p className="text-xs text-primary-light">Typically replies in 5 mins</p>
                  </div>
                </div>

                <div className="flex-1 bg-background-alt p-4 overflow-y-auto flex flex-col gap-3">
                  {chatHistory.map(msg => (
                    <div key={msg.id} className={`flex flex-col max-w-[85%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`}>
                      <div className={`p-3 rounded-2xl shadow-sm ${msg.sender === 'user' ? 'bg-primary text-white rounded-tr-sm' : 'bg-white text-text border border-border rounded-tl-sm'}`}>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      <span className={`text-[10px] text-text-muted mt-1 ${msg.sender === 'user' ? 'text-right pr-1' : 'pl-1'}`}>{msg.time}</span>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-white border-t border-border">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2 bg-background-alt border border-border rounded-full pl-4 pr-1.5 py-1.5 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                    <input 
                      type="text" 
                      placeholder="Type a message..." 
                      className="flex-1 bg-transparent text-sm focus:outline-none text-text"
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                    />
                    <button type="submit" disabled={!chatMessage.trim()} className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white disabled:opacity-50 disabled:bg-gray-400 transition-colors">
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
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
