'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Scissors, Users, Calendar, Clock, Star, CreditCard, Plus,
  UserCheck, Search, Award, Gift, Timer, ChevronDown, ChevronUp,
  Sparkles, Heart, BarChart3, Settings
} from 'lucide-react';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// SALON, BEAUTY & WELLNESS MANAGER
// Features: Appointments, Waitlist, Staff Calendar, Memberships, Punch Cards
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'waitlist', label: 'Live Waitlist', icon: Timer },
  { id: 'staff', label: 'Staff & Schedule', icon: Users },
  { id: 'services', label: 'Services', icon: Scissors },
  { id: 'memberships', label: 'Memberships', icon: Award },
  { id: 'loyalty', label: 'Punch Cards', icon: Gift },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function SalonWellnessManager({ token, shopId, shop }) {
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
                background: isActive ? 'linear-gradient(135deg, #ec4899, #db2777)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <SalonDashboard token={token} />}
      {activeSection === 'appointments' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'waitlist' && <LiveWaitlist token={token} />}
      {activeSection === 'staff' && <StaffSchedule token={token} />}
      {activeSection === 'services' && <ServiceCatalog token={token} />}
      {activeSection === 'memberships' && <MembershipManager token={token} />}
      {activeSection === 'loyalty' && <PunchCardManager token={token} />}
      {activeSection === 'settings' && <SalonSettings token={token} />}
    </div>
  );
}

function SalonDashboard({ token }) {
  const stats = [
    { label: "Today's Appointments", value: '—', icon: Calendar, color: '#ec4899' },
    { label: 'Walk-ins Today', value: '—', icon: Users, color: '#8b5cf6' },
    { label: 'Current Waitlist', value: '—', icon: Timer, color: '#f59e0b', pulse: true },
    { label: "Today's Revenue", value: '₹—', icon: CreditCard, color: '#22c55e' },
    { label: 'Active Members', value: '—', icon: Award, color: '#06b6d4' },
    { label: 'Avg Rating', value: '⭐ —', icon: Star, color: '#eab308' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>💇 Salon Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {stats.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{
              padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${card.color}25`, position: 'relative',
            }}>
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

function LiveWaitlist({ token }) {
  const [waitlist] = useState([]);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>⏱️ Live Waitlist</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #ec4899, #db2777)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Add Walk-in
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Timer size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>No customers in waitlist</p>
        <p style={{ color: '#475569', fontSize: '12px' }}>Customers see real-time wait estimates. Walk-ins auto-sorted by priority.</p>
      </div>
    </div>
  );
}

function StaffSchedule({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>👥 Staff & Schedule</h2>
      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Users size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Manage your stylists, assign shifts, and view their appointment calendars</p>
      </div>
    </div>
  );
}

function ServiceCatalog({ token }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>✂️ Services Catalog</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Add Service
        </button>
      </div>
      <div style={{ textAlign: 'center', padding: '60px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Scissors size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Add services with pricing, duration, gender, and assigned staff</p>
      </div>
    </div>
  );
}

function MembershipManager({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🏅 Memberships</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {[
          { name: 'Silver', price: 999, duration: '1 month', discount: '10%', color: '#94a3b8' },
          { name: 'Gold', price: 2499, duration: '3 months', discount: '20%', color: '#eab308' },
          { name: 'Platinum', price: 4999, duration: '6 months', discount: '30%', color: '#a855f7' },
        ].map((plan, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{
              padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
              border: `2px solid ${plan.color}30`, textAlign: 'center',
            }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: `${plan.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <Award size={24} color={plan.color} />
            </div>
            <h3 style={{ color: plan.color, fontSize: '18px', fontWeight: 800, margin: '0 0 4px' }}>{plan.name}</h3>
            <p style={{ color: '#e2e8f0', fontSize: '28px', fontWeight: 900, margin: '8px 0' }}>₹{plan.price}</p>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '0 0 4px' }}>{plan.duration} • {plan.discount} off all services</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function PunchCardManager({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🎁 Punch Cards & Loyalty</h2>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Create punch cards: "Visit 10 times, get a free haircut!" Track customer visits and auto-reward loyal customers.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: i < 4 ? '#ec489930' : 'rgba(255,255,255,0.06)',
              border: `2px solid ${i < 4 ? '#ec4899' : 'rgba(255,255,255,0.15)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', color: i < 4 ? '#ec4899' : '#475569',
            }}>
              {i < 4 ? '✓' : i + 1}
            </div>
          ))}
          <div style={{
            width: '36px', height: '36px', borderRadius: '50%',
            background: '#f59e0b20', border: '2px solid #f59e0b',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px',
          }}>
            🎁
          </div>
        </div>
      </div>
    </div>
  );
}

function SalonSettings({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>⚙️ Salon Settings</h2>
      <div style={{ textAlign: 'center', padding: '60px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <Settings size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Working hours, break times, booking rules, auto-reminder SMS config</p>
      </div>
    </div>
  );
}
