'use client';
import React from 'react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import ProtectedRoute from '../../components/ProtectedRoute';

export default function FranchiseLayout({ children, activeTab }) {
  const tabs = [
    { id: 'overview', label: '📊 Overview', href: '/franchise/dashboard' },
    { id: 'approvals', label: '✅ Pending Approvals', href: '/franchise/approvals' },
    { id: 'users', label: '👥 Users', href: '/franchise/users' },
    { id: 'shops', label: '🏪 Shops', href: '/franchise/shops' },
    { id: 'providers', label: '🛠️ Providers', href: '/franchise/providers' },
    { id: 'revenue', label: '💰 Payout & Commission', href: '/franchise/revenue' },
    { id: 'agents', label: '🏍️ Field Agents', href: '/franchise/agents' },
    { id: 'posts', label: '📢 Community Posts', href: '/franchise/posts' },
    { id: 'settings', label: '⚙️ Zone Settings', href: '/franchise/settings' }
  ];

  return (
    <ProtectedRoute requiredRoles={['territory_admin', 'super_admin']}>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />
        
        <div className="container" style={{ margin: '3rem auto', flex: 1 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '2.5rem', alignItems: 'start' }}>
            
            {/* Sidebar Navigation */}
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--primary)' }}>Franchise Operations</h3>
              {tabs.map(tab => (
                <a
                  key={tab.id}
                  href={tab.href}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '0.5rem',
                    textDecoration: 'none',
                    background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
                    color: activeTab === tab.id ? 'white' : 'var(--text-muted)',
                    fontWeight: activeTab === tab.id ? 700 : 400,
                    fontSize: '0.88rem'
                  }}
                >
                  {tab.label}
                </a>
              ))}
            </div>

            {/* Dashboard Workspace */}
            <div className="glass-card" style={{ padding: '2.5rem' }}>
              {children}
            </div>

          </div>
        </div>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
