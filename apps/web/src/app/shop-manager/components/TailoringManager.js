'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Ruler, Scissors, Palette, Users, Clock, Star,
  Package, Image, Plus, BarChart3, Settings, Calendar,
  CheckCircle, Search, FileText
} from 'lucide-react';
import OrderManagementPanel from './shared/OrderManagementPanel';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// TAILORING / BOUTIQUE MANAGER
// For: Tailors, Boutiques, Alteration shops
// Features: Measurements, Fabric Catalog, Orders, Trial/Fitting Calendar
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'fabrics', label: 'Fabric Catalog', icon: Palette },
  { id: 'fittings', label: 'Trial / Fitting', icon: Calendar },
  { id: 'designs', label: 'Design Gallery', icon: Image },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function TailoringManager({ token, shopId, shop }) {
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
                background: isActive ? 'linear-gradient(135deg, #d946ef, #a855f7)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <TailoringDashboard />}
      {activeSection === 'orders' && <OrderManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'measurements' && <MeasurementProfiles token={token} />}
      {activeSection === 'fabrics' && <FabricCatalog token={token} />}
      {activeSection === 'fittings' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'designs' && <DesignGallery token={token} />}
      {activeSection === 'settings' && <Placeholder title="Tailoring Settings" icon="⚙️" desc="Standard sizes, delivery timeline, alteration charges, rush fee" />}
    </div>
  );
}

function TailoringDashboard() {
  const stats = [
    { label: 'Pending Orders', value: '—', icon: Package, color: '#d946ef', pulse: true },
    { label: 'In Stitching', value: '—', icon: Scissors, color: '#f97316' },
    { label: 'Ready for Trial', value: '—', icon: Calendar, color: '#22c55e' },
    { label: 'Delivered Today', value: '—', icon: CheckCircle, color: '#3b82f6' },
    { label: 'Revenue (Month)', value: '₹—', icon: BarChart3, color: '#eab308' },
    { label: 'Customer Profiles', value: '—', icon: Users, color: '#8b5cf6' },
  ];
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🧵 Tailoring Dashboard</h2>
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

function MeasurementProfiles({ token }) {
  const measurementFields = [
    { group: 'Upper Body', fields: ['Chest', 'Waist', 'Shoulder', 'Sleeve Length', 'Collar', 'Arm Hole'] },
    { group: 'Lower Body', fields: ['Hip', 'Inseam', 'Outseam', 'Thigh', 'Calf', 'Bottom'] },
    { group: 'General', fields: ['Height', 'Weight', 'Body Type'] },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>📐 Customer Measurements</h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <input placeholder="Search customer..." style={{
              padding: '8px 12px 8px 36px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', fontSize: '13px', outline: 'none', width: '200px',
            }} />
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #d946ef, #a855f7)', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer',
          }}>
            <Plus size={14} /> New Profile
          </button>
        </div>
      </div>

      {/* Measurement Template */}
      <div style={{ padding: '20px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>📋 Standard Measurement Template</p>
        {measurementFields.map((group, i) => (
          <div key={i} style={{ marginBottom: '16px' }}>
            <p style={{ color: '#d946ef', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px' }}>{group.group}</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
              {group.fields.map((field, j) => (
                <div key={j} style={{
                  padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)',
                  background: 'rgba(255,255,255,0.03)',
                }}>
                  <p style={{ color: '#64748b', fontSize: '10px', fontWeight: 600, margin: '0 0 2px', textTransform: 'uppercase' }}>{field}</p>
                  <p style={{ color: '#475569', fontSize: '14px', fontWeight: 700, margin: 0 }}>— in</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FabricCatalog({ token }) {
  const fabrics = [
    { name: 'Cotton (Plain)', price: 150, colors: 12, stock: 'In Stock', type: '🧵' },
    { name: 'Silk (Banarasi)', price: 800, colors: 8, stock: 'In Stock', type: '✨' },
    { name: 'Linen (Premium)', price: 350, colors: 6, stock: 'Low Stock', type: '🧶' },
    { name: 'Polyester Blend', price: 120, colors: 15, stock: 'In Stock', type: '🔄' },
    { name: 'Georgette', price: 250, colors: 10, stock: 'In Stock', type: '🌸' },
    { name: 'Velvet', price: 500, colors: 5, stock: 'Out of Stock', type: '💎' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🎨 Fabric Catalog</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {fabrics.map((fab, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
            style={{
              padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
            }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <span style={{ fontSize: '28px' }}>{fab.type}</span>
              <span style={{
                padding: '2px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 700,
                background: fab.stock === 'In Stock' ? '#22c55e20' : fab.stock === 'Low Stock' ? '#f59e0b20' : '#ef444420',
                color: fab.stock === 'In Stock' ? '#22c55e' : fab.stock === 'Low Stock' ? '#f59e0b' : '#ef4444',
              }}>{fab.stock}</span>
            </div>
            <h3 style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 700, margin: '8px 0 4px' }}>{fab.name}</h3>
            <p style={{ color: '#d946ef', fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>₹{fab.price}/m</p>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0 }}>{fab.colors} color variants</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function DesignGallery({ token }) {
  const categories = ['Kurta', 'Blouse', 'Suit', 'Lehenga', 'Shirt', 'Dress'];
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🎨 Design Gallery</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
        {categories.map((cat, i) => (
          <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.06 }}
            style={{
              aspectRatio: '3/4', borderRadius: '16px', overflow: 'hidden',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <Scissors size={28} style={{ color: '#64748b', marginBottom: '8px' }} />
            <p style={{ color: '#94a3b8', fontSize: '13px', fontWeight: 600 }}>{cat}</p>
            <p style={{ color: '#475569', fontSize: '11px' }}>0 designs</p>
          </motion.div>
        ))}
      </div>
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
