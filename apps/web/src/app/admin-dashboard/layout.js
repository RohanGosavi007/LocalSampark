'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Wallet,
  Users,
  Building2,
  Settings,
  LogOut,
  MapPin,
  FileText,
  Briefcase,
  ShieldCheck,
  TrendingUp,
  Leaf,
  Car,
  Heart,
  Recycle,
  Activity,
  Landmark,
  Gift,
  MessageCircle,
  Home,
  ShoppingBag,
  Key,
  Receipt,
  Utensils,
  Wrench,
  Calendar,
  ShieldAlert,
  Star,
  AlertTriangle,
  Headset,
  Contact,
  Megaphone,
  Globe
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Approvals Hub', icon: ShieldCheck, path: '/admin-dashboard/approvals' },
    { label: 'Role Management', icon: ShieldCheck, path: '/admin-dashboard/roles' },
    { label: 'Platform Users', icon: Users, path: '/admin-dashboard/users' },
    { label: 'Finance Ledger', icon: Wallet, path: '/admin-dashboard/finance-ledger' },
    { label: 'Revenue Models', icon: TrendingUp, path: '/admin-dashboard/revenue-models' },
    { label: 'Franchise Mapping', icon: MapPin, path: '/admin-dashboard/franchises' },
    { label: 'Shop Categories', icon: Briefcase, path: '/admin-dashboard/shop-categories' },
    { label: 'Delivery Monitor', icon: MapPin, path: '/admin-dashboard/delivery-monitor' },
    { label: 'Krishi & Rural', icon: Leaf, path: '/admin-dashboard/krishi' },
    { label: 'Mobility & Transport', icon: Car, path: '/admin-dashboard/mobility' },
    { label: 'Charity & NGO', icon: Heart, path: '/admin-dashboard/charity' },
    { label: 'Environment & Waste', icon: Recycle, path: '/admin-dashboard/environment' },
    { label: 'Animal Welfare', icon: Activity, path: '/admin-dashboard/animal' },
    { label: 'Civic & Legal', icon: Landmark, path: '/admin-dashboard/civic' },
    { label: 'Earn & Rewards', icon: Gift, path: '/admin-dashboard/rewards' },
    { label: 'Community & Chat', icon: MessageCircle, path: '/admin-dashboard/community' },
    { label: 'Societies & Housing', icon: Home, path: '/admin-dashboard/societies' },
    { label: 'Marketplace Audit', icon: ShoppingBag, path: '/admin-dashboard/marketplace' },
    { label: 'Medical & Care', icon: Activity, path: '/admin-dashboard/medical' },
    { label: 'Properties & Rentals', icon: Key, path: '/admin-dashboard/properties' },
    { label: 'Utility Bills', icon: Receipt, path: '/admin-dashboard/bills' },
    { label: 'Home Chef & Tiffin', icon: Utensils, path: '/admin-dashboard/chef' },
    { label: 'Jobs & Services', icon: Wrench, path: '/admin-dashboard/jobs' },
    { label: 'Event Management', icon: Calendar, path: '/admin-dashboard/events' },
    { label: 'Security & Gatekeeper', icon: ShieldAlert, path: '/admin-dashboard/security' },
    { label: 'Premium & Subs', icon: Star, path: '/admin-dashboard/subscriptions' },
    { label: 'SOS & Emergency', icon: AlertTriangle, path: '/admin-dashboard/sos' },
    { label: 'Support & Helpdesk', icon: Headset, path: '/admin-dashboard/support' },
    { label: 'CRM & Engagement', icon: Contact, path: '/admin-dashboard/crm' },
    { label: 'Ad Campaigns', icon: Megaphone, path: '/admin-dashboard/ads' },
    { label: 'Regional Languages', icon: Globe, path: '/admin-dashboard/languages' },
    { label: 'Settings', icon: Settings, path: '/admin-dashboard/settings' },
  ];

  const handleLogout = () => {
    // In production, clear auth tokens here
    router.push('/login');
  };

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: 'var(--background)' }}>
      {/* Sidebar */}
      <div style={{
        width: '280px',
        backgroundColor: '#0f172a',
        borderRight: '1px solid #1e293b',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem',
        color: '#fff'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontWeight: 900, fontSize: '1.25rem' }}>LS</span>
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>Super Admin</h2>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Revenue Portal</span>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {navItems.map((item) => {
            const isActive = pathname === item.path;
            const Icon = item.icon;
            return (
              <Link key={item.path} href={item.path} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1rem',
                  borderRadius: '0.75rem',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? '#3b82f6' : '#94a3b8',
                  transition: 'all 0.2s ease',
                  fontWeight: isActive ? 600 : 500
                }}>
                  <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #1e293b' }}>
          <button 
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '0.875rem 1rem',
              borderRadius: '0.75rem',
              backgroundColor: 'transparent',
              color: '#ef4444',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              textAlign: 'left'
            }}
          >
            <LogOut size={20} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <header style={{ 
          height: '70px', 
          borderBottom: '1px solid var(--border)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'flex-end',
          padding: '0 2rem',
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Logged in as <strong style={{ color: 'var(--text)' }}>System Admin</strong></span>
            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
              SA
            </div>
          </div>
        </header>
        
        <main style={{ padding: '2rem' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
