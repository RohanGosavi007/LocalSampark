'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ShieldAlert, Users, Car, CheckCircle, Video, PhoneCall } from 'lucide-react';

export default function SecurityDashboard() {
  const [activeTab, setActiveTab] = useState('visitors');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--error-light)', borderRadius: '1rem', color: 'var(--error)' }}>
            <ShieldAlert size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Security Station Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>Gate pass, visitor logs, and emergency SOS alerts</p>
          </div>
          <Badge variant="error" style={{ marginLeft: 'auto' }}>Security Mode</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1rem', borderRadius: '50%' }}>
              <Users size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Active Visitors</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>14</h3>
            </div>
          </Card>
          
          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--success-light)', color: 'var(--success)', padding: '1rem', borderRadius: '50%' }}>
              <Car size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Cabs/Deliveries Today</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>87</h3>
            </div>
          </Card>

          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '1rem', borderRadius: '50%' }}>
              <Video size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Active Cameras</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>12/12</h3>
            </div>
          </Card>
        </div>

        <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Live Gate Activity</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: PhoneCall, title: 'SOS Alert: Medical Emergency Flat 301', time: 'Just now', color: 'var(--error)' },
              { icon: CheckCircle, title: 'Swiggy Delivery (Flat 102) - Approved by Resident', time: '5 mins ago', color: 'var(--success)' },
              { icon: Users, title: 'Guest Entry: Mr. Sharma (Flat 504)', time: '12 mins ago', color: 'var(--primary)' }
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
