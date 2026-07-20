'use client';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Phone, MessageCircle, Star, Shield, Building2, 
  Briefcase, Heart, Filter, ChevronRight, X, User
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { API_URL } from '@/lib/api';

/**
 * LeadDirectoryVisitorView — Archetype 6: Hyperlocal Directory & Leads
 * For: Real Estate, Matrimony, Local Jobs, Scrap/Kabadi, Krishi Mandi, Volunteer Hubs
 * Features: Profile/listing cards, direct contact (WhatsApp/Phone), inquiry forms
 */
export default function LeadDirectoryVisitorView({ shop }) {
  const [listings, setListings] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', message: '' });

  useEffect(() => {
    if (shop?.id) {
      fetch(`${API_URL}/api/v1/leads-crm/${shop.id}/listings`)
        .then(r => r.json())
        .then(data => setListings(data.listings || []))
        .catch(() => setListings([]));
    }
  }, [shop?.id]);

  // Demo data if API is empty
  const displayListings = listings.length > 0 ? listings : [
    { id: 1, title: '2 BHK Fully Furnished Flat', listing_type: 'rent', price: 18000, location: 'Shivaji Nagar, Pune', features: '1200 sqft, East Facing', is_featured: true, contact_phone: '9876543210', created_at: new Date().toISOString() },
    { id: 2, title: 'Delivery Executive Needed', listing_type: 'job', price: 15000, location: 'Kothrud', features: 'Bike + License required', is_featured: false, contact_phone: '9876543210', created_at: new Date().toISOString() },
    { id: 3, title: 'Scrap Metal Buyer (Best Rates)', listing_type: 'scrap', price: '₹40/kg', location: 'Home Pickup Available', features: 'Iron, Copper, Aluminium', is_featured: true, contact_phone: '9876543210', created_at: new Date().toISOString() },
    { id: 4, title: 'Looking for Bride', listing_type: 'matrimony', price: null, location: 'Pune', features: '28 Yrs, Software Engineer', is_featured: false, contact_phone: '9876543210', created_at: new Date().toISOString() },
  ];

  const handleInquiry = (e) => {
    e.preventDefault();
    // Simulate API call to create lead
    setTimeout(() => {
      setShowInquiryModal(false);
      setFormData({ name: '', phone: '', message: '' });
      alert('Your inquiry has been sent to the owner. They will contact you shortly.');
    }, 800);
  };

  const getListingIcon = (type) => {
    switch(type) {
      case 'rent': case 'buy': return <Building2 className="w-5 h-5" />;
      case 'job': return <Briefcase className="w-5 h-5" />;
      case 'matrimony': return <Heart className="w-5 h-5" />;
      default: return <Star className="w-5 h-5" />;
    }
  };

  const tabs = [
    { id: 'all', label: 'All Listings' },
    { id: 'featured', label: '⭐️ Featured' },
  ];

  return (
    <div data-category="directory" className="space-y-8 pb-20">
      {/* Header */}
      <div className="bg-card-bg border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-cat-directory-light rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3" />
        
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-4xl shadow-xl z-10 shrink-0">
          {shop?.name?.charAt(0) || 'D'}
        </div>
        
        <div className="z-10 flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-heading font-black text-text">{shop?.name || 'Community Directory'}</h1>
            {shop?.is_verified && <Shield className="w-6 h-6 text-green-500 fill-green-500/20" />}
          </div>
          <p className="text-text-muted max-w-2xl text-sm leading-relaxed mb-4">
            {shop?.description || 'Browse local listings, connect directly, and discover opportunities in your community.'}
          </p>
          <div className="flex flex-wrap gap-4 text-sm font-semibold text-text-muted">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-cat-directory" /> {shop?.address || 'Local Area'}</span>
            <span className="flex items-center gap-1.5"><Star className="w-4 h-4 text-yellow-500 fill-yellow-500" /> {shop?.rating || '4.8'} Rating</span>
            <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cat-directory-light text-cat-directory">Verified Connect</span>
          </div>
        </div>

        <div className="z-10 w-full md:w-auto flex flex-row md:flex-col gap-3">
          <Button className="flex-1 md:w-full cat-gradient border-none hover:opacity-90">
            <Phone className="w-4 h-4 mr-2" /> Contact Office
          </Button>
          <Button variant="outline" className="flex-1 md:w-full border-cat-directory text-cat-directory hover:bg-cat-directory-light">
            <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
          </Button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex bg-background-alt p-1 rounded-xl border border-border">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id
                  ? 'bg-cat-directory text-white shadow-md'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-card-bg text-sm font-semibold hover:border-cat-directory/50 transition-colors">
          <Filter className="w-4 h-4" /> Filter Listings
        </button>
      </div>

      {/* Listings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayListings
          .filter(l => activeTab === 'all' || (activeTab === 'featured' && l.is_featured))
          .map((listing, idx) => (
          <motion.div
            key={listing.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="group glass-card rounded-2xl border border-border hover:border-cat-directory/50 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-cat-directory/10 flex flex-col"
          >
            {/* Image/Placeholder */}
            <div className="h-48 bg-background-alt flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-lg text-cat-directory`}>
                {getListingIcon(listing.listing_type)}
              </div>
              
              {/* Badges */}
              <div className="absolute top-3 left-3 flex flex-col gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/90 text-text shadow-sm backdrop-blur-md">
                  {listing.listing_type}
                </span>
                {listing.is_featured && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-yellow-400 text-yellow-900 shadow-sm">
                    Featured
                  </span>
                )}
              </div>
            </div>

            <div className="p-5 flex-1 flex flex-col">
              <h3 className="font-heading font-bold text-lg text-text mb-2 line-clamp-2 group-hover:text-cat-directory transition-colors">
                {listing.title}
              </h3>
              
              <div className="space-y-2 mb-4 flex-1">
                <div className="flex items-center text-sm text-text-muted">
                  <MapPin className="w-4 h-4 mr-2 opacity-70" />
                  <span className="truncate">{listing.location}</span>
                </div>
                {listing.features && (
                  <div className="flex items-center text-sm text-text-muted">
                    <Star className="w-4 h-4 mr-2 opacity-70" />
                    <span className="truncate">{listing.features}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                {listing.price ? (
                  <div>
                    <span className="text-xs text-text-muted block">Price</span>
                    <span className="font-heading font-black text-lg text-text">
                      {typeof listing.price === 'number' ? `₹${listing.price.toLocaleString()}` : listing.price}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs text-text-muted block">Status</span>
                    <span className="font-heading font-bold text-green-600">Open / Negotiable</span>
                  </div>
                )}

                <Button 
                  size="sm" 
                  className="bg-cat-directory-light text-cat-directory hover:bg-cat-directory hover:text-white"
                  onClick={() => {
                    setSelectedListing(listing);
                    setShowInquiryModal(true);
                  }}
                >
                  Connect <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Inquiry Modal */}
      <AnimatePresence>
        {showInquiryModal && selectedListing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowInquiryModal(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card-bg w-full max-w-md rounded-3xl overflow-hidden shadow-2xl relative z-10"
            >
              <div className="p-6 border-b border-border bg-background-alt relative">
                <button onClick={() => setShowInquiryModal(false)} className="absolute top-6 right-6 text-text-muted hover:text-text">
                  <X className="w-5 h-5" />
                </button>
                <div className="w-12 h-12 rounded-xl bg-cat-directory-light text-cat-directory flex items-center justify-center mb-4">
                  {getListingIcon(selectedListing.listing_type)}
                </div>
                <h3 className="font-heading font-bold text-xl text-text mb-1">Send Inquiry</h3>
                <p className="text-sm text-text-muted">For: <span className="font-semibold text-text">{selectedListing.title}</span></p>
              </div>
              
              <form onSubmit={handleInquiry} className="p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input 
                      required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:border-cat-directory focus:ring-1 focus:ring-cat-directory outline-none text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input 
                      required type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-background border border-border focus:border-cat-directory focus:ring-1 focus:ring-cat-directory outline-none text-sm"
                      placeholder="+91 9876543210"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-text-muted uppercase mb-1 block">Message (Optional)</label>
                  <textarea 
                    value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}
                    className="w-full p-4 rounded-xl bg-background border border-border focus:border-cat-directory focus:ring-1 focus:ring-cat-directory outline-none text-sm min-h-[100px] resize-none"
                    placeholder="I am interested in this listing. Please call me back."
                  />
                </div>
                <Button type="submit" className="w-full py-4 text-base bg-cat-directory hover:bg-cat-directory-dark mt-2">
                  Send Inquiry to Owner
                </Button>
                <p className="text-center text-xs text-text-muted mt-4">
                  By inquiring, you share your contact details securely via LocalSampark.
                </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
