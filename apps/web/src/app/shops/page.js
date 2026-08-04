'use client';
import React, { useState, useEffect, useContext, useMemo, useCallback } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { LocationContext } from '../../context/LocationContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Map as MapIcon, List, Filter, Star, Clock, 
  Truck, ShieldCheck, X, Navigation, ShoppingBag, Eye, Store
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ShopCardSkeleton } from '../../components/ui/Skeleton';
import { ShopCard } from '../../components/ShopCard';
import LazyMap from '../../components/LazyMap';
import { MemoizedVirtualizedShopGrid as VirtualizedShopGrid } from '../../components/VirtualizedShopGrid';

import { API_URL } from '@/lib/api';

export default function ShopsPage() {
  const { location, isLocationReady } = useContext(LocationContext) || {};
  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [highlights, setHighlights] = useState([]);
  const [flashSales, setFlashSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [locationError, setLocationError] = useState(false);
  const [sortBy, setSortBy] = useState('distance'); 
  const [fallbackUsed, setFallbackUsed] = useState(false);
  
  const [viewMode, setViewMode] = useState('list'); 
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterDelivery, setFilterDelivery] = useState(false);
  const [filterTopRated, setFilterTopRated] = useState(false);
  const [quickViewShop, setQuickViewShop] = useState(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [activeStory, setActiveStory] = useState(null);
  const [workerFilteredShops, setWorkerFilteredShops] = useState(null);
  const [categoryCounts, setCategoryCounts] = useState({});

  // 10x Scale: Web Worker Engine for Off-Thread Filtering
  useEffect(() => {
    if (typeof window !== 'undefined' && shops.length > 0) {
      const worker = new Worker(new URL('../../workers/search.worker.js', import.meta.url));
      
      worker.onmessage = (e) => {
        if (e.data.type === 'FILTER_COMPLETE') {
          setWorkerFilteredShops(e.data.filtered);
        }
      };

      worker.postMessage({
        type: 'FILTER_ITEMS',
        items: shops,
        query: searchTerm,
        category: selectedCategory
      });

      return () => worker.terminate();
    }
  }, [shops, searchTerm, selectedCategory]);

  useEffect(() => {
    fetch(`${API_URL}/api/v1/shops/categories`)
      .then(res => res.json())
      .then(data => setCategories(Array.isArray(data) ? data : (data.categories || [])))
      .catch(console.error);

    fetch(`${API_URL}/api/v1/shops/nearby`)
      .then(res => res.json())
      .then(data => setFlashSales(Array.isArray(data.shops) ? data.shops : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!isLocationReady) return;
    
    if (location?.lat && location?.lng) {
      fetchShops(location.lat, location.lng, selectedCategory);
    } else {
      fetchShops(null, null, selectedCategory);
      setLocationError(true);
    }
  }, [selectedCategory, location, isLocationReady]);

  const fetchShops = useCallback((lat, lng, catSlug) => {
    setLoading(true);
    let url = new URL(`${API_URL}/api/v1/shops/nearby`);
    setHighlights([]);
    
    if (lat && lng) {
        url.searchParams.append('lat', lat);
        url.searchParams.append('lng', lng);
    }
    if (catSlug) {
        url.searchParams.append('category', catSlug);
    }

    fetch(url)
      .then(res => res.json())
      .then(data => {
        setShops(data.shops || []);
        
        if (data.shops && !catSlug) {
           const counts = {};
           data.shops.forEach(s => {
               counts[s.category_id] = (counts[s.category_id] || 0) + 1;
           });
           setCategoryCounts(counts);
        }
        
        if (data.fallbackUsed) setFallbackUsed(true);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load shops:', err);
        setLoading(false);
      });
  }, []);

  const handleQuickView = useCallback((shop) => {
    setQuickViewShop(shop);
  }, []);

  const [filteredShops, setFilteredShops] = useState([]);
  const [isFiltering, setIsFiltering] = useState(false);

  // Time-Sliced Execution: Break heavy filtering jobs into time slices
  useEffect(() => {
    setIsFiltering(true);
    let isCancelled = false;
    
    const processChunk = (chunk) => {
      return chunk.filter(shop => {
        const matchesSearch = shop.name.toLowerCase().includes((searchTerm || '').toLowerCase());
        const matchesDelivery = filterDelivery ? shop.delivery_available === 1 : true;
        const matchesTopRated = filterTopRated ? (shop.rating >= 4.0) : true;
        return matchesSearch && matchesDelivery && matchesTopRated;
      });
    };

    const runTimeSlicing = (items, chunkSize = 50) => {
      let index = 0;
      let results = [];
      
      const nextChunk = () => {
        if (isCancelled) return;
        const chunk = items.slice(index, index + chunkSize);
        if (chunk.length === 0) {
          setFilteredShops(results);
          setIsFiltering(false);
          return;
        }
        results = results.concat(processChunk(chunk));
        index += chunkSize;
        requestAnimationFrame(nextChunk);
      };
      
      requestAnimationFrame(nextChunk);
    };

    if (shops.length > 0) {
      runTimeSlicing(shops);
    } else {
      setFilteredShops([]);
      setIsFiltering(false);
    }

    return () => { isCancelled = true; };
  }, [shops, searchTerm, filterDelivery, filterTopRated]);

  const sortedShops = useMemo(() => {
    return [...filteredShops].sort((a, b) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      if (sortBy === 'distance') return (a.distance_km || 0) - (b.distance_km || 0);
      if (sortBy === 'newest') return new Date(b.created_at) - new Date(a.created_at);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      return 0;
    });
  }, [filteredShops, sortBy]);

  const sortedCategories = useMemo(() => {
    const prioritySlugs = ['hospitals-clinics', '2-wheeler-garage', '4-wheeler-garage'];
    return [...categories].sort((a, b) => {
      const aPriority = prioritySlugs.indexOf(a.slug);
      const bPriority = prioritySlugs.indexOf(b.slug);
      if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
      if (aPriority !== -1) return -1;
      if (bPriority !== -1) return 1;
      return 0; 
    });
  }, [categories]);

  const categoriesMap = useMemo(() => {
    const map = {};
    categories.forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 py-12 lg:py-20">
        <div className="container">
          
          <div className="text-center mb-12">
            <h1 className="text-4xl lg:text-5xl font-heading font-black mb-4">Nearby Shops & Services</h1>
            {fallbackUsed && <p className="text-sm text-primary font-medium">Using IP fallback for location. Enable GPS for better accuracy.</p>}
          </div>

          {/* Local Highlights (Shop Reels) */}
          {highlights.length > 0 && (
            <div className="mb-12">
              <h3 className="text-xl font-heading font-bold mb-6 flex items-center gap-2">
                <span className="text-primary"><ShoppingBag className="w-6 h-6" /></span> Local Highlights
              </h3>
              <div className="flex overflow-x-auto gap-6 pb-4 no-scrollbar">
                {highlights.map(story => (
                  <div key={story.id} onClick={() => setActiveStory(story)} className="flex flex-col items-center gap-3 cursor-pointer group min-w-[90px]">
                    <div className="w-20 h-20 rounded-full p-[3px] bg-gradient-to-tr from-primary via-purple-500 to-secondary group-hover:scale-105 transition-transform duration-300">
                      <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                         <img src={(story.shop_photos && JSON.parse(story.shop_photos)[0]) || `https://ui-avatars.com/api/?name=${encodeURIComponent(story.shop_name)}`} 
                              alt={story.shop_name} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="text-xs font-bold text-center w-full truncate px-1">
                      {story.shop_name.replace('Demo ', '')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bento-Box Category Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-12">
              <div 
                onClick={() => setSelectedCategory('')}
                className={`flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                  selectedCategory === '' 
                  ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105 z-10' 
                  : 'bg-card-bg text-text border-border hover:border-primary/50 hover:bg-background-alt'
                }`}
              >
                  <MapIcon className="w-8 h-8 mb-3" />
                  <span className="text-sm font-bold">All Shops</span>
                  {selectedCategory === '' && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm">
                      {shops.length}
                    </span>
                  )}
              </div>
              
              {sortedCategories.slice(0, 10).map(cat => (
                  <div 
                    key={cat.id} 
                    onClick={() => setSelectedCategory(cat.slug)}
                    className={`flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer transition-all duration-300 relative border ${
                      selectedCategory === cat.slug 
                      ? 'bg-primary text-white border-primary shadow-lg shadow-primary/30 scale-105 z-10' 
                      : 'bg-card-bg text-text border-border hover:border-primary/50 hover:bg-background-alt'
                    }`}
                  >
                      <span className="text-3xl mb-3">{cat.icon || '🏪'}</span>
                      <span className="text-xs font-bold text-center leading-tight">{cat.name}</span>
                      {categoryCounts[cat.id] > 0 && (
                          <span className={`absolute -top-2 -right-2 rounded-full w-6 h-6 flex items-center justify-center text-[10px] font-bold shadow-sm ${
                            selectedCategory === cat.slug ? 'bg-white text-primary' : 'bg-primary text-white'
                          }`}>
                              {categoryCounts[cat.id]}
                          </span>
                      )}
                  </div>
              ))}
              
              {sortedCategories.length > 10 && (
                  <div 
                    onClick={() => setShowAllCategories(true)}
                    className="flex flex-col items-center justify-center p-6 rounded-2xl cursor-pointer transition-all duration-300 border-2 border-dashed border-primary/50 bg-primary/5 hover:bg-primary/10 text-primary col-span-2 lg:col-span-1"
                  >
                      <Search className="w-8 h-8 mb-3" />
                      <span className="text-sm font-bold text-center">Explore All {categories.length} Categories</span>
                  </div>
              )}
          </div>

          {/* Sticky Quick-Filters Bar */}
          <div className="sticky top-[70px] z-40 bg-background/80 backdrop-blur-xl p-4 rounded-2xl border border-border shadow-sm mb-12 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input 
                    type="text" 
                    className="w-full bg-background border border-border rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary" 
                    placeholder="Search shops..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <button 
                onClick={() => setFilterOpen(!filterOpen)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${
                  filterOpen ? 'bg-green-500 text-white border-green-500' : 'bg-background text-text border-border hover:border-green-500/50'
                }`}
              >
                <Clock className="w-4 h-4" /> Open Now
              </button>
              
              <button 
                onClick={() => setFilterDelivery(!filterDelivery)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${
                  filterDelivery ? 'bg-primary text-white border-primary' : 'bg-background text-text border-border hover:border-primary/50'
                }`}
              >
                <Truck className="w-4 h-4" /> Delivery
              </button>
              
              <button 
                onClick={() => setFilterTopRated(!filterTopRated)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 border ${
                  filterTopRated ? 'bg-amber-500 text-white border-amber-500' : 'bg-background text-text border-border hover:border-amber-500/50'
                }`}
              >
                <Star className="w-4 h-4" /> Top Rated
              </button>
            </div>
            
            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <select 
                className="bg-background border border-border rounded-full py-2 px-4 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-primary/50"
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
              >
                  <option value="distance">Nearest First</option>
                  <option value="rating">Top Rated</option>
                  <option value="newest">Newest Added</option>
              </select>
              
              <div className="flex bg-card-bg border border-border rounded-full p-1">
                <button 
                  onClick={() => setViewMode('list')} 
                  className={`p-2 rounded-full transition-colors ${viewMode === 'list' ? 'bg-background shadow-sm text-primary' : 'text-text-muted hover:text-text'}`}
                >
                  <List className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('map')} 
                  className={`p-2 rounded-full transition-colors ${viewMode === 'map' ? 'bg-background shadow-sm text-primary' : 'text-text-muted hover:text-text'}`}
                >
                  <MapIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Shop Grid or Map */}
          <div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <ShopCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedShops.length === 0 ? (
              <div className="text-center py-20 bg-card-bg rounded-3xl border border-dashed border-border max-w-2xl mx-auto">
                <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                  <Search className="w-8 h-8 text-text-muted" />
                </div>
                <h3 className="text-2xl font-heading font-bold mb-2">No shops found</h3>
                <p className="text-text-muted">Try adjusting your filters or search term to find what you're looking for.</p>
                <Button onClick={() => { setSearchTerm(''); setFilterDelivery(false); setFilterOpen(false); setFilterTopRated(false); setSelectedCategory(''); }} variant="outline" className="mt-6">
                  Clear All Filters
                </Button>
              </div>
            ) : viewMode === 'map' ? (
              <LazyMap location={location} sortedShops={sortedShops} onSelectShop={handleQuickView} />
            ) : sortedShops.length > 12 ? (
              <VirtualizedShopGrid
                items={sortedShops}
                categoriesMap={categoriesMap}
                onQuickView={handleQuickView}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {sortedShops.map((shop, i) => (
                  <ShopCard
                    key={shop.id}
                    shop={shop}
                    category={categoriesMap[shop.category_id]}
                    index={i}
                    onQuickView={handleQuickView}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* All Categories Modal */}
      <AnimatePresence>
        {showAllCategories && (
          <motion.div 
            initial={{ opacity: 0, y: '100%' }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 flex flex-col"
          >
            <div className="p-6 border-b border-border flex justify-between items-center bg-card-bg shadow-sm sticky top-0 z-10">
              <div>
                <h2 className="text-3xl font-heading font-black text-text">Explore Categories</h2>
                <p className="text-text-muted mt-1 font-medium">Browse all {categories.length} available shop and service types in your area</p>
              </div>
              <button onClick={() => setShowAllCategories(false)} className="bg-background-alt hover:bg-border text-text rounded-full p-3 transition-colors shadow-sm">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 container mx-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 pb-20">
                  <div 
                    onClick={() => { setSelectedCategory(''); setShowAllCategories(false); }}
                    className={`flex flex-col items-center justify-center p-6 rounded-3xl cursor-pointer transition-all duration-300 relative border ${
                      selectedCategory === '' 
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/30 scale-105 z-10' 
                      : 'bg-card-bg text-text border-border hover:border-primary/50 hover:bg-background-alt hover:-translate-y-1 hover:shadow-lg'
                    }`}
                  >
                      <MapIcon className="w-10 h-10 mb-4" />
                      <span className="text-sm font-bold">All Shops</span>
                  </div>
                  
                  {sortedCategories.map(cat => (
                      <div 
                        key={cat.id} 
                        onClick={() => { setSelectedCategory(cat.slug); setShowAllCategories(false); }}
                        className={`flex flex-col items-center justify-center p-6 rounded-3xl cursor-pointer transition-all duration-300 relative border ${
                          selectedCategory === cat.slug 
                          ? 'bg-primary text-white border-primary shadow-xl shadow-primary/30 scale-105 z-10' 
                          : 'bg-card-bg text-text border-border hover:border-primary/50 hover:bg-background-alt hover:-translate-y-1 hover:shadow-lg'
                        }`}
                      >
                          <span className="text-4xl mb-4">{cat.icon || '🏪'}</span>
                          <span className="text-sm font-bold text-center leading-tight">{cat.name}</span>
                          {categoryCounts[cat.id] > 0 && (
                              <span className={`absolute -top-2 -right-2 rounded-full w-8 h-8 flex items-center justify-center text-xs font-bold shadow-sm ${
                                selectedCategory === cat.slug ? 'bg-white text-primary' : 'bg-primary text-white'
                              }`}>
                                  {categoryCounts[cat.id]}
                              </span>
                          )}
                      </div>
                  ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quick View Modal */}
      <AnimatePresence>
        {quickViewShop && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
            onClick={(e) => { if(e.target === e.currentTarget) setQuickViewShop(null); }}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-card-bg w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-border"
            >
              <div className="h-48 relative bg-background">
                 {quickViewShop.photo_urls && quickViewShop.photo_urls !== '[]' && !quickViewShop.photo_urls.includes('[') ? (
                    <img src={JSON.parse(quickViewShop.photo_urls)[0]} alt={quickViewShop.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/5">
                      <Store className="w-20 h-20 text-primary/30" />
                    </div>
                  )}
                  <button onClick={() => setQuickViewShop(null)} className="absolute top-4 right-4 bg-black/40 hover:bg-black/60 text-white rounded-full p-2 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
              </div>
              
              <div className="p-8">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-3xl font-heading font-black mb-1 text-text">{quickViewShop.name}</h2>
                    <p className="text-primary font-bold flex items-center gap-1">
                      <Navigation className="w-4 h-4" /> {quickViewShop.distance_km ? `${quickViewShop.distance_km} km away` : 'Nearby'}
                    </p>
                  </div>
                  <div className="bg-amber-500 text-black px-3 py-1 rounded-full font-bold flex items-center gap-1 shadow-sm">
                    <Star className="w-4 h-4 fill-black" /> {quickViewShop.rating || '4.5'}
                  </div>
                </div>
                
                <p className="text-text-muted leading-relaxed mb-8">
                  {quickViewShop.description || 'Welcome to our shop! We offer the best products and services in your neighborhood.'}
                </p>
                
                <div className="mb-8">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-4 pb-2 border-b border-border">Top Products</h4>
                  <div className="space-y-3">
                    {[1,2,3].map(i => (
                      <div key={i} className="flex justify-between items-center bg-background p-4 rounded-xl border border-border hover:border-primary/50 transition-colors">
                         <div>
                           <div className="font-bold text-text">Popular Item {i}</div>
                           <div className="text-xs text-text-muted font-medium">Bestseller</div>
                         </div>
                         <div className="flex items-center gap-4">
                           <span className="font-bold text-lg text-text">₹{Math.floor(Math.random() * 500) + 50}</span>
                           <Button size="sm" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-white">Add</Button>
                         </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Button className="w-full shadow-lg shadow-primary/20" size="lg" asChild>
                  <a href={`/shops/${quickViewShop.id}`}>View Full Catalog & Shop</a>
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </div>
  );
}
