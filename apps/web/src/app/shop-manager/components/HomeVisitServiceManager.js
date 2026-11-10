'use client';
import React from 'react';
import { BarChart3, Calendar, DollarSign, Settings, Star, Users, Wrench } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// HOME-VISIT SERVICES — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, panel: 'analytics' },
  { id: 'requests', label: 'Service Requests', icon: Calendar, panel: 'bookings' },
  { id: 'jobs', label: 'Jobs & Orders', icon: Wrench, panel: 'orders' },
  { id: 'pricing', label: 'Rate Card', icon: DollarSign, panel: 'catalogue' },
  { id: 'team', label: 'Technicians', icon: Users, panel: 'staff' },
  { id: 'reviews', label: 'Reviews', icon: Star, panel: 'reviews' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function HomeVisitServiceManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#3b82f6" accentTo="#2563eb" />;
}
