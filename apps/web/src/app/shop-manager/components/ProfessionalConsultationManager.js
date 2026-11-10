'use client';
import React from 'react';
import { BarChart3, Calendar, FileText, Settings, Star, Users } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// PROFESSIONAL CONSULTATION — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, panel: 'analytics' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, panel: 'bookings' },
  { id: 'services', label: 'Service Catalog', icon: FileText, panel: 'catalogue' },
  { id: 'team', label: 'Team', icon: Users, panel: 'staff' },
  { id: 'reviews', label: 'Reviews', icon: Star, panel: 'reviews' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function ProfessionalConsultationManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#64748b" accentTo="#475569" />;
}
