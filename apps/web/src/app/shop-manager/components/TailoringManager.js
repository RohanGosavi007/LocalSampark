'use client';
import React from 'react';
import { BarChart3, Calendar, Package, Palette, Settings, Users } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// TAILORING & BOUTIQUE — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, panel: 'analytics' },
  { id: 'orders', label: 'Orders', icon: Package, panel: 'orders' },
  { id: 'fittings', label: 'Trial / Fitting', icon: Calendar, panel: 'bookings' },
  { id: 'catalogue', label: 'Fabrics & Services', icon: Palette, panel: 'catalogue' },
  { id: 'staff', label: 'Staff', icon: Users, panel: 'staff' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function TailoringManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#d946ef" accentTo="#a855f7" />;
}
