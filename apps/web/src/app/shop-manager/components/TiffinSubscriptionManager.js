'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Soup, Users, Calendar, Clock, MapPin, Plus, Search, RefreshCw,
  CheckCircle, XCircle, Pause, Play, Star, Truck, Home, ChevronDown,
  ChevronUp, Phone, Edit, Trash2, Eye, Package, ArrowRight, Settings
} from 'lucide-react';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// TIFFIN & MEAL SUBSCRIPTION MANAGER
// Features: Plan Builder, Subscriber Mgmt, Daily Menu, Dispatch List
// Delivery Mode: Shop Self-Delivery (default) + Platform Delivery + Pickup/Dine-in
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Soup },
  { id: 'subscribers', label: 'Subscribers', icon: Users },
  { id: 'daily-menu', label: 'Daily Menu', icon: Calendar },
  { id: 'dispatch', label: 'Dispatch List', icon: Truck },
  { id: 'plans', label: 'Plans', icon: Package },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function TiffinSubscriptionManager({ token, shopId, shop }) {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Section Navigation */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {SECTION_TABS.map(tab => {
          const isActive = activeSection === tab.id;
          return (
            <button
              key={tab.id} onClick={() => setActiveSection(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 18px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <TiffinDashboard token={token} />}
      {activeSection === 'subscribers' && <SubscriberManager token={token} />}
      {activeSection === 'daily-menu' && <DailyMenuPlanner token={token} />}
      {activeSection === 'dispatch' && <DispatchList token={token} />}
      {activeSection === 'plans' && <PlanBuilder token={token} />}
      {activeSection === 'settings' && <TiffinSettings token={token} shop={shop} />}
    </div>
  );
}

// ─── TIFFIN DASHBOARD ──────────────────────────────────────────────
function TiffinDashboard({ token }) {
  const statCards = [
    { label: 'Active Subscribers', value: '—', icon: Users, color: '#22c55e' },
    { label: 'Today\'s Deliveries', value: '—', icon: Truck, color: '#3b82f6' },
    { label: 'Paused', value: '—', icon: Pause, color: '#f59e0b' },
    { label: 'Monthly Revenue', value: '₹—', icon: Star, color: '#8b5cf6' },
    { label: 'Dine-in Today', value: '—', icon: Home, color: '#06b6d4' },
    { label: 'Pickup Today', value: '—', icon: Package, color: '#f97316' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
        🍱 Tiffin Dashboard
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '12px' }}>
        {statCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}
            style={{ padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: `1px solid ${card.color}25` }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${card.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
              <card.icon size={18} color={card.color} />
            </div>
            <p style={{ color: '#64748b', fontSize: '11px', fontWeight: 600, margin: 0, textTransform: 'uppercase' }}>{card.label}</p>
            <p style={{ color: '#e2e8f0', fontSize: '22px', fontWeight: 800, margin: '4px 0 0' }}>{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Delivery Mode Info */}
      <div style={{
        marginTop: '20px', padding: '20px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, margin: '0 0 12px' }}>
          📦 Delivery Modes Available
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {[
            { icon: Truck, label: 'Self Delivery', desc: 'You manage your own delivery team & routes', color: '#22c55e', key: 'shop_delivery' },
            { icon: Home, label: 'Dine-in / Pickup', desc: 'Customers come to your location to eat or pick up', color: '#3b82f6', key: 'pickup' },
            { icon: MapPin, label: 'Platform Delivery', desc: 'Use LocalSampark delivery agents (optional)', color: '#f97316', key: 'platform_delivery' },
          ].map((mode, i) => (
            <div key={i} style={{
              padding: '16px', borderRadius: '12px',
              background: `${mode.color}10`, border: `1px solid ${mode.color}30`,
            }}>
              <mode.icon size={24} color={mode.color} />
              <p style={{ color: mode.color, fontSize: '14px', fontWeight: 700, margin: '8px 0 4px' }}>{mode.label}</p>
              <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>{mode.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SUBSCRIBER MANAGER ────────────────────────────────────────────
function SubscriberManager({ token }) {
  const [filter, setFilter] = useState('active');
  const filterTabs = ['active', 'paused', 'trial', 'cancelled'];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>👥 Subscribers</h2>
      </div>
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px' }}>
        {filterTabs.map(tab => (
          <button key={tab} onClick={() => setFilter(tab)}
            style={{
              padding: '8px 16px', borderRadius: '10px', border: 'none', cursor: 'pointer',
              fontSize: '13px', fontWeight: 600,
              background: filter === tab ? '#f9731620' : 'transparent',
              color: filter === tab ? '#f97316' : '#64748b',
            }}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>
      <div style={{
        textAlign: 'center', padding: '60px 20px',
        background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
        border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <Users size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Subscriber data will appear here once connected to backend</p>
        <p style={{ color: '#475569', fontSize: '12px' }}>Each subscriber shows: name, plan, delivery mode (Self/Pickup/Platform), dietary prefs, pause/resume controls</p>
      </div>
    </div>
  );
}

// ─── DAILY MENU PLANNER ────────────────────────────────────────────
function DailyMenuPlanner({ token }) {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);

  // Generate week dates
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📅 Weekly Menu Planner</h2>

      {/* Week Selector */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto' }}>
        {weekDates.map(date => {
          const d = new Date(date);
          const isSelected = date === selectedDate;
          const isToday = date === today;
          return (
            <button key={date} onClick={() => setSelectedDate(date)}
              style={{
                padding: '10px 16px', borderRadius: '12px', border: 'none', cursor: 'pointer',
                minWidth: '70px', textAlign: 'center',
                background: isSelected ? 'linear-gradient(135deg, #f97316, #ea580c)' : 'rgba(255,255,255,0.06)',
                color: isSelected ? '#fff' : '#94a3b8', transition: 'all 0.2s',
                border: isToday && !isSelected ? '1px solid #f9731650' : '1px solid transparent',
              }}>
              <p style={{ margin: 0, fontSize: '11px', fontWeight: 600 }}>{d.toLocaleDateString('en', { weekday: 'short' })}</p>
              <p style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 800 }}>{d.getDate()}</p>
            </button>
          );
        })}
      </div>

      {/* Menu for selected date */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {['lunch', 'dinner'].map(mealType => (
          <div key={mealType} style={{
            padding: '20px', borderRadius: '16px',
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, margin: '0 0 12px' }}>
              {mealType === 'lunch' ? '🌤️ Lunch Menu' : '🌙 Dinner Menu'}
            </h3>
            <div style={{
              padding: '30px', textAlign: 'center', borderRadius: '12px',
              border: '2px dashed rgba(255,255,255,0.1)',
            }}>
              <Plus size={32} color="#64748b" />
              <p style={{ color: '#64748b', fontSize: '13px', margin: '8px 0 0' }}>
                Add items for {mealType} on {selectedDate}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── DISPATCH LIST ─────────────────────────────────────────────────
function DispatchList({ token }) {
  const [deliveryMode, setDeliveryMode] = useState('all');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>🚚 Today's Dispatch</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {['all', 'shop_delivery', 'pickup', 'platform_delivery'].map(mode => (
            <button key={mode} onClick={() => setDeliveryMode(mode)}
              style={{
                padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: 600,
                background: deliveryMode === mode ? '#3b82f620' : 'transparent',
                color: deliveryMode === mode ? '#3b82f6' : '#64748b',
              }}>
              {mode === 'all' ? 'All' : mode === 'shop_delivery' ? '🚴 Self Delivery' : mode === 'pickup' ? '🏠 Pickup/Dine-in' : '📦 Platform'}
            </button>
          ))}
        </div>
      </div>
      <div style={{
        textAlign: 'center', padding: '60px 20px',
        background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
        border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <Truck size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Today's dispatch list will show here</p>
        <p style={{ color: '#475569', fontSize: '12px' }}>
          Grouped by delivery mode: Self Delivery (your own riders), Pickup/Dine-in (customer collects), Platform Delivery (LocalSampark agents)
        </p>
      </div>
    </div>
  );
}

// ─── PLAN BUILDER ──────────────────────────────────────────────────
function PlanBuilder({ token }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>📦 Subscription Plans</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #f97316, #ea580c)',
          color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Create Plan
        </button>
      </div>

      {/* Example plan card */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        {[
          { name: 'Veg Lunch Only', meal: 'lunch', diet: 'veg', daily: 80, weekly: 520, monthly: 2000 },
          { name: 'Non-Veg Full Day', meal: 'both', diet: 'non_veg', daily: 150, weekly: 980, monthly: 3800 },
          { name: 'Jain Special', meal: 'lunch', diet: 'jain', daily: 100, weekly: 650, monthly: 2500 },
        ].map((plan, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            style={{
              padding: '20px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, margin: 0 }}>{plan.name}</h3>
              <span style={{
                padding: '3px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                background: plan.diet === 'veg' ? '#22c55e20' : plan.diet === 'jain' ? '#f59e0b20' : '#ef444420',
                color: plan.diet === 'veg' ? '#22c55e' : plan.diet === 'jain' ? '#f59e0b' : '#ef4444',
              }}>
                {plan.diet === 'veg' ? '🟢 Veg' : plan.diet === 'jain' ? '🟡 Jain' : '🔴 Non-Veg'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>DAILY</p>
                <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 800, margin: '2px 0 0' }}>₹{plan.daily}</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '8px', background: 'rgba(255,255,255,0.04)' }}>
                <p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>WEEKLY</p>
                <p style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 800, margin: '2px 0 0' }}>₹{plan.weekly}</p>
              </div>
              <div style={{ flex: 1, textAlign: 'center', padding: '8px', borderRadius: '8px', background: '#f9731615' }}>
                <p style={{ color: '#64748b', fontSize: '10px', margin: 0 }}>MONTHLY</p>
                <p style={{ color: '#f97316', fontSize: '16px', fontWeight: 800, margin: '2px 0 0' }}>₹{plan.monthly}</p>
              </div>
            </div>
            <p style={{ color: '#94a3b8', fontSize: '12px', margin: 0 }}>
              {plan.meal === 'both' ? '🌤️ Lunch + 🌙 Dinner' : plan.meal === 'lunch' ? '🌤️ Lunch Only' : '🌙 Dinner Only'}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── TIFFIN SETTINGS ───────────────────────────────────────────────
function TiffinSettings({ token, shop }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>⚙️ Tiffin Settings</h2>
      <div style={{
        padding: '24px', borderRadius: '16px',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <h3 style={{ color: '#e2e8f0', fontSize: '16px', fontWeight: 700, margin: '0 0 16px' }}>Delivery Configuration</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[
            { key: 'shop_delivery', label: '🚴 Self-Managed Delivery', desc: 'You manage your own delivery riders and routes. Full control over delivery timing and quality.', default: true },
            { key: 'pickup', label: '🏠 Dine-in / Customer Pickup', desc: 'Customers can come to your location to eat food on-premise or pick up their tiffin.', default: true },
            { key: 'platform_delivery', label: '📦 Platform Delivery (Optional)', desc: 'Use LocalSampark delivery agents. Platform charges a delivery commission.', default: false },
          ].map((mode, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px', borderRadius: '12px',
              background: mode.default ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${mode.default ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              <div style={{ flex: 1 }}>
                <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: 0 }}>{mode.label}</p>
                <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0' }}>{mode.desc}</p>
              </div>
              <div style={{
                width: '44px', height: '24px', borderRadius: '12px', padding: '2px',
                background: mode.default ? '#22c55e' : '#475569', cursor: 'pointer',
                transition: 'all 0.2s',
              }}>
                <div style={{
                  width: '20px', height: '20px', borderRadius: '10px', background: '#fff',
                  transform: mode.default ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'all 0.2s',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
