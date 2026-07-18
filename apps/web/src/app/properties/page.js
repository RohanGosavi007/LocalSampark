'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, MapPin, Search, Filter, Phone, MessageCircle, 
  Eye, CheckCircle2, BedDouble, Bath, Square, ChevronRight, X
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Card } from '../components/ui/Card';

const INITIAL_PROPERTIES = [
  {
    id: 1,
    title: 'Premium 3 BHK with 3D Tour',
    type: 'Rent Flat',
    price: '₹35,000/mo',
    location: 'Pride Aashiyana, Dhanori',
    beds: 3, baths: 3, sqft: 1450,
    owner: { name: 'Sanjay Joshi', verified: true, role: 'Owner' },
    description: 'Fully furnished premium 3 BHK apartment with society amenities. Direct from owner, no brokerage.',
    images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'],
    has3DTour: true,
  },
  {
    id: 2,
    title: 'Cozy Private PG Room',
    type: 'PG',
    price: '₹12,000/mo',
    location: 'Ganga Arcadia, Lohegaon',
    beds: 1, baths: 1, sqft: 300,
    owner: { name: 'Rahul V.', verified: true, role: 'Owner' },
    description: 'Single occupancy PG room with attached bath and food included. Prefer IT professionals.',
    images: ['https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80'],
    has3DTour: false,
  },
  {
    id: 3,
    title: 'Luxury Villa for Sale',
    type: 'Sell',
    price: '₹1.8 Cr',
    location: 'Porwal Road, Dhanori',
    beds: 4, baths: 5, sqft: 3200,
    owner: { name: 'Priya Builders', verified: true, role: 'Builder' },
    description: 'Under construction luxury villa. possession by next year. Book now to customize interiors.',
    images: ['https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'],
    has3DTour: true,
  }
];

export default function PropertiesPage() {
  const [properties, setProperties] = useState(INITIAL_PROPERTIES);
  const [filterType, setFilterType] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [tourModal, setTourModal] = useState(false);

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
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20"><Home className="w-4 h-4 mr-2"/> Broker-Free Real Estate</Badge>
            <h1 className="text-4xl md:text-6xl font-heading font-black mb-6">Find Your Next Home</h1>
            <p className="text-text-muted max-w-2xl mx-auto text-lg">Direct listings from owners and verified builders. Explore properties with immersive 3D tours.</p>
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
                            <Button className="w-full shadow-lg shadow-primary/20">Post Free Listing</Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties Grid */}
            <div className="flex-1">
                {filteredProperties.length === 0 ? (
                    <div className="text-center py-20 glass-card rounded-3xl border border-border bg-background">
                        <Home className="w-16 h-16 text-text-muted/30 mx-auto mb-4" />
                        <h3 className="text-xl font-bold mb-2">No Properties Found</h3>
                        <p className="text-text-muted">Try adjusting your filters or search query.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filteredProperties.map((p, idx) => (
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }} key={p.id} className="glass-card rounded-3xl border border-border bg-background shadow-sm overflow-hidden group hover:shadow-xl hover:border-primary/30 transition-all flex flex-col">
                                
                                <div className="relative h-60 overflow-hidden">
                                    <img src={p.images[0]} alt={p.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    
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
                                        <div className="flex items-center gap-1.5 text-text-muted font-bold text-sm"><BedDouble className="w-4 h-4 text-text"/> {p.beds} Beds</div>
                                        <div className="flex items-center gap-1.5 text-text-muted font-bold text-sm"><Bath className="w-4 h-4 text-text"/> {p.baths} Baths</div>
                                        <div className="flex items-center gap-1.5 text-text-muted font-bold text-sm"><Square className="w-4 h-4 text-text"/> {p.sqft} sqft</div>
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
      
      <Footer />
    </div>
  );
}
