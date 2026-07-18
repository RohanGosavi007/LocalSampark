'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Scale, FileText, Calendar, Users, Clock, Star, Shield,
  Briefcase, FolderOpen, Upload, MessageCircle, Phone,
  BarChart3, Settings, CheckCircle, Plus
} from 'lucide-react';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// PROFESSIONAL CONSULTATION MANAGER
// For: CAs, Tax Consultants, Lawyers, Insurance Agents, Real Estate
// Features: Appointments, Document Vault, Case Tracker, Client Directory
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'cases', label: 'Cases / Projects', icon: Briefcase },
  { id: 'documents', label: 'Document Vault', icon: FolderOpen },
  { id: 'clients', label: 'Client Directory', icon: Users },
  { id: 'services', label: 'Service Catalog', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function ProfessionalConsultationManager({ token, shopId, shop }) {
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
                background: isActive ? 'linear-gradient(135deg, #64748b, #475569)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <ConsultDashboard token={token} />}
      {activeSection === 'appointments' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'cases' && <CaseTracker token={token} />}
      {activeSection === 'documents' && <DocumentVault token={token} />}
      {activeSection === 'clients' && <ClientDirectory token={token} />}
      {activeSection === 'services' && <ServiceCatalog token={token} />}
      {activeSection === 'settings' && <Placeholder title="Practice Settings" icon="⚙️" desc="Consultation fees, working hours, holiday calendar, auto-reminders" />}
    </div>
  );
}

function ConsultDashboard({ token }) {
  const stats = [
    { label: "Today's Appointments", value: '—', icon: Calendar, color: '#64748b' },
    { label: 'Active Cases', value: '—', icon: Briefcase, color: '#3b82f6' },
    { label: 'Pending Documents', value: '—', icon: FileText, color: '#f59e0b', pulse: true },
    { label: "This Month's Revenue", value: '₹—', icon: Scale, color: '#22c55e' },
    { label: 'Total Clients', value: '—', icon: Users, color: '#8b5cf6' },
    { label: 'Avg Rating', value: '⭐ —', icon: Star, color: '#eab308' },
  ];
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>⚖️ Practice Dashboard</h2>
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

function CaseTracker({ token }) {
  const caseStatuses = [
    { key: 'new', label: '📥 New', color: '#3b82f6' },
    { key: 'in_progress', label: '📋 In Progress', color: '#f97316' },
    { key: 'awaiting_docs', label: '📄 Awaiting Docs', color: '#f59e0b' },
    { key: 'completed', label: '✅ Completed', color: '#22c55e' },
  ];
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>📂 Case / Project Tracker</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #64748b, #475569)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> New Case
        </button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', minHeight: '250px' }}>
        {caseStatuses.map(col => (
          <div key={col.key} style={{
            borderRadius: '14px', border: `2px solid ${col.color}25`, background: 'rgba(255,255,255,0.02)',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: `2px solid ${col.color}25` }}>
              <span style={{ color: col.color, fontSize: '13px', fontWeight: 700 }}>{col.label}</span>
            </div>
            <div style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '12px' }}>
              No cases
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DocumentVault({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📁 Document Vault</h2>
      <div style={{
        padding: '40px 20px', textAlign: 'center', borderRadius: '16px',
        border: '2px dashed rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.03)',
      }}>
        <Upload size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Drag & drop documents or click to upload</p>
        <p style={{ color: '#475569', fontSize: '12px', marginTop: '4px' }}>Secure, encrypted storage. Organized by client and case.</p>
        <button style={{
          marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '10px 20px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Upload size={16} /> Upload Documents
        </button>
      </div>
    </div>
  );
}

function ClientDirectory({ token }) {
  return (
    <div style={{
      padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <Users size={48} style={{ color: '#475569', marginBottom: '12px' }} />
      <p style={{ color: '#64748b' }}>Client directory with contact info, case history, documents, and billing</p>
    </div>
  );
}

function ServiceCatalog({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>📋 Service Catalog</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '12px' }}>
        {[
          { name: 'Initial Consultation', price: 500, duration: '30 min', icon: '📞' },
          { name: 'ITR Filing (Individual)', price: 1500, duration: '2-3 days', icon: '📄' },
          { name: 'GST Registration', price: 2000, duration: '5-7 days', icon: '🏛️' },
          { name: 'Legal Agreement Review', price: 3000, duration: '3-5 days', icon: '⚖️' },
          { name: 'Company Registration', price: 8000, duration: '15-20 days', icon: '🏢' },
          { name: 'Property Verification', price: 5000, duration: '7-10 days', icon: '🏠' },
        ].map((s, i) => (
          <div key={i} style={{
            padding: '16px', borderRadius: '14px', background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <span style={{ fontSize: '24px' }}>{s.icon}</span>
            <h3 style={{ color: '#e2e8f0', fontSize: '14px', fontWeight: 700, margin: '8px 0 4px' }}>{s.name}</h3>
            <p style={{ color: '#22c55e', fontSize: '18px', fontWeight: 800, margin: '4px 0' }}>₹{s.price}</p>
            <p style={{ color: '#64748b', fontSize: '12px', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Clock size={12} /> {s.duration}
            </p>
          </div>
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
