'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Users, AlertTriangle, MessageSquare, ClipboardCheck, Settings, Megaphone } from 'lucide-react';

export default function SocietyAdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--primary-light)', borderRadius: '1rem', color: 'var(--primary)' }}>
            <Settings size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Society Admin Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>Manage residents, notices, and society operations</p>
          </div>
          <Badge variant="primary" style={{ marginLeft: 'auto' }}>Admin Mode</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Total Residents</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>452</h3>
            </div>
          </Card>
          
          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '1rem', borderRadius: '50%' }}>
              <Megaphone size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Active Notices</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>3</h3>
            </div>
          </Card>

          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '1rem', borderRadius: '50%' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Unresolved Complaints</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>12</h3>
            </div>
          </Card>
        </div>

        <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Recent Activity</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: MessageSquare, title: 'New Complaint: Water Issue in A-Wing', time: '10 mins ago', color: 'var(--error)' },
              { icon: ClipboardCheck, title: 'Maintenance Bill Generated for July', time: '2 hours ago', color: 'var(--success)' },
              { icon: Users, title: 'New Tenant Registration: Flat 402', time: 'Yesterday', color: 'var(--primary)' }
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--surface)', borderRadius: '0.75rem', border: '1px solid var(--border)' }}>
                <div style={{ color: item.color }}><item.icon size={20} /></div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{item.title}</h4>
                </div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.time}</span>
              </div>
            ))}
          </div>
        </div>

      </main>
      <Footer />
    </div>
  );
}
