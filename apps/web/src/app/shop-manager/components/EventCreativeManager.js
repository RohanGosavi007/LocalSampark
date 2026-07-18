'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Camera, Calendar, Star, Clock, Users, Package, Image,
  Heart, MapPin, CheckCircle, ChevronRight, Award,
  Play, Gift, Palette, Music, BarChart3, Settings
} from 'lucide-react';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// EVENT & CREATIVE MANAGER
// For: Event Planners, Photographers, Videographers, Wedding Planners, Catering
// Features: Portfolio, Date Calendar, Packages, Client Projects
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'bookings', label: 'Bookings', icon: Calendar },
  { id: 'portfolio', label: 'Portfolio', icon: Image },
  { id: 'packages', label: 'Packages', icon: Package },
  { id: 'calendar', label: 'Date Calendar', icon: Calendar },
  { id: 'clients', label: 'Client Projects', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function EventCreativeManager({ token, shopId, shop }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {SECTION_TABS.map(tab => {
          const isActive = activeSection === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveSection(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? 'linear-gradient(135deg, #a855f7, #9333ea)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <EventDashboard token={token} />}
      {activeSection === 'bookings' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'portfolio' && <PortfolioManager token={token} />}
      {activeSection === 'packages' && <PackageBuilder token={token} />}
      {activeSection === 'calendar' && <DateCalendar token={token} />}
      {activeSection === 'clients' && <ClientProjects token={token} />}
      {activeSection === 'settings' && <Placeholder title="Event Settings" icon="⚙️" desc="Booking policies, advance payment %, cancellation rules, travel charges" />}
    </div>
  );
}

function EventDashboard({ token }) {
  const stats = [
    { label: 'Upcoming Events', value: '—', icon: Calendar, color: '#a855f7' },
    { label: 'This Month Revenue', value: '₹—', icon: Award, color: '#22c55e' },
    { label: 'Pending Inquiries', value: '—', icon: Users, color: '#f59e0b', pulse: true },
    { label: 'Portfolio Views', value: '—', icon: Image, color: '#3b82f6' },
    { label: 'Avg Rating', value: '⭐ —', icon: Star, color: '#eab308' },
    { label: 'Dates Blocked', value: '—', icon: Calendar, color: '#ef4444' },
  ];
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🎉 Events Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {stats.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${card.color}25`, position: 'relative' }}>
            {card.pulse && <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: card.color, animation: 'pulse 1.5s infinite' }} />}
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <card.icon size={18} color={card.color} />
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{card.label}</p>
            <p style={{ color: '#e2e8f0', fontSize: '22px', fontWeight: 800, margin: '4px 0 0' }}>{card.value}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PortfolioManager({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📸 Portfolio</h2>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px',
      }}>
        {['Wedding Ceremony', 'Pre-Wedding Shoot', 'Birthday Party', 'Corporate Event'].map((cat, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.08 }}
            style={{
              aspectRatio: '4/3', borderRadius: '16px', overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', position: 'relative',
            }}>
            <Camera size={32} style={{ color: '#64748b', marginBottom: '8px' }} />
            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>{cat}</p>
            <p style={{ color: '#475569', fontSize: '11px' }}>0 photos</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PackageBuilder({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📦 Service Packages</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[
          { name: 'Basic Package', price: 15000, includes: ['4 hours coverage', '100 edited photos', 'Online gallery'], color: '#94a3b8' },
          { name: 'Premium Package', price: 35000, includes: ['Full day coverage', '300 edited photos', 'Highlights reel', 'Photo album'], color: '#eab308', popular: true },
          { name: 'Luxury Package', price: 75000, includes: ['2 day coverage', '500+ edited photos', 'Full video', 'Drone shots', 'Photo album', 'Pre-event shoot'], color: '#a855f7' },
        ].map((pkg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{
              padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
              border: `2px solid ${pkg.color}30`, position: 'relative',
            }}>
            {pkg.popular && <span style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: pkg.color, color: '#000', padding: '2px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 700 }}>Most Booked</span>}
            <h3 style={{ color: pkg.color, fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>{pkg.name}</h3>
            <p style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 900, margin: '8px 0 12px' }}>₹{pkg.price.toLocaleString()}</p>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {pkg.includes.map((item, j) => (
                <li key={j} style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px', padding: '3px 0' }}>
                  <CheckCircle size={14} color="#22c55e" /> {item}
                </li>
              ))}
            </ul>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DateCalendar({ token }) {
  const today = new Date();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const bookedDates = [5, 12, 18, 25]; // Example

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📅 Availability Calendar</h2>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
          {today.toLocaleDateString('en', { month: 'long', year: 'numeric' })}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', color: '#64748b', fontSize: '11px', fontWeight: 600, padding: '4px' }}>{d}</div>
          ))}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const isBooked = bookedDates.includes(day);
            const isPast = day < today.getDate();
            return (
              <div key={day} style={{
                textAlign: 'center', padding: '8px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                background: isBooked ? '#ef444420' : isPast ? 'transparent' : 'rgba(255,255,255,0.04)',
                color: isBooked ? '#ef4444' : isPast ? '#475569' : '#e2e8f0',
                border: isBooked ? '1px solid #ef444440' : day === today.getDate() ? '1px solid #a855f7' : '1px solid transparent',
                cursor: isPast ? 'default' : 'pointer',
              }}>
                {day}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: '#ef444420', border: '1px solid #ef444440' }} /> Booked
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, border: '1px solid #a855f7' }} /> Today
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.04)' }} /> Available
          </span>
        </div>
      </div>
    </div>
  );
}

function ClientProjects({ token }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <Users size={48} style={{ color: '#475569', marginBottom: '12px' }} />
      <p style={{ color: '#64748b' }}>Client project tracker: timeline, deliverables checklist, payment milestones, feedback loop</p>
    </div>
  );
}

function Placeholder({ title, icon, desc }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <span style={{ fontSize: '48px' }}>{icon}</span>
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700, margin: '12px 0 4px' }}>{title}</h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>{desc}</p>
    </div>
  );
}
