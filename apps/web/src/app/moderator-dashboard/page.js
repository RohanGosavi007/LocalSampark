'use client';
import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { ShieldCheck, Flag, CheckCircle, AlertOctagon, Shield, Eye } from 'lucide-react';

export default function ModeratorDashboard() {
  const [activeTab, setActiveTab] = useState('reports');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>
      <Header />
      <main style={{ flex: 1, padding: '2rem 1rem', maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ padding: '1rem', background: 'var(--success-light)', borderRadius: '1rem', color: 'var(--success)' }}>
            <ShieldCheck size={32} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Moderator Dashboard</h1>
            <p style={{ color: 'var(--text-muted)' }}>Review reports, approve posts, and manage content</p>
          </div>
          <Badge variant="success" style={{ marginLeft: 'auto' }}>Moderator Mode</Badge>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--warning-light)', color: 'var(--warning)', padding: '1rem', borderRadius: '50%' }}>
              <Flag size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Pending Reports</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>28</h3>
            </div>
          </Card>
          
          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--primary-light)', color: 'var(--primary)', padding: '1rem', borderRadius: '50%' }}>
              <Eye size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Posts to Review</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>15</h3>
            </div>
          </Card>

          <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--error-light)', color: 'var(--error)', padding: '1rem', borderRadius: '50%' }}>
              <AlertOctagon size={24} />
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600 }}>Banned Users</p>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700 }}>4</h3>
            </div>
          </Card>
        </div>

        <div className="glass-card" style={{ padding: '2rem', borderRadius: '1rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>Recent Moderation Activity</h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { icon: Flag, title: 'Reported Post: "Fake Service Listing"', time: '15 mins ago', color: 'var(--warning)' },
              { icon: CheckCircle, title: 'Approved 5 new local event listings', time: '1 hour ago', color: 'var(--success)' },
              { icon: Shield, title: 'Removed spam comments from Townsquare feed', time: '3 hours ago', color: 'var(--primary)' }
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
