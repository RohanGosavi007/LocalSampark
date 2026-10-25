'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, User, CheckCircle2, AlertCircle, RefreshCcw, ArrowRight } from 'lucide-react';
import Link from 'next/link';

// Mock Bookings
const MOCK_BOOKINGS = [
  { id: 'B-1001', serviceName: 'AC Deep Cleaning', date: 'Oct 24, 2026', time: '11:00 AM', status: 'Confirmed', price: '₹799', provider: 'CoolBreeze Experts' },
  { id: 'B-1002', serviceName: 'Plumbing Repair', date: 'Oct 25, 2026', time: '02:00 PM', status: 'Pending', price: '₹450', provider: 'Local Plumbers Co' },
  { id: 'B-0990', serviceName: 'Home Salon Service', date: 'Oct 10, 2026', time: '10:00 AM', status: 'Completed', price: '₹1200', provider: 'Elite Styling' },
  { id: 'B-0985', serviceName: 'Washing Machine Repair', date: 'Oct 05, 2026', time: '04:00 PM', status: 'Cancelled', price: '₹550', provider: 'HomeTech Repairs' }
];

export default function ServiceBookingsPage() {
  const [activeTab, setActiveTab] = useState('Active');

  const filteredBookings = MOCK_BOOKINGS.filter(b => {
    if (activeTab === 'Active') return ['Confirmed', 'Pending'].includes(b.status);
    if (activeTab === 'Completed') return b.status === 'Completed';
    if (activeTab === 'Cancelled') return b.status === 'Cancelled';
    return true;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'Pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'Completed': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'Cancelled': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Confirmed': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case 'Pending': return <RefreshCcw className="w-4 h-4 mr-1.5" />;
      case 'Completed': return <CheckCircle2 className="w-4 h-4 mr-1.5" />;
      case 'Cancelled': return <AlertCircle className="w-4 h-4 mr-1.5" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 pt-28 pb-20">
        <div className="container max-w-4xl">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-heading font-black text-text mb-2">My Service Bookings</h1>
              <p className="text-text-muted">Track and manage your upcoming and past service requests.</p>
            </div>
            <Link href="/services" className="inline-flex items-center text-primary font-bold hover:underline">
              Book a New Service <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex bg-background-alt border border-border rounded-xl p-1 mb-8">
            {['Active', 'Completed', 'Cancelled'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:text-text'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-20 bg-background-alt rounded-2xl border border-dashed border-border">
                <Calendar className="w-12 h-12 text-text-muted/40 mx-auto mb-4" />
                <h3 className="text-lg font-bold text-text mb-2">No {activeTab.toLowerCase()} bookings</h3>
                <p className="text-text-muted text-sm">You don't have any bookings in this category.</p>
              </div>
            ) : (
              filteredBookings.map((booking, i) => (
                <motion.div 
                  key={booking.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-background border border-border rounded-2xl p-5 md:p-6 hover:shadow-lg transition-all group"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-bold text-text-muted bg-background-alt px-2 py-1 rounded-md border border-border">ID: {booking.id}</span>
                        <span className={`inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-full border ${getStatusColor(booking.status)}`}>
                          {getStatusIcon(booking.status)} {booking.status}
                        </span>
                      </div>
                      <h3 className="text-xl font-heading font-bold text-text">{booking.serviceName}</h3>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="text-2xl font-black text-primary block">{booking.price}</span>
                      <Link href={`/service-booking/${booking.id}`} className="text-sm font-bold text-blue-600 hover:underline mt-1 inline-block">
                        View Details →
                      </Link>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <Calendar className="w-4 h-4 text-primary/60" />
                      <span className="font-medium text-text">{booking.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <Clock className="w-4 h-4 text-primary/60" />
                      <span className="font-medium text-text">{booking.time}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-text-muted">
                      <User className="w-4 h-4 text-primary/60" />
                      <span className="font-medium text-text truncate">{booking.provider}</span>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
}
