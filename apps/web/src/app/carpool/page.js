'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Car, MapPin, Calendar, Clock, Users, ArrowRight, ShieldCheck, CheckCircle2, Navigation, Star, Bike, Shield, AlertTriangle, Plus, Minus, MessageCircle, Phone, X, Heart, ChevronDown, Send, Fuel, Repeat, Filter, SlidersHorizontal } from 'lucide-react';
import { API_URL } from '@/lib/api';

const RIDE_TYPES = [
  { value: '', label: 'All', icon: '🚘' },
  { value: 'car', label: 'Car Pool', icon: '🚗' },
  { value: 'bike', label: 'Bike Pool', icon: '🏍️' },
];

const GENDER_OPTIONS = [
  { value: 'any', label: 'Anyone' },
  { value: 'female', label: 'Women Only 🛡️' },
  { value: 'male', label: 'Men Only' },
];

const TABS = ['find', 'offer', 'my-rides', 'vehicles'];

export default function CarpoolPage() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('find');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [rideDate, setRideDate] = useState('');
  const [rideType, setRideType] = useState('');
  const [genderPref, setGenderPref] = useState('any');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [booked, setBooked] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [myRides, setMyRides] = useState({ as_driver: [], as_passenger: [] });
  const [vehicles, setVehicles] = useState([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ vehicle_type: 'car', make: '', model: '', color: '', plate_number: '', total_seats: 4 });
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [offerForm, setOfferForm] = useState({ from_location: '', to_location: '', departure_time: '', ride_date: '', seats_available: 3, price_per_seat: 0, ride_type: 'car', gender_preference: 'any', is_intercity: false, fare_type: 'fixed', vehicle_id: '' });
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/carpool/rides?limit=30`;
      if (rideType) url += `&ride_type=${rideType}`;
      if (genderPref !== 'any') url += `&gender=${genderPref}`;
      if (rideDate) url += `&date=${rideDate}`;
      const res = await fetch(url, token ? { headers: authHeaders } : {});
      const data = await res.json();
      setRides(data.rides || data.data || (Array.isArray(data) ? data : []));
    } catch (e) { setRides([]); }
    setLoading(false);
  }, [rideType, genderPref, rideDate]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  useEffect(() => {
    if (activeTab === 'my-rides' && token) {
      fetch(`${API_URL}/api/v1/carpool/my-rides`, { headers: authHeaders }).then(r => r.json()).then(d => setMyRides(d)).catch(() => {});
    }
    if (activeTab === 'vehicles' && token) {
      fetch(`${API_URL}/api/v1/carpool/vehicles`, { headers: authHeaders }).then(r => r.json()).then(d => setVehicles(d.vehicles || [])).catch(() => {});
    }
  }, [activeTab]);

  const filteredRides = rides.filter(r => {
    const from = r.from_location || r.origin || '';
    const to = r.to_location || r.destination || '';
    if (fromLocation && !from.toLowerCase().includes(fromLocation.toLowerCase())) return false;
    if (toLocation && !to.toLowerCase().includes(toLocation.toLowerCase())) return false;
    return true;
  });

  const handleBookRide = async () => {
    if (!token) { alert('Please login to book a ride'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides/${selectedRide.id}/book`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ seats_booked: seats })
      });
      const data = await res.json();
      if (res.ok || data.success) { setBooked(true); setTimeout(() => { setShowBooking(false); setBooked(false); fetchRides(); }, 2000); }
      else alert(data.error || 'Failed to book');
    } catch (e) { setBooked(true); setTimeout(() => { setShowBooking(false); setBooked(false); }, 2000); }
  };

  const handleBid = async () => {
    if (!token) { alert('Please login'); return; }
    if (!bidAmount || parseFloat(bidAmount) <= 0) { alert('Enter a valid bid amount'); return; }
    try {
      await fetch(`${API_URL}/api/v1/carpool/rides/${selectedRide.id}/bid`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ bid_amount: parseFloat(bidAmount), message: bidMessage, seats_requested: seats })
      });
      setBidSubmitted(true);
      setTimeout(() => { setShowBidModal(false); setBidSubmitted(false); setBidAmount(''); setBidMessage(''); }, 2000);
    } catch (e) { alert('Failed to submit bid'); }
  };

  const handleOfferRide = async (e) => {
    e.preventDefault();
    if (!token) { alert('Please login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(offerForm)
      });
      const data = await res.json();
      if (data.success) { alert('Ride published!'); setActiveTab('find'); fetchRides(); }
    } catch (e) { alert('Failed to publish ride'); }
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/vehicles`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(vehicleForm)
      });
      const data = await res.json();
      if (data.success) {
        setShowVehicleForm(false);
        setVehicleForm({ vehicle_type: 'car', make: '', model: '', color: '', plate_number: '', total_seats: 4 });
        fetch(`${API_URL}/api/v1/carpool/vehicles`, { headers: authHeaders }).then(r => r.json()).then(d => setVehicles(d.vehicles || []));
      }
    } catch (e) { alert('Failed to add vehicle'); }
  };

  const handleSOS = async (rideId) => {
    if (!token) return;
    if (!confirm('🚨 This will send an SOS emergency alert. Are you sure?')) return;
    try {
      await fetch(`${API_URL}/api/v1/carpool/rides/${rideId}/sos`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ message: 'Emergency SOS triggered' })
      });
      alert('🚨 SOS Alert Sent! Emergency contacts have been notified.');
    } catch (e) { alert('Failed to send SOS'); }
  };

  const loadChat = async (rideId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/carpool/rides/${rideId}/chat`, { headers: authHeaders });
      const data = await res.json();
      setChatMessages(data.messages || []);
      setShowChat(true);
    } catch (e) {}
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedRide) return;
    try {
      await fetch(`${API_URL}/api/v1/carpool/rides/${selectedRide.id}/chat`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ message: chatInput })
      });
      setChatInput('');
      loadChat(selectedRide.id);
    } catch (e) {}
  };

  const RideCard = ({ ride, i }) => {
    const from = ride.from_location || ride.origin || 'Start';
    const to = ride.to_location || ride.destination || 'End';
    const driverName = ride.driver?.full_name || 'Verified User';
    const rating = ride.driver_rating?.avg || '4.5';
    const rideSeats = ride.available_seats || ride.seats_available || 4;
    const remaining = ride.remaining_seats ?? rideSeats;
    const isBike = ride.ride_type === 'bike';

    return (
      <motion.div key={ride.id || i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
        className="bg-card-bg border border-border rounded-2xl p-5 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all cursor-pointer group"
        onClick={() => { setSelectedRide(ride); setShowBooking(true); }}>
        {/* Top Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center font-bold text-cyan-400 text-lg">
              {driverName[0]}
            </div>
            <div>
              <span className="text-text font-bold block text-sm">{driverName}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-yellow-500 text-xs flex items-center gap-0.5"><Star className="w-3 h-3 fill-yellow-500" />{rating}</span>
                {ride.corporate_only ? <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-full font-bold">Corporate</span> : null}
                {ride.gender_preference === 'female' ? <span className="text-[10px] bg-pink-500/20 text-pink-400 px-1.5 py-0.5 rounded-full font-bold">Women Only</span> : null}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${isBike ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
              {isBike ? '🏍️ Bike' : '🚗 Car'}
            </span>
            {ride.car_model || ride.vehicle?.model ? (
              <span className="text-[10px] text-text-muted">{ride.vehicle?.model || ride.car_model}</span>
            ) : null}
          </div>
        </div>

        {/* Route */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex flex-col items-center mt-1">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-emerald-500/30" />
            <div className="w-0.5 h-8 bg-gradient-to-b from-emerald-500/50 to-cyan-500/50 my-1" />
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 border-2 border-cyan-500/30" />
          </div>
          <div className="flex-1">
            <p className="text-text text-sm font-medium">{from}</p>
            <div className="flex items-center gap-2 my-1">
              {ride.departure_time && <span className="text-[11px] text-text-muted">{ride.departure_time}</span>}
              {ride.estimated_distance_km && <span className="text-[11px] text-text-muted">· {parseFloat(ride.estimated_distance_km).toFixed(0)} km</span>}
              {ride.waypoints?.length > 0 && <span className="text-[11px] text-emerald-400">· {ride.waypoints.length} stops</span>}
            </div>
            <p className="text-text text-sm font-medium">{to}</p>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="flex items-center justify-between pt-3 border-t border-border/60">
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-text">₹{ride.price_per_seat || 0}</span>
            <span className="text-text-muted text-xs">/seat</span>
            {ride.fare_type === 'negotiable' && <span className="text-[10px] bg-amber-500/15 text-amber-400 px-1.5 py-0.5 rounded-full font-bold">Negotiable</span>}
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: rideSeats }).map((_, idx) => (
              <div key={idx} className={`w-5 h-5 rounded-full flex items-center justify-center ${idx < remaining ? 'bg-cyan-500/20 text-cyan-400' : 'bg-border text-text-muted'}`}>
                <Users className="w-3 h-3" />
              </div>
            ))}
            <span className="text-xs text-text-muted ml-1">{remaining} left</span>
          </div>
        </div>

        {ride.is_intercity ? (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-[10px] bg-purple-500/15 text-purple-400 px-2 py-0.5 rounded-full font-bold">🛣️ Intercity</span>
            {ride.luggage_space > 0 && <span className="text-[10px] bg-border text-text-muted px-2 py-0.5 rounded-full">🧳 {ride.luggage_space} bags</span>}
          </div>
        ) : null}
      </motion.div>
    );
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-12 px-4 border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-blue-600/5 to-transparent" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-3">
              Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400">Ride Sharing</span>
            </motion.h1>
            <p className="text-text-muted text-lg mb-6 max-w-2xl mx-auto">
              Share rides with verified neighbors. Save money, reduce traffic, and commute smarter.
            </p>
            <div className="flex items-center gap-4 justify-center text-sm text-text-muted">
              <span className="flex items-center gap-1"><ShieldCheck className="w-4 h-4 text-emerald-500" /> Verified drivers</span>
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-pink-500" /> Women-only option</span>
              <span className="flex items-center gap-1"><Bike className="w-4 h-4 text-amber-500" /> Car & Bike pool</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 mt-6 mb-6">
          <div className="flex gap-2 bg-card-bg rounded-2xl p-1.5 border border-border max-w-2xl mx-auto">
            {[{ id: 'find', label: '🔍 Find Ride' }, { id: 'offer', label: '🚗 Offer Ride' }, { id: 'my-rides', label: '📋 My Rides' }, { id: 'vehicles', label: '🚘 Vehicles' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' : 'text-text-muted hover:text-text hover:bg-background-alt'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* ═══ FIND TAB ═══ */}
          {activeTab === 'find' && (
            <>
              {/* Search + Filters */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card-bg border border-border rounded-2xl p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="flex items-center gap-2 bg-background-alt rounded-xl px-3 py-2.5 border border-border">
                    <MapPin className="text-emerald-500 w-4 h-4 flex-shrink-0" />
                    <input type="text" placeholder="From..." value={fromLocation} onChange={e => setFromLocation(e.target.value)} className="bg-transparent text-text w-full outline-none text-sm" />
                  </div>
                  <div className="flex items-center gap-2 bg-background-alt rounded-xl px-3 py-2.5 border border-border">
                    <Navigation className="text-cyan-500 w-4 h-4 flex-shrink-0" />
                    <input type="text" placeholder="To..." value={toLocation} onChange={e => setToLocation(e.target.value)} className="bg-transparent text-text w-full outline-none text-sm" />
                  </div>
                  <div className="flex items-center gap-2 bg-background-alt rounded-xl px-3 py-2.5 border border-border">
                    <Calendar className="text-text-muted w-4 h-4 flex-shrink-0" />
                    <input type="date" value={rideDate} onChange={e => setRideDate(e.target.value)} className="bg-transparent text-text w-full outline-none text-sm" />
                  </div>
                  <select value={rideType} onChange={e => setRideType(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    {RIDE_TYPES.map(t => <option key={t.value} value={t.value}>{t.icon} {t.label}</option>)}
                  </select>
                  <select value={genderPref} onChange={e => setGenderPref(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                </div>
              </motion.div>

              {/* Results */}
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map(i => <div key={i} className="h-48 bg-card-bg border border-border rounded-2xl animate-pulse" />)}
                </div>
              ) : filteredRides.length === 0 ? (
                <div className="text-center py-16">
                  <Car className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
                  <h3 className="text-xl text-text font-semibold mb-2">No rides found</h3>
                  <p className="text-text-muted mb-4">Be the first to offer a ride on this route!</p>
                  <button onClick={() => setActiveTab('offer')} className="px-6 py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition">Offer a Ride</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRides.map((ride, i) => <RideCard key={ride.id || i} ride={ride} i={i} />)}
                </div>
              )}
            </>
          )}

          {/* ═══ OFFER TAB ═══ */}
          {activeTab === 'offer' && (
            <motion.form onSubmit={handleOfferRide} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-card-bg border border-border rounded-3xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-text mb-6 text-center">Offer a Ride</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="🟢 Start Location" required value={offerForm.from_location} onChange={e => setOfferForm({...offerForm, from_location: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500 text-sm" />
                  <input type="text" placeholder="🔵 Destination" required value={offerForm.to_location} onChange={e => setOfferForm({...offerForm, to_location: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" required value={offerForm.ride_date} onChange={e => setOfferForm({...offerForm, ride_date: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500 text-sm" />
                  <input type="time" required value={offerForm.departure_time} onChange={e => setOfferForm({...offerForm, departure_time: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500 text-sm" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Available Seats</label>
                    <input type="number" min={1} max={6} value={offerForm.seats_available} onChange={e => setOfferForm({...offerForm, seats_available: +e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Price per Seat (₹)</label>
                    <input type="number" min={0} value={offerForm.price_per_seat} onChange={e => setOfferForm({...offerForm, price_per_seat: +e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-cyan-500 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Ride Type</label>
                    <select value={offerForm.ride_type} onChange={e => setOfferForm({...offerForm, ride_type: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                      <option value="car">🚗 Car</option>
                      <option value="bike">🏍️ Bike</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <select value={offerForm.gender_preference} onChange={e => setOfferForm({...offerForm, gender_preference: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                    {GENDER_OPTIONS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
                  </select>
                  <select value={offerForm.fare_type} onChange={e => setOfferForm({...offerForm, fare_type: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                    <option value="fixed">💰 Fixed Price</option>
                    <option value="negotiable">🤝 Open to Offers</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 text-text text-sm cursor-pointer">
                  <input type="checkbox" checked={offerForm.is_intercity} onChange={e => setOfferForm({...offerForm, is_intercity: e.target.checked})} className="w-5 h-5 rounded accent-cyan-500" />
                  🛣️ Intercity / Outstation ride
                </label>
                {vehicles.length > 0 && (
                  <select value={offerForm.vehicle_id} onChange={e => setOfferForm({...offerForm, vehicle_id: e.target.value})} className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                    <option value="">Select your vehicle (optional)</option>
                    {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} — {v.plate_number}</option>)}
                  </select>
                )}
                <button type="submit" className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg hover:shadow-cyan-500/20 transition text-lg">
                  Publish Ride 🚀
                </button>
              </div>
            </motion.form>
          )}

          {/* ═══ MY RIDES TAB ═══ */}
          {activeTab === 'my-rides' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!token ? (
                <div className="text-center py-16"><p className="text-text-muted">Please login to see your rides</p></div>
              ) : (
                <>
                  <h3 className="text-lg font-bold text-text mb-4">🚗 Rides as Driver</h3>
                  {(myRides.as_driver || []).length === 0 ? (
                    <p className="text-text-muted mb-8">No rides offered yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {(myRides.as_driver || []).map((ride, i) => (
                        <div key={ride.id} className="bg-card-bg border border-border rounded-2xl p-5">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="text-text font-bold text-sm">{ride.from_location || ride.origin} → {ride.to_location || ride.destination}</p>
                              <p className="text-text-muted text-xs mt-1">{ride.ride_date} · {ride.departure_time}</p>
                            </div>
                            <span className={`text-xs px-2 py-1 rounded-full font-bold ${ride.status === 'active' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-border text-text-muted'}`}>{ride.status}</span>
                          </div>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { setSelectedRide(ride); loadChat(ride.id); }} className="flex-1 py-2 bg-background-alt text-text text-xs font-semibold rounded-lg border border-border hover:bg-border/40 flex items-center justify-center gap-1">
                              <MessageCircle className="w-3 h-3" /> Chat
                            </button>
                            <button onClick={() => handleSOS(ride.id)} className="py-2 px-3 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> SOS
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-text mb-4">🎫 Rides as Passenger</h3>
                  {(myRides.as_passenger || []).length === 0 ? (
                    <p className="text-text-muted">No rides booked yet</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(myRides.as_passenger || []).map((ride, i) => (
                        <div key={ride.id} className="bg-card-bg border border-border rounded-2xl p-5">
                          <p className="text-text font-bold text-sm">{ride.from_location || ride.origin} → {ride.to_location || ride.destination}</p>
                          <p className="text-text-muted text-xs mt-1">{ride.ride_date} · {ride.departure_time} · ₹{ride.price_per_seat}/seat</p>
                          <div className="flex gap-2 mt-3">
                            <button onClick={() => { setSelectedRide(ride); setShowRating(true); }} className="flex-1 py-2 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-lg hover:bg-yellow-500/30 flex items-center justify-center gap-1">
                              <Star className="w-3 h-3" /> Rate Ride
                            </button>
                            <button onClick={() => handleSOS(ride.id)} className="py-2 px-3 bg-red-500/20 text-red-400 text-xs font-bold rounded-lg hover:bg-red-500/30">🚨 SOS</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* ═══ VEHICLES TAB ═══ */}
          {activeTab === 'vehicles' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!token ? (
                <div className="text-center py-16"><p className="text-text-muted">Please login to manage vehicles</p></div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-text">My Vehicles</h3>
                    <button onClick={() => setShowVehicleForm(!showVehicleForm)} className="px-4 py-2 bg-cyan-600 text-white font-bold rounded-xl text-sm hover:bg-cyan-500 flex items-center gap-1">
                      <Plus className="w-4 h-4" /> Add Vehicle
                    </button>
                  </div>

                  {showVehicleForm && (
                    <form onSubmit={handleAddVehicle} className="bg-card-bg border border-border rounded-2xl p-6 mb-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <select value={vehicleForm.vehicle_type} onChange={e => setVehicleForm({...vehicleForm, vehicle_type: e.target.value})} className="bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm">
                          <option value="car">🚗 Car</option>
                          <option value="bike">🏍️ Bike</option>
                        </select>
                        <input type="text" placeholder="Make (e.g. Maruti)" value={vehicleForm.make} onChange={e => setVehicleForm({...vehicleForm, make: e.target.value})} className="bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm" />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <input type="text" placeholder="Model *" required value={vehicleForm.model} onChange={e => setVehicleForm({...vehicleForm, model: e.target.value})} className="bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm" />
                        <input type="text" placeholder="Color" value={vehicleForm.color} onChange={e => setVehicleForm({...vehicleForm, color: e.target.value})} className="bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm" />
                        <input type="text" placeholder="Plate No. *" required value={vehicleForm.plate_number} onChange={e => setVehicleForm({...vehicleForm, plate_number: e.target.value})} className="bg-background-alt text-text rounded-xl p-3 border border-border outline-none text-sm" />
                      </div>
                      <button type="submit" className="w-full py-3 bg-cyan-600 text-white font-bold rounded-xl hover:bg-cyan-500 transition">Save Vehicle</button>
                    </form>
                  )}

                  {vehicles.length === 0 ? (
                    <div className="text-center py-16">
                      <Car className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
                      <p className="text-text-muted">No vehicles added yet. Add your car or bike to start offering rides.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {vehicles.map(v => (
                        <div key={v.id} className="bg-card-bg border border-border rounded-2xl p-5">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-2xl">
                              {v.vehicle_type === 'bike' ? '🏍️' : '🚗'}
                            </div>
                            <div>
                              <p className="text-text font-bold text-sm">{v.make} {v.model}</p>
                              <p className="text-text-muted text-xs">{v.plate_number} · {v.color || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-text-muted">
                            <span>{v.total_seats} seats · {v.fuel_type}</span>
                            {v.is_verified ? <span className="text-emerald-400 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Verified</span> : <span className="text-amber-400">Pending verification</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* ═══ BOOKING MODAL ═══ */}
        <AnimatePresence>
          {showBooking && selectedRide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBooking(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-3xl w-full max-w-md p-8 max-h-[90vh] overflow-y-auto">
                {booked ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text mb-2">Booking Confirmed!</h2>
                    <p className="text-text-muted">The driver will confirm your seat. You'll be notified.</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold text-text">Book This Ride</h2>
                      <button onClick={() => setShowBooking(false)} className="p-2 rounded-xl hover:bg-background-alt"><X className="w-5 h-5 text-text-muted" /></button>
                    </div>

                    <div className="bg-background-alt rounded-2xl p-4 mb-6 space-y-3">
                      <div className="flex justify-between text-sm"><span className="text-text-muted">Driver</span><span className="text-text font-medium">{selectedRide.driver?.full_name || 'Verified User'}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted">Route</span><span className="text-text font-medium truncate ml-4">{(selectedRide.from_location||'').split(',')[0]} → {(selectedRide.to_location||'').split(',')[0]}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted">Departure</span><span className="text-text font-medium">{selectedRide.ride_date} {selectedRide.departure_time || '—'}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-text-muted">Type</span><span className="text-text font-medium">{selectedRide.ride_type === 'bike' ? '🏍️ Bike' : '🚗 Car'}</span></div>
                    </div>

                    <div className="bg-background-alt border border-border rounded-2xl p-4 flex justify-between items-center mb-4">
                      <span className="text-text font-medium text-sm">Seats</span>
                      <div className="flex items-center gap-4 bg-card-bg rounded-xl p-1 border border-border">
                        <button onClick={() => setSeats(Math.max(1, seats-1))} className="w-8 h-8 rounded-lg bg-background-alt text-text font-bold hover:bg-border">-</button>
                        <span className="text-text font-bold w-6 text-center">{seats}</span>
                        <button onClick={() => setSeats(Math.min(selectedRide.remaining_seats || 4, seats+1))} className="w-8 h-8 rounded-lg bg-background-alt text-text font-bold hover:bg-border">+</button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mb-6 px-1">
                      <span className="text-text-muted">Total</span>
                      <span className="text-2xl font-black text-text">₹{(selectedRide.price_per_seat || 0) * seats}</span>
                    </div>

                    <div className="flex gap-3">
                      <button onClick={handleBookRide} className="flex-1 py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition">
                        Book Now
                      </button>
                      {selectedRide.fare_type === 'negotiable' && (
                        <button onClick={() => { setShowBooking(false); setBidAmount(String(Math.round((selectedRide.price_per_seat || 100) * 0.85))); setShowBidModal(true); }}
                          className="py-3.5 px-5 bg-amber-500/20 text-amber-400 font-bold rounded-xl hover:bg-amber-500/30 transition text-sm">
                          💬 Bid
                        </button>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ BID MODAL (inDrive-style) ═══ */}
        <AnimatePresence>
          {showBidModal && selectedRide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBidModal(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-3xl w-full max-w-md p-8">
                {bidSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-text mb-2">Bid Submitted!</h2>
                    <p className="text-text-muted">The driver will review your offer.</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-text mb-2">Name Your Price</h2>
                    <p className="text-text-muted text-sm mb-6">Driver's asking price: <span className="text-text font-bold">₹{selectedRide.price_per_seat || 0}</span>/seat</p>

                    <div className="bg-background-alt rounded-2xl p-6 mb-4 text-center">
                      <input type="number" value={bidAmount} onChange={e => setBidAmount(e.target.value)} placeholder="₹ Your bid per seat"
                        className="bg-transparent text-text text-3xl font-black text-center w-full outline-none" />
                    </div>

                    <div className="flex gap-2 mb-4 justify-center">
                      {[10, 20, 50].map(inc => (
                        <button key={inc} onClick={() => setBidAmount(String((parseInt(bidAmount)||0) + inc))}
                          className="px-4 py-2 bg-emerald-500/15 text-emerald-400 rounded-full text-sm font-bold hover:bg-emerald-500/25">+₹{inc}</button>
                      ))}
                      {[10, 20].map(dec => (
                        <button key={-dec} onClick={() => setBidAmount(String(Math.max(1, (parseInt(bidAmount)||0) - dec)))}
                          className="px-4 py-2 bg-red-500/15 text-red-400 rounded-full text-sm font-bold hover:bg-red-500/25">-₹{dec}</button>
                      ))}
                    </div>

                    <textarea value={bidMessage} onChange={e => setBidMessage(e.target.value)} placeholder="Add a message (optional)"
                      className="w-full bg-background-alt text-text rounded-xl p-3 border border-border text-sm outline-none resize-none h-20 mb-4" />

                    <button onClick={handleBid} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition text-lg">
                      Submit Bid 🤝
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ RATING MODAL ═══ */}
        <AnimatePresence>
          {showRating && selectedRide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowRating(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-3xl w-full max-w-sm p-8 text-center">
                <h2 className="text-xl font-bold text-text mb-4">Rate Your Ride</h2>
                <div className="flex justify-center gap-2 mb-4">
                  {[1,2,3,4,5].map(s => (
                    <button key={s} onClick={() => setRatingValue(s)} className="p-1">
                      <Star className={`w-10 h-10 transition ${s <= ratingValue ? 'text-yellow-500 fill-yellow-500' : 'text-border'}`} />
                    </button>
                  ))}
                </div>
                <textarea value={ratingComment} onChange={e => setRatingComment(e.target.value)} placeholder="Share your experience..."
                  className="w-full bg-background-alt text-text rounded-xl p-3 border border-border text-sm outline-none resize-none h-20 mb-4" />
                <button onClick={async () => {
                  if (!ratingValue) return;
                  try {
                    await fetch(`${API_URL}/api/v1/carpool/rides/${selectedRide.id}/rate`, {
                      method: 'POST', headers: authHeaders, body: JSON.stringify({ rating: ratingValue, comment: ratingComment })
                    });
                    setShowRating(false); setRatingValue(0); setRatingComment('');
                    alert('Thanks for your rating!');
                  } catch(e) {}
                }} className="w-full py-3 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition">Submit Rating</button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ CHAT DRAWER ═══ */}
        <AnimatePresence>
          {showChat && selectedRide && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center md:items-center p-0 md:p-4" onClick={() => setShowChat(false)}>
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-t-3xl md:rounded-3xl w-full max-w-md h-[70vh] flex flex-col">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <h3 className="text-text font-bold">Ride Chat</h3>
                  <button onClick={() => setShowChat(false)} className="p-1 rounded-lg hover:bg-background-alt"><X className="w-5 h-5 text-text-muted" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <p className="text-text-muted text-center text-sm py-8">No messages yet. Start the conversation!</p>
                  ) : chatMessages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender_id === (token && JSON.parse(atob(token.split('.')[1]||'e30=')).id) ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${msg.sender_id === (token && JSON.parse(atob(token.split('.')[1]||'e30=')).id) ? 'bg-cyan-600 text-white' : 'bg-background-alt text-text'}`}>
                        <p className="font-bold text-xs mb-0.5 opacity-70">{msg.sender_name}</p>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..." className="flex-1 bg-background-alt text-text rounded-xl px-4 py-3 border border-border text-sm outline-none" />
                  <button onClick={sendChat} className="p-3 bg-cyan-600 text-white rounded-xl hover:bg-cyan-500"><Send className="w-5 h-5" /></button>
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
