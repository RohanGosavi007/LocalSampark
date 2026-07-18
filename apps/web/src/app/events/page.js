'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Users, Ticket, Search, Filter, Clock, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { API_URL } from '@/lib/api';

const CATEGORIES = [
  { id: '', label: 'All Events' },
  { id: 'workshop', label: 'Workshops' },
  { id: 'sports', label: 'Sports' },
  { id: 'cultural', label: 'Cultural' },
  { id: 'social', label: 'Social Meetups' },
  { id: 'religious', label: 'Religious' },
];

export default function EventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [booking, setBooking] = useState(false);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, [category]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/events?status=upcoming`;
      if (category) url += `&category=${category}`;
      const res = await fetch(url);
      const data = await res.json();
      setEvents(data.events || data.data || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
      setEvents([]);
    }
    setLoading(false);
  };

  const handleBookTicket = async () => {
    try {
      setBooking(true);
      const token = localStorage.getItem('auth_token');
      if (!token) { alert('Please login to book tickets'); setBooking(false); return; }
      
      const res = await fetch(`${API_URL}/api/v1/events/${selectedEvent.id}/tickets`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_count: ticketCount })
      });
      
      const data = await res.json();
      if (res.ok || data.success) {
        setBooked(true);
        setTimeout(() => { setSelectedEvent(null); setBooked(false); setTicketCount(1); fetchEvents(); }, 2500);
      } else {
        alert(data.error || 'Booking failed');
      }
    } catch (e) {
      console.error(e);
    }
    setBooking(false);
  };

  const filtered = events.filter(e => 
    (e.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="min-h-screen bg-slate-950 pt-20 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 px-4">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-600/20 to-emerald-600/20" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-white mb-4">
              Local <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400">Events & Meetups</span>
            </motion.h1>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
              Discover what's happening in your neighborhood. Connect, learn, and celebrate together.
            </p>
            <div className="flex items-center gap-3 max-w-xl mx-auto bg-slate-800/80 backdrop-blur-md rounded-2xl border border-slate-700 px-4 py-3">
              <Search className="text-slate-400 w-5 h-5 flex-shrink-0" />
              <input type="text" placeholder="Search events..." className="bg-transparent text-white flex-1 outline-none placeholder:text-slate-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Categories */}
        <div className="max-w-6xl mx-auto px-4 mb-8 overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex gap-3 justify-center min-w-max">
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all ${category === c.id ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Event Grid */}
        <div className="max-w-6xl mx-auto px-4">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3].map(i => (
                <div key={i} className="bg-slate-800/60 rounded-3xl h-80 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
              <h3 className="text-xl text-slate-400 font-semibold">No upcoming events</h3>
              <p className="text-slate-500 mt-2">Check back later or explore other categories.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((event, i) => (
                <motion.div key={event.id || i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden group hover:border-teal-500/50 hover:shadow-xl hover:shadow-teal-500/10 transition-all cursor-pointer flex flex-col" onClick={() => setSelectedEvent(event)}>
                  <div className="h-48 bg-slate-800 relative">
                    {event.cover_image_url ? (
                      <img src={event.cover_image_url} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-700 group-hover:scale-105 transition-transform duration-500">
                        <Calendar className="w-12 h-12 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-slate-700 text-center">
                      <div className="text-xs text-teal-400 font-bold uppercase">{new Date(event.event_date).toLocaleString('default', { month: 'short' })}</div>
                      <div className="text-xl text-white font-black leading-none">{new Date(event.event_date).getDate()}</div>
                    </div>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">{event.category || 'Event'}</span>
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${event.is_paid ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                        {event.is_paid ? `₹${event.ticket_price}` : 'FREE'}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3 line-clamp-2">{event.title}</h3>
                    <div className="space-y-2 mb-6 mt-auto">
                      <p className="text-slate-400 text-sm flex items-center gap-2"><Clock className="w-4 h-4 text-slate-500" /> {event.start_time || 'TBA'}</p>
                      <p className="text-slate-400 text-sm flex items-start gap-2"><MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" /> <span className="line-clamp-1">{event.venue}</span></p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Event Detail Modal */}
        <AnimatePresence>
          {selectedEvent && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={() => setSelectedEvent(null)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={(e) => e.stopPropagation()} className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative my-8">
                
                <button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 z-10 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>

                <div className="h-64 sm:h-80 relative">
                  {selectedEvent.cover_image_url ? (
                    <img src={selectedEvent.cover_image_url} alt={selectedEvent.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-teal-900/50 to-slate-800 flex items-center justify-center">
                      <Calendar className="w-20 h-20 text-slate-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                </div>

                <div className="p-6 sm:p-8 -mt-20 relative z-10">
                  <div className="bg-slate-800/80 backdrop-blur-md rounded-2xl p-6 border border-slate-700 flex justify-between items-center mb-8 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="text-center px-4 py-2 bg-slate-900 rounded-xl border border-slate-700">
                        <div className="text-teal-400 font-bold text-sm uppercase">{new Date(selectedEvent.event_date).toLocaleString('default', { month: 'short' })}</div>
                        <div className="text-white font-black text-2xl leading-none">{new Date(selectedEvent.event_date).getDate()}</div>
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-white line-clamp-1">{selectedEvent.title}</h2>
                        <span className="text-teal-400 text-sm font-semibold">{selectedEvent.category}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-6">
                      <div>
                        <h3 className="text-lg font-bold text-white mb-2">About Event</h3>
                        <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-line">{selectedEvent.description || 'No description provided.'}</p>
                      </div>
                      
                      <div className="bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50 space-y-3">
                        <div className="flex items-start gap-3 text-sm">
                          <MapPin className="w-5 h-5 text-teal-400 shrink-0" />
                          <div>
                            <span className="text-white font-medium block">Venue</span>
                            <span className="text-slate-400">{selectedEvent.venue}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                          <Clock className="w-5 h-5 text-teal-400 shrink-0" />
                          <div>
                            <span className="text-white font-medium block">Time</span>
                            <span className="text-slate-400">{selectedEvent.start_time} - {selectedEvent.end_time || 'Late'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="md:col-span-1">
                      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 sticky top-4">
                        <div className="mb-4">
                          <span className="text-slate-400 text-sm block">Ticket Price</span>
                          <span className="text-3xl font-black text-white">{selectedEvent.is_paid ? `₹${selectedEvent.ticket_price}` : 'FREE'}</span>
                        </div>

                        {booked ? (
                          <div className="bg-emerald-500/10 text-emerald-400 rounded-xl p-4 text-center border border-emerald-500/20">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                            <span className="font-bold">Tickets Booked!</span>
                            <p className="text-xs mt-1 opacity-80">Check your email for the QR code</p>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center justify-between bg-slate-900 rounded-xl p-2 mb-4 border border-slate-700">
                              <button onClick={() => setTicketCount(Math.max(1, ticketCount - 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition">-</button>
                              <span className="text-white font-bold">{ticketCount}</span>
                              <button onClick={() => setTicketCount(Math.min(10, ticketCount + 1))} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white transition">+</button>
                            </div>
                            
                            <div className="flex justify-between text-sm text-slate-400 mb-6 px-1">
                              <span>Total ({ticketCount} ticket{ticketCount > 1 ? 's' : ''})</span>
                              <span className="text-white font-bold">{selectedEvent.is_paid ? `₹${selectedEvent.ticket_price * ticketCount}` : 'FREE'}</span>
                            </div>

                            <button onClick={handleBookTicket} disabled={booking} className="w-full py-3 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-xl shadow-lg shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                              {booking ? 'Booking...' : <><Ticket className="w-5 h-5" /> Book Now</>}
                            </button>
                          </>
                        )}
                        
                        {selectedEvent.max_attendees && (
                          <p className="text-xs text-slate-500 text-center mt-4">
                            {Math.max(0, selectedEvent.max_attendees - (selectedEvent.current_attendees || 0))} spots remaining
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
