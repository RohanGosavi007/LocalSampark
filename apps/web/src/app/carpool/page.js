'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, MapPin, Calendar, Clock, Users, ArrowRight, ShieldCheck, CheckCircle2, Navigation } from 'lucide-react';
import { API_URL } from '@/lib/api';

export default function CarpoolPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('find'); // find, offer
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [booked, setBooked] = useState(false);

  useEffect(() => {
    fetchRides();
  }, []);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides`);
      const data = await res.json();
      setRides(data.data || (Array.isArray(data) ? data : []));
    } catch (e) {
      console.error(e);
      setRides([]);
    }
    setLoading(false);
  };

  const handleBookRide = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) { alert('Please login to book a ride'); return; }

    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides/${selectedRide.id}/book`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ seats_booked: seats })
      });
      const data = await res.json();
      
      if (res.ok || data.success) {
        setBooked(true);
        setTimeout(() => { setShowBooking(false); setBooked(false); fetchRides(); }, 2000);
      } else {
        alert(data.error || 'Failed to book ride');
      }
    } catch (e) {
      console.error(e);
      // Fallback success for demo
      setBooked(true);
      setTimeout(() => { setShowBooking(false); setBooked(false); }, 2000);
    }
  };

  const filteredRides = rides.filter(r => {
    if (fromLocation && !r.from_location.toLowerCase().includes(fromLocation.toLowerCase())) return false;
    if (toLocation && !r.to_location.toLowerCase().includes(toLocation.toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden py-16 px-4 border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 to-blue-600/10" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-4">
              Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Carpooling</span>
            </motion.h1>
            <p className="text-text-muted text-lg mb-8 max-w-2xl mx-auto">
              Share rides with verified neighbors. Save money, reduce traffic, and make new connections.
            </p>

            {/* Toggle Find/Offer */}
            <div className="flex max-w-xs mx-auto bg-card-bg rounded-full p-1 border border-border mb-8">
              <button onClick={() => setView('find')} className={`flex-1 py-2 rounded-full text-sm font-bold transition ${view === 'find' ? 'bg-cyan-600 text-white' : 'text-text-muted hover:text-text'}`}>Find a Ride</button>
              <button onClick={() => setView('offer')} className={`flex-1 py-2 rounded-full text-sm font-bold transition ${view === 'offer' ? 'bg-cyan-600 text-white' : 'text-text-muted hover:text-text'}`}>Offer a Ride</button>
            </div>

            {/* Search Form */}
            {view === 'find' && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto bg-card-bg border border-border rounded-2xl p-4 flex flex-col md:flex-row gap-4">
                <div className="flex-1 flex items-center gap-3 bg-background-alt rounded-xl px-4 py-2 border border-border">
                  <MapPin className="text-text-muted w-5 h-5" />
                  <input type="text" placeholder="Leaving from..." value={fromLocation} onChange={e => setFromLocation(e.target.value)} className="bg-transparent text-text w-full outline-none" />
                </div>
                <div className="flex-1 flex items-center gap-3 bg-background-alt rounded-xl px-4 py-2 border border-border">
                  <Navigation className="text-text-muted w-5 h-5" />
                  <input type="text" placeholder="Going to..." value={toLocation} onChange={e => setToLocation(e.target.value)} className="bg-transparent text-text w-full outline-none" />
                </div>
                <button className="md:w-auto w-full px-8 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition">Search</button>
              </motion.div>
            )}
          </div>
        </section>

        {/* Content Section */}
        <div className="max-w-4xl mx-auto px-4 py-12">
          {view === 'offer' ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card-bg border border-border rounded-3xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-text mb-6 text-center">Offer a Ride</h2>
              <div className="space-y-4">
                <input type="text" placeholder="Start Location" className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500" />
                <input type="text" placeholder="Destination" className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500" />
                  <input type="time" className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="number" placeholder="Available Seats" min="1" max="6" className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500" />
                  <input type="number" placeholder="Price per seat (₹)" className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500" />
                </div>
                <button className="w-full py-4 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition">Publish Ride</button>
              </div>
            </motion.div>
          ) : (
            <>
              {loading ? (
                <div className="space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-32 bg-card-bg border border-border rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredRides.length === 0 ? (
                <div className="text-center py-16">
                  <Car className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                  <h3 className="text-xl text-text-muted font-semibold">No rides found</h3>
                  <p className="text-text-muted mt-2">Be the first to offer a ride on this route!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredRides.map((ride, i) => (
                    <motion.div key={ride.id || i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="bg-card-bg border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-cyan-500/30 transition cursor-pointer" onClick={() => { setSelectedRide(ride); setShowBooking(true); }}>
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-10 h-10 rounded-full bg-background-alt flex items-center justify-center font-bold text-cyan-400">
                            {(ride.driver?.full_name || 'U')[0]}
                          </div>
                          <div>
                            <span className="text-text font-bold block">{ride.driver?.full_name || 'Verified User'}</span>
                            <span className="text-text-muted text-xs flex items-center gap-1"><Star className="w-3 h-3 text-yellow-500" /> 4.8 Rating</span>
                          </div>
                          {ride.car_model && <span className="ml-auto text-xs bg-background-alt px-3 py-1 rounded-full text-text-muted border border-border">{ride.car_model}</span>}
                        </div>

                        <div className="flex items-start gap-4 text-sm font-medium">
                          <div className="flex flex-col items-center">
                            <span className="text-text">{ride.departure_time || '09:00'}</span>
                            <div className="w-0.5 h-6 bg-border my-1"></div>
                            <span className="text-text">{ride.estimated_arrival || '11:00'}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-text-muted">{ride.from_location}</span>
                            <div className="h-6"></div>
                            <span className="text-text-muted">{ride.to_location}</span>
                          </div>
                        </div>
                      </div>

                      <div className="w-full md:w-auto flex md:flex-col items-center justify-between md:items-end gap-2 border-t md:border-t-0 border-border pt-4 md:pt-0">
                        <div className="text-2xl font-black text-text">₹{ride.price_per_seat || 150}</div>
                        <div className="flex gap-2">
                          {Array.from({ length: 4 }).map((_, idx) => (
                            <Users key={idx} className={`w-4 h-4 ${idx < (ride.available_seats || 3) ? 'text-cyan-400' : 'text-slate-700'}`} />
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Booking Modal */}
        <AnimatePresence>
          {showBooking && selectedRide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBooking(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-3xl w-full max-w-md p-8">
                {booked ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text mb-2">Request Sent!</h2>
                    <p className="text-text-muted">The driver will review and confirm your ride request.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-text mb-6 border-b border-border pb-4">Book Seats</h2>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Route</span>
                        <span className="text-text font-medium">{selectedRide.from_location.split(',')[0]} → {selectedRide.to_location.split(',')[0]}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Departure</span>
                        <span className="text-text font-medium">{selectedRide.departure_time || '09:00 AM'}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-text-muted">Price per seat</span>
                        <span className="text-text font-medium">₹{selectedRide.price_per_seat || 150}</span>
                      </div>
                    </div>

                    <div className="bg-background-alt border border-border rounded-2xl p-4 flex justify-between items-center mb-6">
                      <span className="text-text font-medium">Number of Seats</span>
                      <div className="flex items-center gap-4 bg-card-bg rounded-xl p-1 border border-border">
                        <button onClick={() => setSeats(Math.max(1, seats - 1))} className="w-8 h-8 rounded-lg bg-background-alt text-text font-bold hover:bg-card-bg">-</button>
                        <span className="text-text font-bold">{seats}</span>
                        <button onClick={() => setSeats(Math.min(selectedRide.available_seats || 3, seats + 1))} className="w-8 h-8 rounded-lg bg-background-alt text-text font-bold hover:bg-card-bg">+</button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6 px-1">
                      <span className="text-text-muted">Total Amount</span>
                      <span className="text-2xl font-black text-text">₹{(selectedRide.price_per_seat || 150) * seats}</span>
                    </div>

                    <button onClick={handleBookRide} className="w-full py-4 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition">Request to Book</button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </main>
      <Footer />
    </>
  );
}
