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
  TrendingUp
} from 'lucide-react';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  
  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/admin-dashboard' },
    { label: 'Approvals Hub', icon: ShieldCheck, path: '/admin-dashboard/approvals' },
    { label: 'Revenue Dashboard', icon: Wallet, path: '/admin-dashboard/revenue' },
    { label: 'Finance Ledger', icon: Wallet, path: '/admin/revenue' },
    { label: 'Commission Hub', icon: Wallet, path: '/admin-dashboard/commissions' },
    { label: 'Shop Categories', icon: Briefcase, path: '/admin-dashboard/shop-categories' },
    { label: 'Delivery Monitor', icon: MapPin, path: '/admin-dashboard/delivery-monitor' },
    { label: 'Revenue Models', icon: TrendingUp, path: '/admin-dashboard/revenue-models' },
    { label: 'Franchise Mapping', icon: MapPin, path: '/admin-dashboard/franchises' },
    { label: 'Payout Requests', icon: FileText, path: '/admin-dashboard/payouts' },
    { label: 'Platform Users', icon: Users, path: '/admin-dashboard/users' },
    { label: 'Community Admin', icon: Users, path: '/community-hub' },
    { label: 'Operations CRM', icon: Briefcase, path: '/crm' },
    { label: 'SOS Radar', icon: ShieldCheck, path: '/sos-dashboard' },
    { label: 'Logistics Monitor', icon: MapPin, path: '/admin/logistics' },
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
