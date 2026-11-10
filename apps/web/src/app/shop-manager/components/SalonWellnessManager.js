'use client';
import React from 'react';
import { BarChart3, Calendar, Scissors, Settings, Star, Users } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// SALON, BEAUTY & WELLNESS — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, panel: 'analytics' },
  { id: 'appointments', label: 'Appointments', icon: Calendar, panel: 'bookings' },
  { id: 'services', label: 'Services', icon: Scissors, panel: 'catalogue' },
  { id: 'staff', label: 'Staff', icon: Users, panel: 'staff' },
  { id: 'reviews', label: 'Reviews', icon: Star, panel: 'reviews' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function SalonWellnessManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#ec4899" accentTo="#db2777" />;
}
