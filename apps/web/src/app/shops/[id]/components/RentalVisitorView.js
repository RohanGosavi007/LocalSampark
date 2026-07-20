'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Clock, Shield, Truck, User, Star, MapPin, 
  Phone, ChevronLeft, ChevronRight, Fuel, Settings, IndianRupee
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { API_URL } from '@/lib/api';

/**
 * RentalVisitorView — Archetype 5: Heavy Equipment & Rentals
 * For: Tractor/Ag-Machinery, Borewell, Construction Equipment, Party/Tent, Vehicle Rentals, Scaffolding
 * Features: Duration rate calculator, availability calendar, security deposit breakdown
 */
export default function RentalVisitorView({ shop, products = [] }) {
  const [assets, setAssets] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [durationType, setDurationType] = useState('daily');
  const [durationValue, setDurationValue] = useState(1);
  const [needDriver, setNeedDriver] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({ name: '', phone: '', startDate: '', address: '', notes: '' });

  useEffect(() => {
    if (shop?.id) {
      fetch(`${API_URL}/api/v1/fleet-assets/${shop.id}`)
        .then(r => r.json())
        .then(data => setAssets(data.assets || []))
        .catch(() => setAssets([]));
    }
  }, [shop?.id]);

  // Demo assets if API returns empty
  const displayAssets = assets.length > 0 ? assets : [
    { id: 1, name: 'JCB 3DX Backhoe Loader', asset_type: 'construction', model: 'JCB 3DX', status: 'available', hourly_rate: 1500, daily_rate: 8000, weekly_rate: 45000, security_deposit: 10000, driver_available: true, driver_charge_per_day: 800, fuel_type: 'Diesel', capacity: '3.5 Ton', photos: '[]', description: 'Suitable for excavation, loading, and construction work' },
    { id: 2, name: 'Mahindra 575 DI Tractor', asset_type: 'agriculture', model: '575 DI', status: 'available', hourly_rate: 600, daily_rate: 3500, weekly_rate: 20000, acreage_rate: 1200, security_deposit: 5000, driver_available: true, driver_charge_per_day: 500, fuel_type: 'Diesel', capacity: '45 HP', photos: '[]', description: 'Multi-purpose tractor for ploughing, transport, and farm work' },
    { id: 3, name: 'Shamiyana Tent (50x100 ft)', asset_type: 'party', model: 'Premium', status: 'available', daily_rate: 5000, weekly_rate: 25000, security_deposit: 3000, driver_available: false, photos: '[]', description: 'Wedding/event tent with chairs, tables, and basic decoration setup' },
    { id: 4, name: 'Borewell Drilling Rig', asset_type: 'borewell', model: 'DTH Rig 150m', status: 'in_field', daily_rate: 15000, security_deposit: 20000, driver_available: true, driver_charge_per_day: 1200, fuel_type: 'Diesel', photos: '[]', description: 'Deep borewell drilling up to 150 meters. Includes operator.' },
  ];

  const calculateCost = (asset) => {
    let rate = 0;
    if (durationType === 'hourly') rate = asset.hourly_rate || 0;
    else if (durationType === 'daily') rate = asset.daily_rate || 0;
    else if (durationType === 'weekly') rate = asset.weekly_rate || 0;
    else if (durationType === 'acreage') rate = asset.acreage_rate || 0;
    let total = rate * durationValue;
    if (needDriver) total += (asset.driver_charge_per_day || 0) * Math.max(1, durationValue);
    return { rental: rate * durationValue, driver: needDriver ? (asset.driver_charge_per_day || 0) * Math.max(1, durationValue) : 0, deposit: asset.security_deposit || 0, total: total + (asset.security_deposit || 0) };
  };

  const getStatusColor = (status) => {
    if (status === 'available') return 'bg-green-500';
    if (status === 'in_field' || status === 'rented') return 'bg-orange-500';
    if (status === 'maintenance') return 'bg-red-500';
    return 'bg-gray-500';
  };

  const getStatusLabel = (status) => {
    if (status === 'available') return 'Available';
    if (status === 'in_field') return 'In Field';
    if (status === 'rented') return 'Rented Out';
    if (status === 'maintenance') return 'Under Maintenance';
    return status;
  };

  return (
    <div data-category="rentals" className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-heading font-black text-text mb-2">Equipment & Rental Catalog</h2>
        <p className="text-text-muted">Browse available equipment, check rates, and book instantly</p>
      </div>

      {/* Duration Type Selector */}
      <div className="flex flex-wrap justify-center gap-2">
        {[
          { id: 'hourly', label: '⏱️ Hourly', icon: Clock },
          { id: 'daily', label: '📅 Daily', icon: Calendar },
          { id: 'weekly', label: '📆 Weekly', icon: Calendar },
          { id: 'acreage', label: '🌾 Per Acre', icon: MapPin },
        ].map(d => (
          <button
            key={d.id}
            onClick={() => setDurationType(d.id)}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
              durationType === d.id
                ? 'bg-cat-rentals text-white border-cat-rentals shadow-md'
                : 'bg-background border-border text-text hover:border-cat-rentals/50'
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {/* Duration Slider */}
      <div className="glass-card p-6 rounded-2xl border border-border text-center">
        <label className="text-sm font-bold text-text-muted mb-2 block">
          {durationType === 'hourly' ? 'Hours' : durationType === 'daily' ? 'Days' : durationType === 'weekly' ? 'Weeks' : 'Acres'}
        </label>
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setDurationValue(Math.max(1, durationValue - 1))} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-cat-rentals/50 text-xl font-bold">−</button>
          <span className="text-4xl font-heading font-black text-cat-rentals min-w-[60px]">{durationValue}</span>
          <button onClick={() => setDurationValue(durationValue + 1)} className="w-10 h-10 rounded-xl bg-background border border-border flex items-center justify-center hover:border-cat-rentals/50 text-xl font-bold">+</button>
        </div>
        <input type="range" min="1" max={durationType === 'hourly' ? 24 : durationType === 'acreage' ? 50 : 30} value={durationValue} onChange={e => setDurationValue(parseInt(e.target.value))}
          className="w-full mt-3 accent-emerald-500" />
      </div>

      {/* Asset Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {displayAssets.map((asset, idx) => {
          const cost = calculateCost(asset);
          const isAvailable = asset.status === 'available';

          return (
            <motion.div
              key={asset.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className={`glass-card rounded-2xl border overflow-hidden transition-all duration-300 ${
                selectedAsset?.id === asset.id ? 'border-cat-rentals shadow-lg' : 'border-border hover:border-cat-rentals/30'
              }`}
              onClick={() => setSelectedAsset(asset)}
            >
              {/* Asset Image/Placeholder */}
              <div className="h-40 bg-gradient-to-br from-emerald-900/20 to-emerald-500/10 flex items-center justify-center relative">
                <span className="text-5xl">{asset.asset_type === 'construction' ? '🏗️' : asset.asset_type === 'agriculture' ? '🚜' : asset.asset_type === 'party' ? '⛺' : asset.asset_type === 'borewell' ? '🔧' : '🚛'}</span>
                <div className="absolute top-3 right-3">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold text-white ${getStatusColor(asset.status)}`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white/60" />
                    {getStatusLabel(asset.status)}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <h3 className="font-heading font-bold text-text text-lg mb-1">{asset.name}</h3>
                <p className="text-sm text-text-muted mb-3 line-clamp-2">{asset.description}</p>

                {/* Specs */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {asset.fuel_type && (
                    <Badge variant="outline" className="text-xs"><Fuel className="w-3 h-3 mr-1" />{asset.fuel_type}</Badge>
                  )}
                  {asset.capacity && (
                    <Badge variant="outline" className="text-xs"><Settings className="w-3 h-3 mr-1" />{asset.capacity}</Badge>
                  )}
                  {asset.driver_available && (
                    <Badge variant="outline" className="text-xs border-green-500/30 text-green-600"><User className="w-3 h-3 mr-1" />Driver Available</Badge>
                  )}
                </div>

                {/* Cost Breakdown */}
                <div className="bg-background rounded-xl p-4 border border-border space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Rental ({durationValue} {durationType})</span>
                    <span className="font-bold text-text">₹{cost.rental.toLocaleString()}</span>
                  </div>
                  {needDriver && asset.driver_available && (
                    <div className="flex justify-between text-sm">
                      <span className="text-text-muted">Driver/Operator</span>
                      <span className="font-bold text-text">₹{cost.driver.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted flex items-center gap-1"><Shield className="w-3 h-3" /> Security Deposit</span>
                    <span className="font-bold text-text">₹{cost.deposit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm pt-2 border-t border-border">
                    <span className="font-bold text-text">Total</span>
                    <span className="font-heading font-black text-lg text-cat-rentals">₹{cost.total.toLocaleString()}</span>
                  </div>
                </div>

                {/* Driver Toggle */}
                {asset.driver_available && (
                  <label className="flex items-center gap-3 p-3 rounded-xl bg-background border border-border cursor-pointer mb-4 hover:border-cat-rentals/30 transition-colors">
                    <input type="checkbox" checked={needDriver} onChange={e => setNeedDriver(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded" />
                    <div>
                      <p className="text-sm font-bold text-text">Add Driver/Operator</p>
                      <p className="text-xs text-text-muted">₹{asset.driver_charge_per_day}/day</p>
                    </div>
                  </label>
                )}

                {/* Book Button */}
                <Button
                  className="w-full"
                  disabled={!isAvailable}
                  onClick={(e) => { e.stopPropagation(); setSelectedAsset(asset); setShowBooking(true); }}
                  style={isAvailable ? { background: 'linear-gradient(135deg, #10B981, #065F46)' } : {}}
                >
                  {isAvailable ? `Book Now · ₹${cost.total.toLocaleString()}` : 'Currently Unavailable'}
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Booking Modal */}
      {showBooking && selectedAsset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBooking(false)}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="bg-card-bg rounded-3xl p-6 max-w-md w-full border border-border shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-heading font-bold text-text mb-4">Book {selectedAsset.name}</h3>
            <div className="space-y-3">
              <input placeholder="Your Name *" value={bookingForm.name} onChange={e => setBookingForm({...bookingForm, name: e.target.value})}
                className="w-full p-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-cat-rentals/50 focus:border-cat-rentals text-sm" />
              <input placeholder="Phone Number *" value={bookingForm.phone} onChange={e => setBookingForm({...bookingForm, phone: e.target.value})}
                className="w-full p-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-cat-rentals/50 focus:border-cat-rentals text-sm" />
              <input type="date" value={bookingForm.startDate} onChange={e => setBookingForm({...bookingForm, startDate: e.target.value})}
                className="w-full p-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-cat-rentals/50 focus:border-cat-rentals text-sm" />
              <textarea placeholder="Delivery address / site location" value={bookingForm.address} onChange={e => setBookingForm({...bookingForm, address: e.target.value})}
                className="w-full p-3 rounded-xl bg-background border border-border focus:ring-2 focus:ring-cat-rentals/50 focus:border-cat-rentals text-sm resize-none h-20" />
            </div>
            <div className="bg-background rounded-xl p-3 mt-4 border border-border">
              <div className="flex justify-between text-sm font-bold"><span>Total</span><span className="text-cat-rentals">₹{calculateCost(selectedAsset).total.toLocaleString()}</span></div>
            </div>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" className="flex-1" onClick={() => setShowBooking(false)}>Cancel</Button>
              <Button className="flex-1" style={{ background: 'linear-gradient(135deg, #10B981, #065F46)' }}>Confirm Booking</Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
