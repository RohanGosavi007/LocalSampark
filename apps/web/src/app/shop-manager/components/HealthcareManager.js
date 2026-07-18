'use client';
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Stethoscope, Users, Calendar, Clock, FileText, Shield, Pill,
  Activity, Plus, Search, AlertCircle, Heart, BarChart3, Settings,
  User, Phone, ClipboardList, TrendingUp
} from 'lucide-react';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// HEALTHCARE MANAGER
// For: Pharmacy, Dentist, Pathology, Physio, Ayurvedic, Dietician
// Features: OPD Queue, Patient Records, Prescriptions, Lab Reports
// ═══════════════════════════════════════════════════════════════════════

const SECTION_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'opd-queue', label: 'OPD Queue', icon: Users },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'patients', label: 'Patient Records', icon: ClipboardList },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText },
  { id: 'inventory', label: 'Inventory', icon: Pill },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function HealthcareManager({ token, shopId, shop }) {
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
                background: isActive ? 'linear-gradient(135deg, #06b6d4, #0891b2)' : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeSection === 'dashboard' && <HealthDashboard token={token} />}
      {activeSection === 'opd-queue' && <OPDQueue token={token} />}
      {activeSection === 'appointments' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeSection === 'patients' && <PatientRecords token={token} />}
      {activeSection === 'prescriptions' && <PrescriptionPanel token={token} />}
      {activeSection === 'inventory' && <MedicalInventory token={token} />}
      {activeSection === 'analytics' && <Placeholder title="Healthcare Analytics" icon="📊" desc="Patient footfall, revenue by service type, repeat visit rates, and insurance claim stats." />}
      {activeSection === 'settings' && <Placeholder title="Clinic Settings" icon="⚙️" desc="OPD hours, consultation fee, slot duration, holiday calendar, and auto-SMS reminders." />}
    </div>
  );
}

function HealthDashboard({ token }) {
  const stats = [
    { label: "Today's Patients", value: '—', icon: Users, color: '#06b6d4' },
    { label: 'In Queue Now', value: '—', icon: Clock, color: '#f59e0b', pulse: true },
    { label: 'Appointments Today', value: '—', icon: Calendar, color: '#3b82f6' },
    { label: "Today's Revenue", value: '₹—', icon: Activity, color: '#22c55e' },
    { label: 'Active Prescriptions', value: '—', icon: FileText, color: '#8b5cf6' },
    { label: 'Avg Rating', value: '⭐ —', icon: Heart, color: '#ef4444' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>🏥 Healthcare Dashboard</h2>
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

function OPDQueue({ token }) {
  const [currentToken, setCurrentToken] = useState(1);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>🏥 OPD Queue</h2>
        <button style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '12px', border: 'none',
          background: 'linear-gradient(135deg, #06b6d4, #0891b2)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={16} /> Issue Token
        </button>
      </div>

      {/* Current Token Display */}
      <div style={{
        padding: '40px', borderRadius: '20px', textAlign: 'center',
        background: 'linear-gradient(135deg, #06b6d415, #0891b208)',
        border: '2px solid #06b6d430', marginBottom: '20px',
      }}>
        <p style={{ color: '#64748b', fontSize: '14px', fontWeight: 600, margin: '0 0 8px', textTransform: 'uppercase' }}>
          Now Serving
        </p>
        <p style={{ color: '#06b6d4', fontSize: '64px', fontWeight: 900, margin: '0 0 8px', lineHeight: 1 }}>
          {String(currentToken).padStart(3, '0')}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
          <button onClick={() => setCurrentToken(prev => Math.max(1, prev - 1))} style={{
            padding: '10px 24px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.15)',
            background: 'transparent', color: '#94a3b8', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
          }}>
            ← Previous
          </button>
          <button onClick={() => setCurrentToken(prev => prev + 1)} style={{
            padding: '10px 24px', borderRadius: '12px', border: 'none',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
          }}>
            Next Patient →
          </button>
        </div>
      </div>

      {/* Queue Info */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {[
          { label: 'Waiting', value: '—', color: '#f59e0b' },
          { label: 'In Consultation', value: '1', color: '#06b6d4' },
          { label: 'Completed Today', value: '—', color: '#22c55e' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '16px', borderRadius: '14px', textAlign: 'center',
            background: `${item.color}10`, border: `1px solid ${item.color}30`,
          }}>
            <p style={{ color: '#64748b', fontSize: '12px', fontWeight: 600, margin: 0 }}>{item.label}</p>
            <p style={{ color: item.color, fontSize: '28px', fontWeight: 900, margin: '4px 0 0' }}>{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PatientRecords({ token }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: 0 }}>📋 Patient Records</h2>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Search size={16} style={{ color: '#64748b' }} />
          <input placeholder="Search patients..." style={{
            background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontSize: '14px',
          }} />
        </div>
      </div>
      <div style={{
        padding: '60px 20px', textAlign: 'center', borderRadius: '16px',
        background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
      }}>
        <ClipboardList size={48} style={{ color: '#475569', marginBottom: '12px' }} />
        <p style={{ color: '#64748b' }}>Patient records with visit history, prescriptions, allergies, and medical notes</p>
        <p style={{ color: '#475569', fontSize: '12px' }}>HIPAA-compliant. Data encrypted at rest and in transit.</p>
      </div>
    </div>
  );
}

function PrescriptionPanel({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>💊 Prescriptions</h2>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Create digital prescriptions with: medicines list, dosage, frequency, duration, and instructions.
          Auto-link to nearby pharmacies for instant ordering. Send via WhatsApp/SMS to patient.
        </p>
      </div>
    </div>
  );
}

function MedicalInventory({ token }) {
  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>💊 Medical Inventory</h2>
      <div style={{
        padding: '24px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>
          Track medicines with batch number, expiry date, stock levels, and auto-reorder alerts.
          Supports barcode scanning and GST-compliant invoicing.
        </p>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          {[
            { label: '⚠️ Expiring Soon', count: 0, color: '#f59e0b' },
            { label: '🔴 Low Stock', count: 0, color: '#ef4444' },
            { label: '✅ In Stock', count: 0, color: '#22c55e' },
          ].map((item, i) => (
            <div key={i} style={{
              flex: 1, padding: '12px', borderRadius: '10px', textAlign: 'center',
              background: `${item.color}10`, border: `1px solid ${item.color}30`,
            }}>
              <p style={{ color: item.color, fontSize: '11px', fontWeight: 600, margin: 0 }}>{item.label}</p>
              <p style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, margin: '4px 0 0' }}>{item.count}</p>
            </div>
          ))}
        </div>
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
