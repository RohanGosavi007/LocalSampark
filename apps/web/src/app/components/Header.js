'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { LocationContext } from '../../context/LocationContext';
import LanguageToggle, { useLanguage } from './LanguageToggle';
import { 
  Search, Bell, MapPin, ChevronDown, User, Store, Bike, ChefHat, HeartHandshake,
  Wrench, Building2, Car, Users, ShieldAlert, ShoppingCart, LogOut, Settings, Leaf, Map,
  MessageSquare, Wallet, Gift, Crown, Building, ShoppingBag, Package, Dog, Calendar, Heart, Trash2, Activity, Stethoscope, Menu, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const AccountDropdown = dynamic(() => import('./AccountDropdown'), { ssr: false });

export default function Header() {
  const { user, activeRole, assignedRoles, switchRole, logout, mockLogin } = useAuth();
  const { t } = useLanguage();
  const [darkMode, setDarkMode] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const [locState, setLocState] = useState('');
  const [locDistrict, setLocDistrict] = useState('');
  const [locZone, setLocZone] = useState('');
  
  const { location, isLocationReady, updateLocation, STATES, DISTRICTS, TERRITORIES, isHierarchyLoading } = React.useContext(LocationContext) || { STATES: [], DISTRICTS: {}, TERRITORIES: [] };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
      document.body.classList.add('dark-mode');
    }
  }, []);

  const toggleTheme = () => {
    if (darkMode) {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    }
    setDarkMode(!darkMode);
  };

  const handleSaveLocation = (e) => {
    e.preventDefault();
    if(locZone !== '' && TERRITORIES && TERRITORIES.length > 0) {
      const selectedT = TERRITORIES.find(t => t.zone === locZone);
      updateLocation({
        pincode: selectedT ? selectedT.pin : '',
        addressLabel: locZone,
        region_id: selectedT ? selectedT.id : null,
        lat: selectedT ? selectedT.lat : 18.5793,
        lng: selectedT ? selectedT.lng : 73.8796
      });
      setShowLocationModal(false);
    }
  };

  const getRoleRoute = (r) => {
    switch (r) {
      case 'super_admin':
      case 'admin': return '/admin-dashboard';
      case 'territory_admin': return '/franchise-dashboard';
      case 'area_agent':
      case 'field_agent': return '/field-dashboard';
      case 'shop_owner': return '/shop-dashboard';
      case 'delivery_agent': return '/delivery-dashboard';
      case 'service_provider': return '/service-dashboard';
      case 'society_admin': return '/society-admin-dashboard';
      case 'security_guard': return '/security-dashboard';
      case 'moderator': return '/moderator-dashboard';
      default: return '/dashboard';
    }
  };

  const formatRole = (r) => {
    if (!r) return '';
    return r.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  // Render navigation mega-menus
  const renderNavigation = () => {
    const isStaffRole = ['society_admin', 'security_guard', 'moderator', 'super_admin', 'admin', 'territory_admin', 'area_agent', 'field_agent', 'delivery_agent', 'service_provider', 'shop_owner'].includes(activeRole);

    return (
      <div className="hidden 2xl:flex items-center gap-6 relative">
          <a href="/features" className="text-text font-medium text-sm hover:text-primary transition-colors">Features</a>
          <a href="/jobs" className="text-text font-medium text-sm hover:text-primary transition-colors">Jobs</a>
          <a href="/franchise" className="text-text font-medium text-sm hover:text-primary transition-colors">Franchise</a>
          
          {!isStaffRole && (
            <React.Fragment>
              <div 
                className="relative" 
                onMouseEnter={() => setActiveDropdown('services')} 
                onMouseLeave={() => setActiveDropdown(null)}
              >
            <button className="flex items-center gap-1 text-text font-medium text-sm hover:text-primary transition-colors">
              Services <ChevronDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {activeDropdown === 'services' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-64 glass-card p-2 rounded-xl border border-border shadow-2xl z-50 flex flex-col gap-1"
                >
                  <a href="/shops" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-primary/10 text-primary rounded-md"><Store className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Shops Directory</p><p className="text-xs text-text-muted">Local stores & groceries</p></div>
                  </a>
                  <a href="/chef" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-secondary/10 text-secondary rounded-md"><ChefHat className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Home-Chefs</p><p className="text-xs text-text-muted">Authentic local meals</p></div>
                  </a>
                  <a href="/delivery" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-md"><Bike className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Delivery</p><p className="text-xs text-text-muted">Local logistics</p></div>
                  </a>
                  <a href="/carpool" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-yellow-500/10 text-yellow-600 rounded-md"><Car className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Ride Sharing</p><p className="text-xs text-text-muted">Daily commute</p></div>
                  </a>
                  <a href="/properties" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-md"><Building className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Real Estate</p><p className="text-xs text-text-muted">Rentals & PGs</p></div>
                  </a>
                  <a href="/marketplace" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-md"><ShoppingBag className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Marketplace</p><p className="text-xs text-text-muted">Buy & sell items</p></div>
                  </a>
                  <a href="/pets" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-pink-500/10 text-pink-500 rounded-md"><Dog className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Pet Hub</p><p className="text-xs text-text-muted">Adoption & services</p></div>
                  </a>
                  <a href="/equipment" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-orange-500/10 text-orange-500 rounded-md"><Package className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Rentals</p><p className="text-xs text-text-muted">Equipment on rent</p></div>
                  </a>
                  <a href="/scrap" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-gray-500/10 text-gray-500 rounded-md"><Trash2 className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Scrap</p><p className="text-xs text-text-muted">Sell scrap locally</p></div>
                  </a>
                  <div className="h-px bg-border my-1" />
                  <a href="/services" className="p-2 text-sm text-primary font-semibold text-center hover:bg-primary/5 rounded-lg transition-colors">View All Services →</a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            className="relative" 
            onMouseEnter={() => setActiveDropdown('community')} 
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1 text-text font-medium text-sm hover:text-primary transition-colors">
              Community <ChevronDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {activeDropdown === 'community' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-64 glass-card p-2 rounded-xl border border-border shadow-2xl z-50 flex flex-col gap-1"
                >
                  <a href="/townsquare" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-purple-500/10 text-purple-500 rounded-md"><Users className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Townsquare Feed</p><p className="text-xs text-text-muted">Local news & updates</p></div>
                  </a>
                  <a href="/events" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-pink-500/10 text-pink-500 rounded-md"><Calendar className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Local Events</p><p className="text-xs text-text-muted">Discover happenings</p></div>
                  </a>
                  <a href="/volunteer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-green-500/10 text-green-500 rounded-md"><HeartHandshake className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Volunteer & CSR</p><p className="text-xs text-text-muted">Give back to society</p></div>
                  </a>
                  <a href="/donations" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                    <div className="p-2 bg-rose-500/10 text-rose-500 rounded-md"><Heart className="w-4 h-4" /></div>
                    <div><p className="text-sm font-semibold">Charity & Relief</p><p className="text-xs text-text-muted">Donation drives</p></div>
                  </a>
                  {activeRole === 'resident_member' && (
                    <a href="/society" className="flex items-center gap-3 p-2 rounded-lg hover:bg-border/40 transition-colors">
                      <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-md"><Building2 className="w-4 h-4" /></div>
                      <div><p className="text-sm font-semibold">Society Hub</p><p className="text-xs text-text-muted">Manage your apartment</p></div>
                    </a>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div 
            className="relative" 
            onMouseEnter={() => setActiveDropdown('utilities')} 
            onMouseLeave={() => setActiveDropdown(null)}
          >
            <button className="flex items-center gap-1 text-text font-medium text-sm hover:text-primary transition-colors">
              Utilities <ChevronDown className="w-4 h-4" />
            </button>
            <AnimatePresence>
              {activeDropdown === 'utilities' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full left-0 mt-2 w-56 glass-card p-2 rounded-xl border border-border shadow-2xl z-50 flex flex-col gap-1"
                >
                  <a href="/subscriptions" className="p-2 text-sm hover:bg-border/40 rounded-lg transition-colors">Subscriptions</a>
                  <a href="/bills" className="p-2 text-sm hover:bg-border/40 rounded-lg transition-colors">Bills & Payments</a>
                  <a href="/health" className="p-2 text-sm hover:bg-border/40 rounded-lg transition-colors flex items-center justify-between">
                    Health & Wellness <Activity className="w-4 h-4 text-emerald-500" />
                  </a>
                  <a href="/care" className="p-2 text-sm hover:bg-border/40 rounded-lg transition-colors flex items-center justify-between">
                    Home & Elder Care <HeartHandshake className="w-4 h-4 text-teal-500" />
                  </a>
                  <a href="/medical" className="p-2 text-sm font-semibold text-red-500 flex items-center justify-between hover:bg-red-500/10 rounded-lg transition-colors">
                    Medical & Blood Bank <ShieldAlert className="w-4 h-4" />
                  </a>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
            </React.Fragment>
          )}
          
          {user && (
            <>
              <div className="w-px h-5 bg-border mx-1"></div>
              <a href={getRoleRoute(activeRole)} className="text-primary font-bold text-sm hover:underline transition-colors flex items-center gap-1">
                Dashboard <ChevronDown className="w-3 h-3 -rotate-90" />
              </a>
            </>
          )}

          <div className="w-px h-5 bg-border mx-1"></div>
          <a href="/investor-demo" className="text-emerald-500 font-bold text-sm hover:underline transition-colors flex items-center gap-1">
            Investor Demo
          </a>
        </div>
      );
  };

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'backdrop-blur-xl bg-nav-bg shadow-sm' : 'bg-transparent'}`}>
      <div className="container mx-auto px-4 2xl:px-8 py-3 2xl:py-4 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <a href="/" className="flex items-center group">
          <img 
            src="/logo.png" 
            alt="Local Sampark" 
            className="h-12 object-contain group-hover:scale-105 transition-transform" 
          />
        </a>

        {/* Global Location & Search */}
        <div className="flex-1 max-w-2xl hidden md:flex items-center gap-3 relative z-50">
          <button 
            onClick={() => setShowLocationModal(!showLocationModal)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-background-alt border border-border hover:border-primary/50 transition-colors shadow-sm shrink-0"
          >
            <MapPin className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold truncate max-w-[120px]">{location?.addressLabel || 'Set Location'}</span>
            <ChevronDown className="w-4 h-4 text-text-muted" />
          </button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input 
              type="text"
              role="searchbox"
              aria-label="Search for products, shops, or services"
              placeholder='Search for "Groceries" or "Plumber"...' 
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-background-alt border border-border focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all shadow-sm text-sm"
            />
          </div>

          <AnimatePresence>
            {showLocationModal && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 mt-2 w-[340px] glass-card p-5 rounded-2xl shadow-2xl z-50"
              >
                <h4 className="text-lg font-heading font-semibold mb-1">Update Location</h4>
                <p className="text-xs text-text-muted mb-4">Select your zone to explore nearby shops.</p>
                
                <form onSubmit={handleSaveLocation} className="flex flex-col gap-3">
                  <select className="form-input text-sm" required value={locState} onChange={e => { setLocState(e.target.value); setLocDistrict(''); setLocZone(''); }}>
                    <option value="">Select State</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <select className="form-input text-sm" required value={locDistrict} onChange={e => { setLocDistrict(e.target.value); setLocZone(''); }} disabled={!locState}>
                    <option value="">Select District</option>
                    {(DISTRICTS[locState] || []).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <select className="form-input text-sm" required value={locZone} onChange={e => setLocZone(e.target.value)} disabled={!locDistrict}>
                    <option value="">Select Zone / Area</option>
                    {TERRITORIES.filter(t => t.district === locDistrict).map(t => <option key={t.zone} value={t.zone}>{t.zone} (PIN: {t.pin})</option>)}
                  </select>
                  <button type="submit" className="btn btn-primary mt-2 w-full py-2">Update Location</button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 2xl:gap-4 shrink-0">
          <a href="/krishi" className="hidden 2xl:flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-600 font-semibold text-sm hover:bg-green-500/20 transition-colors">
            <Leaf className="w-4 h-4" /> {t('nav_krishi')}
          </a>

          {renderNavigation()}

          <LanguageToggle />

          {/* Dev Quick Login moved to FloatingDevDock component */}

          <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-border/50 text-text-muted hover:text-text transition-colors">
            {darkMode ? '☀️' : '🌙'}
          </button>

          {/* Cart Icon */}
          <a 
            href="/checkout"
            aria-label="Open Shopping Cart"
            className="p-2 rounded-full hover:bg-border/50 text-text-muted hover:text-text transition-colors relative block"
          >
            <ShoppingCart className="w-5 h-5" />
            <span className="absolute top-0 right-0 w-4 h-4 bg-secondary text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-background">
              0
            </span>
          </a>

          {user ? (
            <div className="flex items-center gap-2">
              <a 
                href="/chat"
                className="p-2 rounded-full hover:bg-border/50 text-text-muted hover:text-text transition-colors relative"
              >
                <MessageSquare className="w-5 h-5" />
              </a>

              <button 
                onClick={() => setActiveDropdown(activeDropdown === 'notifications' ? null : 'notifications')}
                className="p-2 rounded-full hover:bg-border/50 text-text-muted hover:text-text transition-colors relative"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse"></span>
              </button>
              
              <AnimatePresence>
                {activeDropdown === 'notifications' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full right-4 mt-2 w-80 glass-card p-4 rounded-2xl shadow-2xl z-50"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-heading font-semibold text-lg">Notifications</h4>
                      <button className="text-xs text-primary font-medium hover:underline">Mark all read</button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-border/30 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Store className="w-4 h-4"/></div>
                        <div>
                          <p className="text-sm font-medium">Order Confirmed</p>
                          <p className="text-xs text-text-muted">Sharma Grocery accepted your order</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <AccountDropdown />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <a href="/login" className="hidden sm:block text-sm font-semibold text-text hover:text-primary transition-colors px-2">Log In</a>
              <a href="/register" className="btn btn-primary px-4 py-2 text-sm h-10 rounded-full flex items-center gap-2 shadow-md">
                <User className="w-4 h-4" /> <span className="hidden sm:inline">Sign Up</span>
              </a>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className="2xl:hidden p-2 text-text-muted hover:text-text focus:outline-none"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: '100vh' }}
            exit={{ opacity: 0, height: 0 }}
            className="2xl:hidden fixed inset-0 top-[72px] bg-background z-40 overflow-y-auto"
          >
            <div className="p-4 flex flex-col gap-6">
              {/* Mobile Search & Location */}
              <div className="flex flex-col gap-3">
                <button onClick={() => { setShowLocationModal(true); setMobileMenuOpen(false); }} className="flex items-center gap-2 p-3 rounded-xl bg-background-alt border border-border">
                  <MapPin className="w-5 h-5 text-primary" />
                  <span className="font-semibold">{location?.addressLabel || 'Set Location'}</span>
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                  <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-3 rounded-xl bg-background-alt border border-border text-sm" />
                </div>
              </div>

              {/* Mobile Nav Links */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Platform</p>
                  <a href="/shops" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Shops Directory</a>
                  <a href="/features" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Features</a>
                  <a href="/jobs" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Jobs & Gigs</a>
                  <a href="/franchise" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Franchise (500 Territories)</a>
                  <a href="/services" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">All Services</a>
                  <a href="/investor-demo" className="p-3 font-semibold text-emerald-500 hover:bg-border/40 rounded-xl">Investor Demo</a>
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Community</p>
                  <a href="/townsquare" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Townsquare Feed</a>
                  <a href="/events" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Local Events</a>
                  <a href="/volunteer" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Volunteer & CSR</a>
                  <a href="/donations" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Charity & Relief</a>
                  {activeRole === 'resident_member' && (
                    <a href="/society" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Society Hub</a>
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Utilities</p>
                  <a href="/subscriptions" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Subscriptions</a>
                  <a href="/bills" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Bills & Payments</a>
                  <a href="/health" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Health & Wellness</a>
                  <a href="/care" className="p-3 font-semibold text-text hover:bg-border/40 rounded-xl">Home & Elder Care</a>
                  <a href="/medical" className="p-3 font-semibold text-red-500 hover:bg-red-500/10 rounded-xl">Medical & Blood Bank</a>
                </div>
              </div>

              {/* Mobile Dev Login */}
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Quick Role Login</p>
                <div className="grid grid-cols-2 gap-2">
                  {['super_admin', 'territory_admin', 'shop_owner', 'delivery_agent', 'user', 'service_provider'].map((role) => (
                    <button key={role} onClick={() => { mockLogin(role); window.location.href = getRoleRoute(role); }} className="p-2 border border-border rounded-lg text-xs font-semibold text-left truncate hover:bg-primary/10">
                      {formatRole(role)}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
