'use client';
import React from 'react';
import { BarChart3, Calendar, Package, Settings, Star, Users } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// EVENTS & CREATIVE SERVICES — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, panel: 'analytics' },
  { id: 'bookings', label: 'Bookings', icon: Calendar, panel: 'bookings' },
  { id: 'packages', label: 'Packages', icon: Package, panel: 'catalogue' },
  { id: 'team', label: 'Team', icon: Users, panel: 'staff' },
  { id: 'reviews', label: 'Reviews', icon: Star, panel: 'reviews' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function EventCreativeManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#a855f7" accentTo="#9333ea" />;
}
