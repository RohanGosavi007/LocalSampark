'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, MapPin, Search, Filter, Phone, MessageCircle, 
  Eye, CheckCircle2, BedDouble, Bath, Square, ChevronRight, X,
  Building2, PlusCircle, Sparkles, Building
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { API_BASE } from '@/lib/api';

export default function PropertiesPage() {
  const [properties, setProperties] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [postError, setPostError] = useState(null);
  const [posting, setPosting] = useState(false);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tourModal, setTourModal] = useState(false);
  const [postModal, setPostModal] = useState(false);
  const [newProp, setNewProp] = useState({
    title: '',
    type: 'Rent Flat',
    price: '',
    location: '',
    beds: 2,
    baths: 2,
    sqft: 950,
  });

  const loadProperties = async () => {
    try {
      const res = await fetch(`${API_BASE}/properties`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Listings could not be loaded.');
      const imgs = (p) => {
        try { const v = p.images_json ? (typeof p.images_json === 'string' ? JSON.parse(p.images_json) : p.images_json) : []; return Array.isArray(v) ? v : []; } catch (e) { return []; }
      };
      setProperties((data.properties || []).map((p) => ({
        id: p.id,
        title: p.title,
        type: p.property_type || (p.listing_type === 'SELL' ? 'Sell' : 'Rent Flat'),
        price: typeof p.price === 'number' ? `₹${p.price.toLocaleString('en-IN')}${p.listing_type === 'SELL' ? '' : ' per month'}` : p.price,
        location: p.address || '',
        beds: p.beds || null,
        baths: p.baths || null,
        sqft: p.sqft || null,
        owner: { name: p.owner_name || 'Owner', verified: Boolean(Number(p.is_verified)), role: 'Owner' },
        description: p.description || '',
        images: imgs(p),
        has3DTour: Boolean(p.has_3d_tour || p.has3DTour),
      })));
      setLoadError(null);
    } catch (err) {
      setLoadError(err.message || 'Listings could not be loaded.');
    }
  };
  useEffect(() => { loadProperties(); }, []);

  // Lists the property through POST /properties and reloads. It used to add it to this browser's
  // list only ("You (Owner)", "Zero brokerage fee"), so nobody else ever saw it.
  const handlePostListing = async (e) => {
    e.preventDefault();
    if (!newProp.title || !newProp.price || !newProp.location || posting) return;
    setPosting(true);
    setPostError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      if (!token) throw new Error('Please log in to list a property.');
      const res = await fetch(`${API_BASE}/properties`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: newProp.title,
          propertyType: newProp.type,
          listingType: /sell/i.test(newProp.type) ? 'SELL' : 'RENT',
          price: Number(String(newProp.price).replace(/[^0-9.]/g, '')),
          address: newProp.location,
          images: [],
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Your listing could not be saved.');
      setPostModal(false);
      setNewProp({ title: '', type: 'Rent Flat', price: '', location: '', beds: 2, baths: 2, sqft: 950 });
      loadProperties();
    } catch (err) {
      setPostError(err.message || 'Your listing could not be saved.');
    } finally {
      setPosting(false);
    }
  };

  const filteredProperties = properties.filter(p => {
    if (filterType !== 'All' && p.type !== filterType) return false;
    if (searchQuery && !p.title.toLowerCase().includes(searchQuery.toLowerCase()) && !p.location.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-section-alt flex flex-col">
      <Header />
      
      <main className="flex-1 py-12">
        <div className="container max-w-7xl">
          
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 px-4 py-1.5 font-bold inline-flex items-center">
              <Building2 className="w-4 h-4 mr-2 text-emerald-500"/> Real Estate & Property Rentals
            </Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-black mb-4">Broker-Free Real Estate</h1>
            <p className="text-text-muted max-w-2xl mx-auto text-lg">Direct listings from owners and verified builders. 100% verified flats, PGs, villas, and commercial spaces with immersive 3D virtual tours and 0% brokerage.</p>
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* Filters Sidebar */}
            <div className="w-full lg:w-80 shrink-0 space-y-6">
                <div className="glass-card p-6 rounded-3xl border border-border bg-background shadow-sm sticky top-24">
                    <h3 className="font-heading font-black text-xl mb-6 flex items-center gap-2"><Filter className="w-5 h-5 text-primary"/> Search & Filter</h3>
                    
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Location / Keyword</label>
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                                <input 
                                    type="text" 
                                    className="w-full bg-background-alt border border-border rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary text-text font-medium" 
                                    placeholder="e.g. Dhanori, 2BHK"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-text-muted uppercase tracking-wider mb-2">Property Type</label>
                            <div className="grid grid-cols-2 gap-2">
                                {['All', 'Rent Flat', 'PG', 'Sell'].map(type => (
                                    <button 
                                        key={type}
                                        onClick={() => setFilterType(type)}
                                        className={`py-3 rounded-xl font-bold border transition-all ${filterType === type ? 'bg-primary/10 border-primary text-primary shadow-sm' : 'bg-background border-border text-text hover:border-primary/50'}`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="border-t border-border pt-6">
                            <Button onClick={() => setPostModal(true)} className="w-full shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
                              <PlusCircle className="w-4 h-4" /> Post Free Listing
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties Grid */}
            <div className="flex-1">
                {filteredProperties.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-3xl border border-border bg-background">
                        <Home className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">{loadError ? 'Listings unavailable' : 'No Properties Found'}</h3>
                        <p className="text-text-muted">{loadError || (properties.length === 0 ? 'Nothing has been listed yet.' : 'Try adjusting your filters or search query.')}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProperties.map((p, idx) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={p.id} className="glass-card rounded-3xl border border-border bg-background shadow-sm overflow-hidden group hover:shadow-xl hover:border-primary/30 transition-all flex flex-col">
                                
                                <div className="relative h-60 overflow-hidden">
                                    {p.images[0] ? <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <div className="w-full h-full bg-background-alt flex items-center justify-center"><Home className="w-10 h-10 text-text-muted/40" /></div>}
                                    
                                    <div className="absolute top-4 left-4 flex gap-2">
                                        <Badge className="bg-primary text-white border-transparent shadow-lg">{p.type}</Badge>
                                        {p.owner.verified && <Badge className="bg-emerald-500/90 backdrop-blur text-white border-transparent shadow-lg"><CheckCircle2 className="w-3 h-3 mr-1"/> Verified</Badge>}
                                    </div>
                                    
                                    {p.has3DTour && (
                                        <button onClick={() => setTourModal(true)} className="absolute bottom-4 left-4 bg-background/90 backdrop-blur px-4 py-2 rounded-xl font-bold border border-border shadow-lg flex items-center gap-2 hover:bg-primary hover:text-white hover:border-primary transition-colors">
                                            <Eye className="w-4 h-4"/> 3D Tour Available
                                        </button>
                                    )}
                                </div>
                                
                                <div className="p-6 flex flex-col flex-1">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="text-xl font-black text-text line-clamp-1">{p.title}</h3>
                                        <div className="text-xl font-black text-primary whitespace-nowrap ml-4">{p.price}</div>
                                    </div>
                                    
                                    <p className="text-text-muted font-medium mb-4 flex items-center gap-1">
                                        <MapPin className="w-4 h-4 text-primary shrink-0" /> <span className="line-clamp-1">{p.location}</span>
                                    </p>
                                    
                                    <div className="flex gap-4 mb-6 border-y border-border py-4 mt-auto">
                                        <div className="flex items-center gap-1.5 text-text-muted font-bold text-sm"><BedDouble className="w-4 h-4 text-text"/> {p.beds != null ? `${p.beds} Beds` : 'Beds —'}</div>
                                        <div className="flex items-center gap-1.5 text-text-muted font-bold text-sm"><Bath className="w-4 h-4 text-text"/> {p.baths != null ? `${p.baths} Baths` : 'Baths —'}</div>
                                        <div className="flex items-center gap-1.5 text-text-muted font-bold text-sm"><Square className="w-4 h-4 text-text"/> {p.sqft != null ? `${p.sqft} sqft` : 'Area —'}</div>
                                    </div>
                                    
                                    <div className="flex gap-3">
                                        <Button variant="outline" className="flex-1" icon={MessageCircle}>Chat</Button>
                                        <Button className="flex-1 shadow-md shadow-primary/20" icon={Phone}>Call Owner</Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>

          </div>
        </div>
      </main>

      {/* 3D Tour Modal */}
      <AnimatePresence>
        {tourModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-background w-full max-w-5xl h-[80vh] rounded-3xl overflow-hidden border border-border shadow-2xl flex flex-col">
                    <div className="p-4 border-b border-border flex justify-between items-center bg-background">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-primary/10 text-primary border-primary/20">Interactive</Badge>
                            <h2 className="font-heading font-black text-xl">3D Property Tour</h2>
                        </div>
                        <button onClick={() => setTourModal(false)} className="p-2 hover:bg-background-alt rounded-full transition-colors"><X className="w-6 h-6"/></button>
                    </div>
                    <div className="flex-1 bg-black relative">
                        {/* Spline placeholder */}
                        <iframe 
                            src='https://my.spline.design/room3d-0d62fa2db4cc4ce421eefc166d33dbde/' 
                            frameBorder='0' 
                            width='100%' 
                            height='100%'
                        />
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur px-6 py-3 rounded-full text-white font-bold text-sm shadow-lg flex items-center gap-2 border border-white/10 pointer-events-none">
                            <Eye className="w-4 h-4" /> Drag to explore the property
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Post Free Property Listing Modal */}
      <AnimatePresence>
        {postModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="bg-background w-full max-w-lg rounded-3xl overflow-hidden border border-border shadow-2xl p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 mb-1">0% Brokerage</Badge>
                  <h3 className="text-2xl font-black font-heading text-text">Post Property Listing</h3>
                </div>
                <button onClick={() => setPostModal(false)} className="p-2 hover:bg-background-alt rounded-full transition-colors"><X className="w-5 h-5"/></button>
              </div>

              <form onSubmit={handlePostListing} className="space-y-4">
              {postError && <p role="alert" className="text-red-500 font-bold text-sm">{postError}</p>}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Property Title</label>
                  <input
                    required
                    type="text"
                    value={newProp.title}
                    onChange={(e) => setNewProp({ ...newProp, title: e.target.value })}
                    placeholder="e.g. Spacious 2 BHK near Metro Station"
                    className="w-full bg-background-alt border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Type</label>
                    <select
                      value={newProp.type}
                      onChange={(e) => setNewProp({ ...newProp, type: e.target.value })}
                      className="w-full bg-background-alt border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="Rent Flat">Rent Flat</option>
                      <option value="PG">PG</option>
                      <option value="Sell">Sell</option>
                      <option value="Commercial">Commercial</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Monthly Price / Cost</label>
                    <input
                      required
                      type="text"
                      value={newProp.price}
                      onChange={(e) => setNewProp({ ...newProp, price: e.target.value })}
                      placeholder="e.g. 24,000/mo"
                      className="w-full bg-background-alt border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Location / Society</label>
                  <input
                    required
                    type="text"
                    value={newProp.location}
                    onChange={(e) => setNewProp({ ...newProp, location: e.target.value })}
                    placeholder="e.g. Ganga Aria, Dhanori, Pune"
                    className="w-full bg-background-alt border border-border rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Beds</label>
                    <input
                      type="number"
                      min="1"
                      value={newProp.beds}
                      onChange={(e) => setNewProp({ ...newProp, beds: e.target.value })}
                      className="w-full bg-background-alt border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Baths</label>
                    <input
                      type="number"
                      min="1"
                      value={newProp.baths}
                      onChange={(e) => setNewProp({ ...newProp, baths: e.target.value })}
                      className="w-full bg-background-alt border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-text-muted mb-1">Sq Ft</label>
                    <input
                      type="number"
                      value={newProp.sqft}
                      onChange={(e) => setNewProp({ ...newProp, sqft: e.target.value })}
                      className="w-full bg-background-alt border border-border rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setPostModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1 shadow-lg shadow-primary/20">Publish Listing</Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <Footer />
    </div>
  );
}
