'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, MapPin, Camera, FileText, Clock, Users, Star,
  Calendar, Plus, CheckCircle, Send, Phone, MessageCircle,
  DollarSign, Image, TrendingUp, Settings, BarChart3
} from 'lucide-react';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// HOME VISIT SERVICE MANAGER
// For: Plumbers, Electricians, Pest Control, Deep Cleaning, Painters,
//      Interior Designers, Security/CCTV, Locksmiths
// Features: Job requests, Quotation builder, Before/After photos, GPS dispatch
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'requests', label: 'Service Requests', icon: Calendar },
  { id: 'active-jobs', label: 'Active Jobs', icon: Wrench },
  { id: 'quotations', label: 'Quotations', icon: FileText },
  { id: 'gallery', label: 'Work Gallery', icon: Camera },
  { id: 'team', label: 'Team / Technicians', icon: Users },
  { id: 'pricing', label: 'Rate Card', icon: DollarSign },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
];

export default function HomeVisitServiceManager({ token, shopId, shop }) {
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
                background: isActive ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <HomeServiceDashboard token={token} />}
      {activeSection === 'requests' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'active-jobs' && <ActiveJobsBoard token={token} />}
      {activeSection === 'quotations' && <QuotationBuilder token={token} />}
      {activeSection === 'gallery' && <WorkGallery token={token} />}
      {activeSection === 'team' && <TechnicianManager token={token} />}
      {activeSection === 'pricing' && <RateCardManager token={token} />}
      {activeSection === 'analytics' && <ServiceAnalytics token={token} />}
    </div>
  );
}

function HomeServiceDashboard({ token }) {
  const stats = [
    { label: "Today's Requests", value: '—', icon: Calendar, color: '#3b82f6' },
    { label: 'Active Jobs', value: '—', icon: Wrench, color: '#f97316' },
    { label: 'Pending Quotes', value: '—', icon: FileText, color: '#f59e0b', pulse: true },
    { label: "Today's Revenue", value: '₹—', icon: DollarSign, color: '#22c55e' },
    { label: 'Available Technicians', value: '—', icon: Users, color: '#06b6d4' },
    { label: 'Avg Rating', value: '⭐ —', icon: Star, color: '#eab308' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🔧 Service Dashboard</h2>
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

function ActiveJobsBoard({ token }) {
  const jobStatuses = [
    { key: 'en_route', label: '🚗 En Route', color: '#3b82f6' },
    { key: 'on_site', label: '📍 On Site', color: '#f97316' },
    { key: 'in_progress', label: '🔧 In Progress', color: '#8b5cf6' },
    { key: 'completed', label: '✅ Completed', color: '#22c55e' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🔧 Active Jobs</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', minHeight: '300px' }}>
        {jobStatuses.map(col => (
          <div key={col.key} style={{
            borderRadius: '14px', border: `2px solid ${col.color}25`, background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `2px solid ${col.color}25` }}>
              <span style={{ color: col.color, fontSize: '14px', fontWeight: 700 }}>{col.label}</span>
            </div>
            <div style={{ padding: '12px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>
              No active jobs
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuotationBuilder({ token }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>📋 Quotation Builder</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Create Quote
        </button>
      </div>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Build itemized quotations with: materials list (with cost), labor charges, visit charges, taxes, and discount. 
          Send to customer via WhatsApp/SMS/email for approval. Track accepted vs pending quotes.
        </p>
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          {['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'].map(status => (
            <span key={status} style={{
              padding: '4px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
              background: 'rgba(255,255,255,0.06)', color: '#94a3b8',
            }}>{status}: 0</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function WorkGallery({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📸 Work Gallery (Before & After)</h2>
      <div style={{
        padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)', border: '2px dashed rgba(255,255,255,0.1)',
      }}>
        <Camera size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Upload before/after photos of your completed work</p>
        <p style={{ color: '#475569', fontSize: '12px' }}>These show on your shop profile to build trust with new customers</p>
        <button style={{
          marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '10px 20px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Image size={16} /> Upload Photos
        </button>
      </div>
    </div>
  );
}

function TechnicianManager({ token }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>👷 Technicians / Team</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Add Technician
        </button>
      </div>
      <div style={{
        padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <Users size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Manage your technician team with specializations, availability, and GPS tracking</p>
      </div>
    </div>
  );
}

function RateCardManager({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>💰 Rate Card</h2>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>
          Define service rates with: visit charge, per-hour labor, material markup, emergency surcharge, and minimum order value.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {[
            { service: 'Standard Visit', price: '₹149', note: 'Inspection + minor fix' },
            { service: 'Per Hour Labor', price: '₹299/hr', note: 'After first hour' },
            { service: 'Emergency Call', price: '₹499', note: 'Within 30 min arrival' },
            { service: 'Material Markup', price: '15%', note: 'On material cost' },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '14px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>
              <p style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 600, margin: '0 0 4px' }}>{item.service}</p>
              <p style={{ color: '#22c55e', fontSize: '20px', fontWeight: 800, margin: '0 0 4px' }}>{item.price}</p>
              <p style={{ color: '#64748b', fontSize: '11px', margin: 0 }}>{item.note}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceAnalytics({ token }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <TrendingUp size={48} style={{ color: '#475569', marginBottom: '12px' }} />
      <p style={{ color: '#64748b' }}>Revenue trends, popular services, technician performance, and customer satisfaction metrics</p>
    </div>
  );
}
