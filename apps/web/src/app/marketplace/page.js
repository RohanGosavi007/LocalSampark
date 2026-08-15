'use client';
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Heart, MapPin, Eye, MessageCircle, Send, X, Camera, Tag, Clock, Filter, ChevronDown, Sparkles, ShoppingBag, Star, Shield, Truck, Plus, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';
import { API_URL } from '@/lib/api';

const CONDITION_COLORS = { 'Like New': '#10b981', 'Excellent': '#6366f1', 'Good': '#f97316', 'Fair': '#eab308' };
const CONDITIONS = ['Like New', 'Excellent', 'Good', 'Fair'];
const DEFAULT_SORT = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Viewed' },
  { value: 'price-asc', label: 'Price: Low → High' },
  { value: 'price-desc', label: 'Price: High → Low' },
];

export default function MarketplacePage() {
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [searchQ, setSearchQ] = useState('');
  const [maxPrice, setMaxPrice] = useState(100000);
  const [selectedCondition, setSelectedCondition] = useState('');
  const [activeTab, setActiveTab] = useState('browse'); // browse, post, saved
  const [showDetail, setShowDetail] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [savedIds, setSavedIds] = useState(new Set());
  const [savedItems, setSavedItems] = useState([]);
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [offerSubmitted, setOfferSubmitted] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [flashDeals, setFlashDeals] = useState([]);
  const [postForm, setPostForm] = useState({ title: '', price: '', category: '', condition: 'Good', description: '', is_negotiable: true, delivery_available: false, photo_urls: [] });
  const [postSubmitted, setPostSubmitted] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const authHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/v1/marketplace?sort=${sortBy}&limit=40`;
      if (selectedCat) url += `&category=${selectedCat}`;
      if (selectedCondition) url += `&condition=${selectedCondition}`;
      if (maxPrice < 100000) url += `&max_price=${maxPrice}`;
      if (searchQ) url += `&search=${encodeURIComponent(searchQ)}`;
      const res = await fetch(url);
      const data = await res.json();
      setListings(data.listings || data.rows || (Array.isArray(data) ? data : []));
    } catch (e) { setListings([]); }
    setLoading(false);
  }, [sortBy, selectedCat, selectedCondition, maxPrice, searchQ]);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/marketplace/categories`).then(r => r.json()).then(d => setCategories(d.categories || [])).catch(() => {});
    fetch(`${API_URL}/api/v1/marketplace/flash-deals`).then(r => r.json()).then(d => setFlashDeals(d.deals || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (activeTab === 'saved' && token) {
      fetch(`${API_URL}/api/v1/marketplace/saved`, { headers: authHeaders }).then(r => r.json()).then(d => {
        setSavedItems(d.saved || []);
        setSavedIds(new Set((d.saved || []).map(s => s.id)));
      }).catch(() => {});
    }
  }, [activeTab]);

  const toggleSave = async (listingId) => {
    if (!token) { alert('Please login to save items'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/${listingId}/save`, { method: 'POST', headers: authHeaders });
      const data = await res.json();
      setSavedIds(prev => { const next = new Set(prev); data.saved ? next.add(listingId) : next.delete(listingId); return next; });
    } catch (e) {}
  };

  const openDetail = async (listing) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/${listing.id}`);
      const data = await res.json();
      setSelectedListing(data.listing || listing);
    } catch (e) { setSelectedListing(listing); }
    setShowDetail(true);
  };

  const submitOffer = async () => {
    if (!token || !offerAmount) return;
    try {
      await fetch(`${API_URL}/api/v1/marketplace/${selectedListing.id}/offer`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ offer_amount: parseFloat(offerAmount), message: offerMessage })
      });
      setOfferSubmitted(true);
      setTimeout(() => { setShowOfferModal(false); setOfferSubmitted(false); setOfferAmount(''); setOfferMessage(''); }, 2000);
    } catch (e) { alert('Failed'); }
  };

  const loadChat = async (listingId) => {
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace/${listingId}/chat`, { headers: authHeaders });
      const data = await res.json();
      setChatMessages(data.messages || []);
      setShowChat(true);
    } catch (e) {}
  };

  const sendChat = async () => {
    if (!chatInput.trim() || !selectedListing) return;
    try {
      await fetch(`${API_URL}/api/v1/marketplace/${selectedListing.id}/chat`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify({ message: chatInput })
      });
      setChatInput('');
      loadChat(selectedListing.id);
    } catch (e) {}
  };

  const handlePost = async (e) => {
    e.preventDefault();
    if (!token) { alert('Please login'); return; }
    try {
      const res = await fetch(`${API_URL}/api/v1/marketplace`, {
        method: 'POST', headers: authHeaders, body: JSON.stringify(postForm)
      });
      const data = await res.json();
      if (data.success) { setPostSubmitted(true); setTimeout(() => { setPostSubmitted(false); setActiveTab('browse'); fetchListings(); }, 2000); }
    } catch (e) { alert('Failed'); }
  };

  const ListingCard = ({ item, i }) => {
    const photos = item.photo_urls || [];
    const condColor = CONDITION_COLORS[item.condition] || '#888';
    const isSaved = savedIds.has(item.id);

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
        className="bg-card-bg border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all group cursor-pointer"
        onClick={() => openDetail(item)}>
        {/* Image */}
        <div className="relative h-44 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center overflow-hidden">
          {photos.length > 0 ? (
            <img src={photos[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
          ) : (
            <span className="text-5xl">{getCategoryIcon(item.category)}</span>
          )}
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: condColor + '22', color: condColor }}>{item.condition}</span>
          <button onClick={(e) => { e.stopPropagation(); toggleSave(item.id); }}
            className="absolute top-3 left-3 p-1.5 rounded-full bg-black/40 backdrop-blur-sm hover:bg-black/60 transition">
            <Heart className={`w-4 h-4 ${isSaved ? 'fill-red-500 text-red-500' : 'text-white'}`} />
          </button>
          {item.flash_deal_until && <span className="absolute bottom-2 left-2 text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">⚡ Flash Deal</span>}
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/40 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded-full">
            <Eye className="w-3 h-3" /> {item.views_count || 0}
          </div>
        </div>
        {/* Content */}
        <div className="p-4">
          {item.category && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{item.category}</span>}
          <h3 className="text-sm font-bold text-text mt-2 mb-1 line-clamp-2 leading-snug">{item.title}</h3>
          <p className="text-xs text-text-muted mb-3 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {item.zone || 'Local'} · <Clock className="w-3 h-3" /> {item.created_at ? timeAgo(item.created_at) : 'Recently'}
          </p>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-lg font-black text-primary">₹{(item.price || 0).toLocaleString()}</span>
              {item.is_negotiable ? <span className="text-[10px] text-amber-400 ml-1.5">Negotiable</span> : null}
            </div>
            <span className="text-xs text-text-muted">{item.seller_name || 'Seller'}</span>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <>
      <Header />
      <main className="min-h-screen bg-background pt-20 pb-16">
        {/* Hero */}
        <section className="relative overflow-hidden py-12 px-4 border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-4xl md:text-5xl font-bold text-text mb-3">
              Neighborhood <span className="gradient-text">Marketplace</span>
            </motion.h1>
            <p className="text-text-muted text-lg mb-6 max-w-2xl mx-auto">Buy & sell pre-loved items with verified neighbors. Zero platform fee, 100% direct deals.</p>
            <div className="flex items-center gap-4 justify-center text-sm text-text-muted">
              <span className="flex items-center gap-1"><Shield className="w-4 h-4 text-emerald-500" /> Verified sellers</span>
              <span className="flex items-center gap-1"><Tag className="w-4 h-4 text-amber-500" /> Price negotiation</span>
              <span className="flex items-center gap-1"><Truck className="w-4 h-4 text-blue-500" /> Local delivery</span>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 mt-6 mb-6">
          <div className="flex gap-2 bg-card-bg rounded-2xl p-1.5 border border-border max-w-lg mx-auto">
            {[{ id: 'browse', label: '🛍️ Browse' }, { id: 'post', label: '📸 Sell Item' }, { id: 'saved', label: '❤️ Saved' }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-primary text-white shadow-lg' : 'text-text-muted hover:text-text'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4">
          {/* ═══ BROWSE TAB ═══ */}
          {activeTab === 'browse' && (
            <>
              {/* Flash Deals */}
              {flashDeals.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-text mb-3 flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /> Flash Deals</h3>
                  <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                    {flashDeals.map((deal, i) => (
                      <div key={deal.id} className="min-w-[200px] bg-gradient-to-br from-red-500/10 to-amber-500/10 border border-red-500/20 rounded-2xl p-4 cursor-pointer hover:border-red-500/40 transition" onClick={() => openDetail(deal)}>
                        <span className="text-2xl">{getCategoryIcon(deal.category)}</span>
                        <h4 className="text-sm font-bold text-text mt-2 line-clamp-1">{deal.title}</h4>
                        <p className="text-lg font-black text-red-400 mt-1">₹{(deal.price||0).toLocaleString()}</p>
                        <span className="text-[10px] text-amber-400">⏰ Limited time</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters Bar */}
              <div className="bg-card-bg border border-border rounded-2xl p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1 flex items-center gap-2 bg-background-alt rounded-xl px-3 py-2.5 border border-border">
                    <Search className="text-text-muted w-4 h-4 flex-shrink-0" />
                    <input type="text" placeholder="Search items..." value={searchQ} onChange={e => setSearchQ(e.target.value)} className="bg-transparent text-text w-full outline-none text-sm" />
                  </div>
                  <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    <option value="">All Categories</option>
                    {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                  </select>
                  <select value={selectedCondition} onChange={e => setSelectedCondition(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    <option value="">Any Condition</option>
                    {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="bg-background-alt text-text rounded-xl px-3 py-2.5 border border-border text-sm outline-none">
                    {DEFAULT_SORT.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-text-muted">Max ₹{maxPrice.toLocaleString()}</span>
                  <input type="range" min={500} max={100000} step={500} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
                    className="flex-1" style={{ accentColor: 'var(--primary)' }} />
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex gap-2 overflow-x-auto pb-3 mb-4 scrollbar-hide">
                <button onClick={() => setSelectedCat('')} className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition ${!selectedCat ? 'bg-primary text-white' : 'bg-card-bg text-text-muted border border-border hover:text-text'}`}>All</button>
                {categories.map(c => (
                  <button key={c.id} onClick={() => setSelectedCat(c.name)}
                    className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-bold transition ${selectedCat === c.name ? 'bg-primary text-white' : 'bg-card-bg text-text-muted border border-border hover:text-text'}`}>
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>

              {/* Results count */}
              <p className="text-sm text-text-muted mb-4">{listings.length} items found</p>

              {/* Grid */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-64 bg-card-bg border border-border rounded-2xl animate-pulse" />)}
                </div>
              ) : listings.length === 0 ? (
                <div className="text-center py-16">
                  <ShoppingBag className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
                  <h3 className="text-xl text-text font-semibold mb-2">No items found</h3>
                  <p className="text-text-muted mb-4">Try adjusting your filters or be the first to list!</p>
                  <button onClick={() => setActiveTab('post')} className="px-6 py-3 bg-primary text-white font-bold rounded-xl">Post an Item</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {listings.map((item, i) => <ListingCard key={item.id || i} item={item} i={i} />)}
                </div>
              )}
            </>
          )}

          {/* ═══ POST TAB ═══ */}
          {activeTab === 'post' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto">
              {postSubmitted ? (
                <div className="text-center py-16">
                  <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-text mb-2">Listing Created!</h3>
                  <p className="text-text-muted">Your item is now live on the marketplace.</p>
                </div>
              ) : (
                <form onSubmit={handlePost} className="bg-card-bg border border-border rounded-3xl p-8 space-y-5">
                  <h2 className="text-2xl font-bold text-text text-center mb-2">Sell Your Item</h2>

                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Title *</label>
                    <input type="text" required placeholder="e.g. iPhone 12 — Pristine (64GB)" value={postForm.title} onChange={e => setPostForm({...postForm, title: e.target.value})}
                      className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-primary text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Price (₹) *</label>
                      <input type="number" required placeholder="e.g. 2500" value={postForm.price} onChange={e => setPostForm({...postForm, price: e.target.value})}
                        className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-primary text-sm" />
                    </div>
                    <div>
                      <label className="text-xs text-text-muted mb-1 block">Category *</label>
                      <select required value={postForm.category} onChange={e => setPostForm({...postForm, category: e.target.value})}
                        className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none text-sm">
                        <option value="">Select</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Condition</label>
                    <div className="flex gap-2">
                      {CONDITIONS.map(c => (
                        <button key={c} type="button" onClick={() => setPostForm({...postForm, condition: c})}
                          className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition border ${postForm.condition === c ? 'border-primary bg-primary/10 text-primary' : 'border-border text-text-muted hover:text-text'}`}>
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-text-muted mb-1 block">Description</label>
                    <textarea rows={3} placeholder="Describe item condition, usage, reason for selling..." value={postForm.description} onChange={e => setPostForm({...postForm, description: e.target.value})}
                      className="w-full bg-background-alt text-text rounded-xl p-4 border border-border outline-none focus:border-primary text-sm resize-none" />
                  </div>

                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-text text-sm cursor-pointer">
                      <input type="checkbox" checked={postForm.is_negotiable} onChange={e => setPostForm({...postForm, is_negotiable: e.target.checked})} className="w-5 h-5 accent-primary rounded" />
                      🤝 Price negotiable
                    </label>
                    <label className="flex items-center gap-2 text-text text-sm cursor-pointer">
                      <input type="checkbox" checked={postForm.delivery_available} onChange={e => setPostForm({...postForm, delivery_available: e.target.checked})} className="w-5 h-5 accent-primary rounded" />
                      🚚 Delivery available
                    </label>
                  </div>

                  <button type="submit" className="w-full py-4 bg-gradient-to-r from-primary to-blue-600 text-white font-bold rounded-xl hover:shadow-lg transition text-lg">
                    Publish Listing 🚀
                  </button>
                </form>
              )}
            </motion.div>
          )}

          {/* ═══ SAVED TAB ═══ */}
          {activeTab === 'saved' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!token ? (
                <div className="text-center py-16"><p className="text-text-muted">Please login to see saved items</p></div>
              ) : savedItems.length === 0 ? (
                <div className="text-center py-16">
                  <Heart className="w-16 h-16 text-text-muted mx-auto mb-4 opacity-30" />
                  <h3 className="text-xl text-text font-semibold mb-2">No saved items</h3>
                  <p className="text-text-muted">Browse the marketplace and save items you love!</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {savedItems.map((item, i) => <ListingCard key={item.id} item={item} i={i} />)}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ═══ LISTING DETAIL MODAL ═══ */}
        <AnimatePresence>
          {showDetail && selectedListing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDetail(false)}>
              <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()}
                className="bg-card-bg border border-border rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                {/* Image */}
                <div className="relative h-56 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                  {(selectedListing.photo_urls || []).length > 0 ? (
                    <img src={selectedListing.photo_urls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-6xl">{getCategoryIcon(selectedListing.category)}</span>
                  )}
                  <button onClick={() => setShowDetail(false)} className="absolute top-3 right-3 p-2 bg-black/50 rounded-full"><X className="w-5 h-5 text-white" /></button>
                  <button onClick={() => toggleSave(selectedListing.id)} className="absolute top-3 left-3 p-2 bg-black/50 rounded-full">
                    <Heart className={`w-5 h-5 ${savedIds.has(selectedListing.id) ? 'fill-red-500 text-red-500' : 'text-white'}`} />
                  </button>
                </div>
                {/* Content */}
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      {selectedListing.condition && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: (CONDITION_COLORS[selectedListing.condition]||'#888')+'22', color: CONDITION_COLORS[selectedListing.condition] }}>{selectedListing.condition}</span>}
                      {selectedListing.category && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full ml-1">{selectedListing.category}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-text-muted"><Eye className="w-3 h-3" /> {selectedListing.views_count || 0} views</div>
                  </div>

                  <h2 className="text-xl font-bold text-text mb-2">{selectedListing.title}</h2>
                  <p className="text-2xl font-black text-primary mb-1">₹{(selectedListing.price||0).toLocaleString()}</p>
                  {selectedListing.is_negotiable ? <span className="text-xs text-amber-400 font-bold">🤝 Price is negotiable</span> : null}

                  {selectedListing.description && <p className="text-sm text-text-muted mt-4 mb-4 whitespace-pre-line">{selectedListing.description}</p>}

                  {/* Seller Info */}
                  <div className="bg-background-alt rounded-2xl p-4 mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                      {(selectedListing.seller_name || 'S')[0]}
                    </div>
                    <div className="flex-1">
                      <p className="text-text font-bold text-sm">{selectedListing.seller_name || 'Seller'}</p>
                      <p className="text-text-muted text-xs flex items-center gap-1"><MapPin className="w-3 h-3" /> {selectedListing.zone || 'Local Area'}</p>
                    </div>
                    {selectedListing.seller_verified ? <span className="text-emerald-400 text-xs flex items-center gap-0.5"><Shield className="w-3 h-3" /> Verified</span> : null}
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { if (!token) { alert('Login first'); return; } loadChat(selectedListing.id); }}
                      className="flex-1 py-3 bg-background-alt text-text font-bold rounded-xl border border-border hover:bg-border/40 transition flex items-center justify-center gap-2 text-sm">
                      <MessageCircle className="w-4 h-4" /> Chat with Seller
                    </button>
                    {selectedListing.is_negotiable ? (
                      <button onClick={() => { if (!token) { alert('Login first'); return; } setOfferAmount(String(Math.round((selectedListing.price||1000)*0.85))); setShowOfferModal(true); }}
                        className="py-3 px-5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition text-sm">
                        Make Offer
                      </button>
                    ) : null}
                  </div>

                  {selectedListing.delivery_available ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-emerald-400"><Truck className="w-3 h-3" /> Delivery available in your area</div>
                  ) : null}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ OFFER MODAL ═══ */}
        <AnimatePresence>
          {showOfferModal && selectedListing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setShowOfferModal(false)}>
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-3xl w-full max-w-sm p-8">
                {offerSubmitted ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold text-text">Offer Sent!</h3>
                    <p className="text-text-muted mt-2">Seller will review your offer.</p>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-bold text-text mb-2">Make an Offer</h3>
                    <p className="text-text-muted text-sm mb-6">Listed at: <span className="text-text font-bold">₹{(selectedListing.price||0).toLocaleString()}</span></p>
                    <div className="bg-background-alt rounded-2xl p-6 mb-4 text-center">
                      <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)} placeholder="₹ Your offer"
                        className="bg-transparent text-text text-3xl font-black text-center w-full outline-none" />
                    </div>
                    <textarea value={offerMessage} onChange={e => setOfferMessage(e.target.value)} placeholder="Add a message (optional)"
                      className="w-full bg-background-alt text-text rounded-xl p-3 border border-border text-sm outline-none resize-none h-16 mb-4" />
                    <button onClick={submitOffer} className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:shadow-lg transition text-lg">
                      Submit Offer 🤝
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ CHAT DRAWER ═══ */}
        <AnimatePresence>
          {showChat && selectedListing && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-end justify-center md:items-center p-0 md:p-4" onClick={() => setShowChat(false)}>
              <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} onClick={e => e.stopPropagation()} className="bg-card-bg border border-border rounded-t-3xl md:rounded-3xl w-full max-w-md h-[70vh] flex flex-col">
                <div className="p-4 border-b border-border flex justify-between items-center">
                  <div>
                    <h3 className="text-text font-bold text-sm">{selectedListing.title}</h3>
                    <p className="text-text-muted text-xs">₹{(selectedListing.price||0).toLocaleString()}</p>
                  </div>
                  <button onClick={() => setShowChat(false)} className="p-1 rounded-lg hover:bg-background-alt"><X className="w-5 h-5 text-text-muted" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageCircle className="w-10 h-10 text-text-muted mx-auto mb-2 opacity-30" />
                      <p className="text-text-muted text-sm">Start chatting with the seller</p>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {['Is this still available?', 'Can you lower the price?', 'Where can I pick it up?'].map(q => (
                          <button key={q} onClick={() => { setChatInput(q); }} className="text-xs bg-background-alt text-text px-3 py-1.5 rounded-full border border-border hover:bg-border/40">{q}</button>
                        ))}
                      </div>
                    </div>
                  ) : chatMessages.map(msg => (
                    <div key={msg.id} className="flex justify-start">
                      <div className="max-w-[80%] bg-background-alt text-text rounded-2xl px-4 py-2 text-sm">
                        <p className="font-bold text-xs mb-0.5 opacity-70">{msg.sender_name}</p>
                        <p>{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 border-t border-border flex gap-2">
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                    placeholder="Type a message..." className="flex-1 bg-background-alt text-text rounded-xl px-4 py-3 border border-border text-sm outline-none" />
                  <button onClick={sendChat} className="p-3 bg-primary text-white rounded-xl hover:opacity-90"><Send className="w-5 h-5" /></button>
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

// Helpers
function getCategoryIcon(cat) {
  const map = { Electronics: '📱', Furniture: '🪑', 'Home Appliances': '🫧', 'Sports & Fitness': '🏏', 'Books & Stationery': '📚', 'Clothing & Fashion': '👕', Vehicles: '🚗', 'Kitchen & Dining': '🍳', 'Baby & Kids': '👶', 'Garden & Outdoor': '🌿', 'Tools & Hardware': '🔧' };
  return map[cat] || '📦';
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}
