'use client';
import React from 'react';
import { BarChart3, BookOpen, Calendar, Settings, Star, Users } from 'lucide-react';
import ArchetypeStudio from './shared/ArchetypeStudio';

// ═══════════════════════════════════════════════════════════════════════
// EDUCATION & COACHING — Seller Studio
//
// Every tab is a shared panel backed by the real shop APIs (catalogue,
// appointments, orders, staff, analytics, reviews, settings). The earlier
// screens here showed hard-coded sample rows and placeholder tabs that saved
// nothing; see shared/ArchetypeStudio.js.
// ═══════════════════════════════════════════════════════════════════════

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, panel: 'analytics' },
  { id: 'courses', label: 'Courses / Batches', icon: BookOpen, panel: 'catalogue' },
  { id: 'schedule', label: 'Classes & Demo Bookings', icon: Calendar, panel: 'bookings' },
  { id: 'faculty', label: 'Faculty', icon: Users, panel: 'staff' },
  { id: 'reviews', label: 'Reviews', icon: Star, panel: 'reviews' },
  { id: 'settings', label: 'Settings', icon: Settings, panel: 'settings' },
];

export default function EducationCoachingManager({ token, shopId }) {
  return <ArchetypeStudio token={token} shopId={shopId} tabs={TABS} accent="#6366f1" accentTo="#4f46e5" />;
}
