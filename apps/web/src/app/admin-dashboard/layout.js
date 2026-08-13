'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Wallet, Users, Settings, LogOut, MapPin, Briefcase, 
  Leaf, Car, Heart, Recycle, Activity, Landmark, Gift, MessageCircle, Home, 
  ShoppingBag, Key, Receipt, Utensils, Wrench, Calendar, ShieldAlert, Star, 
  AlertTriangle, Headset, Contact, Megaphone, Globe, ChevronDown, Moon, Sun, 
  ShieldCheck, TrendingUp, Search
} from 'lucide-react';

const sidebarGroups = [
  {
    title: 'System',
    items: [
      { label: 'Overview', icon: LayoutDashboard, path: '/admin-dashboard' },
      { label: 'Approvals Hub', icon: ShieldCheck, path: '/admin-dashboard/approvals' },
      { label: 'Role Management', icon: ShieldCheck, path: '/admin-dashboard/roles' },
      { label: 'Platform Users', icon: Users, path: '/admin-dashboard/users' },
      { label: 'Settings', icon: Settings, path: '/admin-dashboard/settings' },
    ]
  },
  {
    title: 'Finance & Revenue',
    items: [
      { label: 'Finance Ledger', icon: Wallet, path: '/admin-dashboard/finance-ledger' },
      { label: 'Revenue Models', icon: TrendingUp, path: '/admin-dashboard/revenue-models' },
      { label: 'Earn & Rewards', icon: Gift, path: '/admin-dashboard/rewards' },
      { label: 'Premium & Subs', icon: Star, path: '/admin-dashboard/subscriptions' },
    ]
  },
  {
    title: 'Commerce & Logistics',
    items: [
      { label: 'Delivery Monitor', icon: MapPin, path: '/admin-dashboard/delivery-monitor' },
      { label: 'Franchise Mapping', icon: MapPin, path: '/admin-dashboard/franchises' },
      { label: 'Shop Categories', icon: Briefcase, path: '/admin-dashboard/shop-categories' },
      { label: 'Marketplace Audit', icon: ShoppingBag, path: '/admin-dashboard/marketplace' },
      { label: 'Home Chef & Tiffin', icon: Utensils, path: '/admin-dashboard/chef' },
      { label: 'Properties & Rentals', icon: Key, path: '/admin-dashboard/properties' },
    ]
  },
  {
    title: 'Community & Safety',
    items: [
      { label: 'SOS & Emergency', icon: AlertTriangle, path: '/admin-dashboard/sos' },
      { label: 'Societies & Housing', icon: Home, path: '/admin-dashboard/societies' },
      { label: 'Security & Gatekeeper', icon: ShieldAlert, path: '/admin-dashboard/security' },
      { label: 'Community & Chat', icon: MessageCircle, path: '/admin-dashboard/community' },
      { label: 'Event Management', icon: Calendar, path: '/admin-dashboard/events' },
    ]
  },
  {
    title: 'Support & CRM',
    items: [
      { label: 'Support & Helpdesk', icon: Headset, path: '/admin-dashboard/support' },
      { label: 'CRM & Engagement', icon: Contact, path: '/admin-dashboard/crm' },
      { label: 'Marketing & Push', icon: Megaphone, path: '/admin-dashboard/marketing' },
      { label: 'Ad Campaigns', icon: Megaphone, path: '/admin-dashboard/ads' },
      { label: 'Regional Languages', icon: Globe, path: '/admin-dashboard/languages' },
    ]
  },
  {
    title: 'Specialized Verticals',
    items: [
      { label: 'Jobs & Services', icon: Wrench, path: '/admin-dashboard/jobs' },
      { label: 'Krishi & Rural', icon: Leaf, path: '/admin-dashboard/krishi' },
      { label: 'Mobility & Transport', icon: Car, path: '/admin-dashboard/mobility' },
      { label: 'Charity & NGO', icon: Heart, path: '/admin-dashboard/charity' },
      { label: 'Environment & Waste', icon: Recycle, path: '/admin-dashboard/environment' },
      { label: 'Animal Welfare', icon: Activity, path: '/admin-dashboard/animal' },
      { label: 'Civic & Legal', icon: Landmark, path: '/admin-dashboard/civic' },
      { label: 'Medical & Care', icon: Activity, path: '/admin-dashboard/medical' },
      { label: 'Utility Bills', icon: Receipt, path: '/admin-dashboard/bills' },
    ]
  }
];

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, activeRole, loading } = useAuth();
  
  const [theme, setTheme] = useState('cyber-dark'); // 'cyber-dark' | 'glass-light'
  const [openGroups, setOpenGroups] = useState({ 'System': true });
  const [search, setSearch] = useState('');

  // Enforce RBAC
  useEffect(() => {
    if (!loading) {
      if (!user || (activeRole !== 'super_admin' && user?.role !== 'super_admin')) {
        router.push('/login?error=unauthorized');
      }
    }
  }, [user, activeRole, loading, router]);

  useEffect(() => {
    // Apply theme to document
    if (theme === 'cyber-dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.style.setProperty('--bg-base', '#020617');
      document.documentElement.style.setProperty('--bg-sidebar', '#0f172a');
      document.documentElement.style.setProperty('--bg-card', '#1e293b');
      document.documentElement.style.setProperty('--text-main', '#f8fafc');
      document.documentElement.style.setProperty('--text-muted', '#94a3b8');
      document.documentElement.style.setProperty('--border-color', '#334155');
      document.documentElement.style.setProperty('--accent', '#3b82f6');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.setProperty('--bg-base', '#f8fafc');
      document.documentElement.style.setProperty('--bg-sidebar', '#ffffff');
      document.documentElement.style.setProperty('--bg-card', '#ffffff');
      document.documentElement.style.setProperty('--text-main', '#0f172a');
      document.documentElement.style.setProperty('--text-muted', '#64748b');
      document.documentElement.style.setProperty('--border-color', '#e2e8f0');
      document.documentElement.style.setProperty('--accent', '#0ea5e9');
    }
  }, [theme]);

  if (loading || !user || (activeRole !== 'super_admin' && user?.role !== 'super_admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const toggleGroup = (title) => {
    setOpenGroups(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const handleLogout = () => {
    router.push('/login');
  };

  const allItems = sidebarGroups.flatMap(g => g.items);
  const filteredItems = search 
    ? allItems.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const [omniOpen, setOmniOpen] = useState(false);
  const [omniSearch, setOmniSearch] = useState('');
  const [omniResults, setOmniResults] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOmniOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!omniSearch || omniSearch.length < 3) {
      setOmniResults([]);
      return;
    }
    const fetchOmni = async () => {
      try {
        const token = localStorage.getItem('admin_token');
        const res = await fetch(`http://localhost:5000/api/v1/admin/search?q=${omniSearch}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
          setOmniResults(data.results);
        }
      } catch(e) {}
    };
    const timer = setTimeout(fetchOmni, 300);
    return () => clearTimeout(timer);
  }, [omniSearch]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--bg-base)', color: 'var(--text-main)', transition: 'all 0.3s ease' }}>
      
      {/* Sidebar */}
      <div style={{
        width: '300px',
        backgroundColor: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: theme === 'glass-light' ? '4px 0 24px rgba(0,0,0,0.02)' : 'none',
        zIndex: 10
      }}>
        {/* Brand */}
        <div style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}>
            <span style={{ fontWeight: 900, fontSize: '1.25rem', color: '#fff' }}>LS</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, background: theme === 'cyber-dark' ? 'linear-gradient(to right, #60a5fa, #34d399)' : 'var(--text-main)', WebkitBackgroundClip: theme === 'cyber-dark' ? 'text' : 'unset', WebkitTextFillColor: theme === 'cyber-dark' ? 'transparent' : 'unset' }}>GOD MODE</h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em' }}>SUPER ADMIN</span>
          </div>
        </div>

        {/* Global Search */}
        <div style={{ padding: '1rem 1.5rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search modules..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 1rem 0.6rem 2.2rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-base)',
                color: 'var(--text-main)',
                fontSize: '0.875rem',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Navigation */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 1rem 1rem 1rem' }}>
          
          {search ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', margin: '0.5rem 0.5rem', textTransform: 'uppercase' }}>Search Results</div>
              {filteredItems.map(item => {
                const isActive = pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                      borderRadius: '0.5rem', backgroundColor: isActive ? 'var(--accent)' : 'transparent',
                      color: isActive ? '#fff' : 'var(--text-main)', transition: 'all 0.2s ease',
                      fontWeight: isActive ? 600 : 500, fontSize: '0.875rem'
                    }}>
                      <Icon size={18} strokeWidth={isActive ? 2.5 : 2} /> {item.label}
                    </div>
                  </Link>
                );
              })}
              {filteredItems.length === 0 && <div style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>No modules found</div>}
            </div>
          ) : (
            sidebarGroups.map((group, idx) => (
              <div key={idx} style={{ marginBottom: '0.5rem' }}>
                <button 
                  onClick={() => toggleGroup(group.title)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.75rem 0.5rem', background: 'transparent', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em'
                  }}
                >
                  {group.title}
                  <ChevronDown size={14} style={{ transform: openGroups[group.title] ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                </button>
                
                <AnimatePresence>
                  {openGroups[group.title] && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }} 
                      animate={{ height: 'auto', opacity: 1 }} 
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.15rem' }}
                    >
                      {group.items.map((item) => {
                        const isActive = pathname === item.path;
                        const Icon = item.icon;
                        return (
                          <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                            <div style={{
                              display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem',
                              borderRadius: '0.5rem', 
                              backgroundColor: isActive ? (theme === 'cyber-dark' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(14, 165, 233, 0.1)') : 'transparent',
                              color: isActive ? 'var(--accent)' : 'var(--text-main)', 
                              transition: 'all 0.2s ease', fontWeight: isActive ? 600 : 500, fontSize: '0.875rem',
                              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent'
                            }}>
                              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} style={{ color: isActive ? 'var(--accent)' : 'var(--text-muted)' }} />
                              {item.label}
                            </div>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>

        {/* Bottom User Actions */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
             <div style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '0.75rem' }}>
              SA
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>System Admin</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>super_admin</div>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '0.5rem', borderRadius: '0.5rem' }}
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <header style={{ 
          height: '70px', 
          borderBottom: '1px solid var(--border-color)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end',
          padding: '0 2rem',
          backgroundColor: theme === 'cyber-dark' ? 'rgba(15, 23, 42, 0.7)' : 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 5
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={() => setTheme(theme === 'cyber-dark' ? 'glass-light' : 'cyber-dark')}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem',
                borderRadius: '2rem', border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-main)', cursor: 'pointer',
                fontWeight: 600, fontSize: '0.8rem', transition: 'all 0.3s ease',
                boxShadow: theme === 'glass-light' ? '0 2px 8px rgba(0,0,0,0.05)' : '0 2px 8px rgba(0,0,0,0.2)'
              }}
            >
              {theme === 'cyber-dark' ? <Sun size={14} /> : <Moon size={14} />}
              {theme === 'cyber-dark' ? 'Glass Mode' : 'Cyber Mode'}
            </button>
          </div>
        </header>
        
        <main style={{ padding: '2rem', flex: 1, backgroundColor: 'var(--bg-base)' }}>
          {children}
        </main>
      </div>

      {/* Global Omni-Search Modal */}
      <AnimatePresence>
        {omniOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 bg-slate-950/80 backdrop-blur-sm" onClick={() => setOmniOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="flex items-center px-4 py-3 border-b border-slate-800">
                <Search className="w-5 h-5 text-blue-500 mr-3" />
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Omni-Search: Find Users, Shops, Societies..." 
                  value={omniSearch}
                  onChange={e => setOmniSearch(e.target.value)}
                  className="w-full bg-transparent border-none outline-none text-lg text-white placeholder:text-slate-600"
                />
                <div className="px-2 py-1 bg-slate-800 rounded text-xs font-bold text-slate-400 border border-slate-700">ESC</div>
              </div>
              
              <div className="max-h-96 overflow-y-auto p-2">
                {omniSearch.length < 3 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">Type at least 3 characters to search...</div>
                ) : omniResults.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">No results found across the platform.</div>
                ) : (
                  <div className="space-y-1">
                    {omniResults.map(res => (
                      <div key={res.id} className="flex items-center justify-between p-3 hover:bg-slate-800 rounded-xl cursor-pointer group transition">
                        <div>
                          <h4 className="text-white font-bold text-sm">{res.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5">{res.subtitle}</p>
                        </div>
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 text-[10px] uppercase font-bold tracking-wider rounded border border-blue-900/50">
                          {res.type}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
