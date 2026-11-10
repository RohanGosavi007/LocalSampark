'use client';
import React from 'react';
import { Package, Settings, Soup, Star, Truck } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// TIFFIN & MEAL SUBSCRIPTIONS — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Soup, panel: 'analytics' },
  { id: 'orders', label: 'Orders & Dispatch', icon: Truck, panel: 'orders' },
  { id: 'plans', label: 'Meal Plans & Menu', icon: Package, panel: 'catalogue' },
  { id: 'reviews', label: 'Reviews', icon: Star, panel: 'reviews' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function TiffinSubscriptionManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#f97316" accentTo="#ea580c" />;
}
