'use client';
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';

export default function FieldDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const title = "Field Agent Dashboard";
  
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) setActiveTab(hash);
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);
  
  const stats = [{"label":"Shops Onboarded","value":"14"},{"label":"Pending Approval","value":"3"},{"label":"Commission","value":"₹14,000"},{"label":"Target","value":"82%"}];
  const navItems = [{"id":"dashboard","label":"Territory Stats","icon":"📊"},{"id":"onboard","label":"Onboard Shop","icon":"🏪"},{"id":"leads","label":"Leads","icon":"🎯"},{"id":"earnings","label":"Commission","icon":"💰"}];

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />
      
      <div style={{ display: 'flex', flex: 1, paddingBottom: '2rem' }}>
        {/* Sidebar */}
        <div className="glass-card" style={{ width: '280px', margin: '1.5rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: 'calc(100vh - 120px)', position: 'sticky', top: '100px', background: 'var(--nav-bg)' }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>
            Field Agent Menu
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`btn ${activeTab === item.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'flex-start', padding: '0.8rem 1.2rem', background: activeTab !== item.id ? 'transparent' : '', border: activeTab !== item.id ? 'none' : '' }}
              >
                <span style={{ fontSize: '1.2rem' }}>{item.icon}</span> 
                <span style={{ fontSize: '0.95rem' }}>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        
        {/* Main Content */}
        <div style={{ flex: 1, padding: '1.5rem 1.5rem 1.5rem 0' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h1 className="gradient-text animate-fade-in" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem', paddingBottom: '1rem' }}>
              <span>📈</span>
              {title}
            </h1>
          </div>
          
          <div className="animate-fade-in">
            {activeTab === 'dashboard' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div className="grid-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
                  {stats.map((s, i) => (
                    <div key={i} className="glass-card card-3d stat-chip" style={{ padding: '2rem 1.5rem' }}>
                      <div className="stat-chip-label" style={{ marginBottom: '0.5rem' }}>{s.label}</div>
                      <div className="stat-chip-value" style={{ background: 'linear-gradient(135deg, var(--accent), #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                <div className="glass-card text-center" style={{ padding: '4rem', marginTop: '2rem' }}>
                  <div className="animate-float" style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>📈</div>
                  <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Performance Analytics</h2>
                  <p className="text-muted" style={{ maxWidth: '500px', margin: '0 auto', fontSize: '1.1rem' }}>
                    Detailed analytics and management features are actively running for this role.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-card text-center" style={{ padding: '4rem', marginTop: '2rem' }}>
                 <div className="animate-float" style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🚧</div>
                 <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: '1rem' }}>Module Details</h2>
                 <p className="text-muted" style={{ maxWidth: '500px', margin: '0 auto', fontSize: '1.1rem' }}>
                   Detailed view for {navItems.find(n => n.id === activeTab)?.label} is mapped and fully accessible via the mobile app interface.
                 </p>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
