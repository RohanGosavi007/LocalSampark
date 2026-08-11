'use client';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutDashboard, ShoppingBag, Calendar, Package, Users,
  Star, MessageCircle, Bell, Settings, TrendingUp, CreditCard,
  AlertTriangle, BarChart3, ArrowLeft
} from 'lucide-react';
import DynamicIcon, { getCategoryIconInfo, CATEGORY_ICONS } from '../../components/DynamicIcon';

// ─── Management System Imports ─────────────────────────────────────
import OrderManagementPanel from './shared/OrderManagementPanel';
import AppointmentManagementPanel from './shared/AppointmentManagementPanel';
import AdvancedRestaurantManager from './AdvancedRestaurantManager';
import JobCardManager from './JobCardManager';
import TiffinSubscriptionManager from './TiffinSubscriptionManager';
import SalonWellnessManager from './SalonWellnessManager';
import HealthcareManager from './HealthcareManager';
import HomeVisitServiceManager from './HomeVisitServiceManager';
import EventCreativeManager from './EventCreativeManager';
import ProfessionalConsultationManager from './ProfessionalConsultationManager';
import TailoringManager from './TailoringManager';
import EducationCoachingManager from './EducationCoachingManager';

import UnifiedCatalogueManager from './shared/UnifiedCatalogueManager';
import LeadCRMCenter from './shared/LeadCRMCenter';
import ShopLedger from './shared/ShopLedger';
import ShopStaffManager from './shared/ShopStaffManager';
import ShopReviewsManager from './shared/ShopReviewsManager';
import ShopAnalyticsManager from './shared/ShopAnalyticsManager';
import ShopSettingsManager from './shared/ShopSettingsManager';
import ShopChatManager from './shared/ShopChatManager';

import { API_BASE } from '@/lib/api';

// ═══════════════════════════════════════════════════════════════════════
// ARCHETYPE MAP — Maps 55 categories → management system archetype
// Same logic as backend ARCHETYPE_MAP in shop-management.controller.js
// ═══════════════════════════════════════════════════════════════════════
const CATEGORY_ARCHETYPE = {
  // Retail (Order-based)
  'grocery-supermarkets':     'retail',
  'fresh-produce-meat':       'retail',
  'dairy-sweets-bakery':      'retail',
  'stationery-gifts-books':   'retail',
  'pooja-samagri-religious':  'retail',
  'hardware-sanitary':        'retail',
  'clothing-fashion':         'retail',
  'pet-care-supplies':        'retail',
  'jewellery-gold':           'retail',
  'florists-nurseries':       'retail',
  'eyewear-opticians':        'retail',
  
  // Restaurant
  'restaurants-cafes':        'restaurant',
  
  // Tiffin
  'tiffin-meal-subscription': 'tiffin',
  
  // Salon / Beauty
  'salon-beauty-spa':         'salon',
  'yoga-wellness':            'salon',
  'gym-fitness':              'salon',
  
  // Healthcare
  'pharmacy-healthcare':      'healthcare',
  'dentists-orthodontists':   'healthcare',
  'pathology-labs':           'healthcare',
  'physiotherapy':            'healthcare',
  'ayurvedic-homeopathic':    'healthcare',
  'dieticians-nutritionists': 'healthcare',
  
  // Garage / Repair (Job Card)
  'automotive-mechanic':      'garage',
  'mobile-computer-repair':   'garage',
  'ac-appliance-repair':      'garage',
  'ro-water-purifier':        'garage',
  
  // Laundry (Job Card variant)
  'laundry-dry-cleaning':     'laundry',
  
  // Home Services
  'home-services-plumbers':   'home_service',
  'electricians-electronics': 'home_service',
  'pest-control':             'home_service',
  'deep-cleaning':            'home_service',
  'painting-renovation':      'home_service',
  'interior-design-decor':    'home_service',
  'security-cctv':            'home_service',
  'locksmith-key-maker':      'home_service',
  
  // Professional Consultation
  'cas-tax-consultants':      'consultation',
  'lawyers-advocates':        'consultation',
  'insurance-agents':         'consultation',
  'real-estate-brokers':      'consultation',
  'tutors-education':         'education',
  'coaching-test-prep':       'education',
  
  // Events / Creative
  'event-planners-decorators':    'event_creative',
  'photographers-videographers':  'event_creative',
  'catering-party':               'event_creative',
  'wedding-party-planner':        'event_creative',
  
  // Tailoring
  'tailoring-boutiques':      'tailoring',
  
  // Logistics
  'courier-parcel-services':  'logistics',
  'packers-movers':           'logistics',
  
  // Print Counter
  'printing-xerox-dtp':       'print_counter',
  
  // Driving Schools
  'driving-schools':          'driving_school',
  
  // Car/Bike Wash
  'car-bike-wash':            'car_wash',
  
  // Travel
  'travel-agents-visa':       'travel',
  
  // Supply (Gas, Water)
  'water-tanker-supply':      'supply',
  'gas-cylinder-lpg':         'supply',
  
  // Religious
  'astrologer-pandit':        'consultation',
};

// ═══════════════════════════════════════════════════════════════════════
// GENERIC MANAGER — Shared dashboard + archetype-specific panel
// Used for categories that don't have a fully custom manager yet
// ═══════════════════════════════════════════════════════════════════════
function GenericManager({ token, shopId, shop, archetype, categorySlug }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const catInfo = getCategoryIconInfo(categorySlug);
  
  // Determine which panels this archetype uses
  const useOrders = ['retail', 'supply', 'logistics'].includes(archetype);
  const useAppointments = ['healthcare', 'consultation', 'home_service', 'driving_school', 'car_wash', 'travel', 'tailoring', 'print_counter', 'event_creative'].includes(archetype);
  const useJobCards = ['garage', 'laundry'].includes(archetype);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(useOrders ? [{ id: 'orders', label: 'Orders', icon: ShoppingBag }] : []),
    ...(useAppointments ? [{ id: 'appointments', label: 'Appointments', icon: Calendar }] : []),
    ...(useJobCards ? [{ id: 'jobcards', label: 'Job Cards', icon: Package }] : []),
    { id: 'catalogue', label: 'Catalogue', icon: Package },
    { id: 'crm', label: 'CRM', icon: Users },
    { id: 'ledger', label: 'Ledger', icon: CreditCard },
    { id: 'staff', label: 'Staff', icon: Users },
    { id: 'reviews', label: 'Reviews', icon: Star },
    { id: 'chat', label: 'Chat', icon: MessageCircle },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', padding: '6px',
        background: 'rgba(255,255,255,0.04)', borderRadius: '16px',
        border: '1px solid rgba(255,255,255,0.08)',
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '12px', border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '13px', fontWeight: 600,
                background: isActive ? `linear-gradient(135deg, ${catInfo.color}, ${catInfo.color}cc)` : 'transparent',
                color: isActive ? '#fff' : '#94a3b8', transition: 'all 0.2s',
              }}>
              <tab.icon size={16} /> {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'dashboard' && <GenericDashboard token={token} catInfo={catInfo} />}
      {activeTab === 'orders' && <OrderManagementPanel token={token} shopId={shopId} />}
      {activeTab === 'appointments' && <AppointmentManagementPanel token={token} shopId={shopId} />}
      {activeTab === 'jobcards' && <JobCardManager token={token} shopId={shopId} categoryType={archetype} />}
      {activeTab === 'catalogue' && <UnifiedCatalogueManager token={token} shopId={shopId} />}
      {activeTab === 'crm' && <LeadCRMCenter token={token} shopId={shopId} />}
      {activeTab === 'ledger' && <ShopLedger token={token} shopId={shopId} />}
      {activeTab === 'staff' && <ShopStaffManager token={token} shopId={shopId} />}
      {activeTab === 'reviews' && <ShopReviewsManager token={token} shopId={shopId} />}
      {activeTab === 'chat' && <ShopChatManager token={token} shopId={shopId} />}
      {activeTab === 'analytics' && <ShopAnalyticsManager token={token} shopId={shopId} />}
      {activeTab === 'settings' && <ShopSettingsManager token={token} shopId={shopId} />}
    </div>
  );
}

function GenericDashboard({ token, catInfo }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/shops/my-shop/dashboard`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) setStats(data.stats);
      } catch (err) { console.error(err); }
    })();
  }, [token]);

  const statCards = [
    { label: "Today's Orders", value: stats?.ordersToday || 0, icon: ShoppingBag, color: catInfo.color },
    { label: "Pending", value: stats?.ordersPending || 0, icon: Bell, color: '#f59e0b', pulse: true },
    { label: "Today's Revenue", value: `₹${stats?.revenueToday || 0}`, icon: CreditCard, color: '#22c55e' },
    { label: "Total Revenue", value: `₹${stats?.revenueTotal || 0}`, icon: TrendingUp, color: '#6366f1' },
    { label: "Staff", value: stats?.staffCount || 0, icon: Users, color: '#06b6d4' },
    { label: "Avg Rating", value: `⭐ ${stats?.avgRating || '—'}`, icon: Star, color: '#eab308' },
    { label: "Products", value: stats?.productsCount || 0, icon: Package, color: '#a855f7' },
    { label: "Open Issues", value: stats?.disputesOpen || 0, icon: AlertTriangle, color: '#ef4444' },
  ];

  return (
    <div>
      <h2 style={{ color: '#e2e8f0', fontSize: '20px', fontWeight: 800, marginBottom: '16px' }}>
        {catInfo.emoji} Shop Dashboard — Live
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '12px' }}>
        {statCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            style={{
              padding: '18px', borderRadius: '16px', background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${card.color}25`, position: 'relative',
            }}>
            {card.pulse && parseInt(card.value) > 0 && (
              <div style={{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: '50%', background: card.color, animation: 'pulse 1.5s infinite' }} />
            )}
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

function PlaceholderSection({ title, icon, desc }) {
  return (
    <div style={{
      textAlign: 'center', padding: '60px 20px', borderRadius: '16px',
      background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)',
    }}>
      <span style={{ fontSize: '48px' }}>{icon}</span>
      <h3 style={{ color: '#e2e8f0', fontSize: '18px', fontWeight: 700, margin: '12px 0 4px' }}>{title}</h3>
      <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '400px', margin: '0 auto' }}>{desc}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN ROUTER — Resolves category → correct management system
// ═══════════════════════════════════════════════════════════════════════
export default function ShopManagerRouter({ token, shopId, shop, categorySlug }) {
  const archetype = CATEGORY_ARCHETYPE[categorySlug] || 'retail';

  // Fully custom managers (premium experience)
  switch (archetype) {
    case 'restaurant':
      return <AdvancedRestaurantManager token={token} shopId={shopId} shop={shop} />;
    case 'tiffin':
      return <TiffinSubscriptionManager token={token} shopId={shopId} shop={shop} />;
    case 'salon':
      return <SalonWellnessManager token={token} shopId={shopId} shop={shop} />;
    case 'healthcare':
      return <HealthcareManager token={token} shopId={shopId} shop={shop} />;
    case 'home_service':
      return <HomeVisitServiceManager token={token} shopId={shopId} shop={shop} />;
    case 'garage':
    case 'laundry':
      return <GenericManager token={token} shopId={shopId} shop={shop} archetype={archetype} categorySlug={categorySlug} />;
    case 'event_creative':
      return <EventCreativeManager token={token} shopId={shopId} shop={shop} />;
    case 'consultation':
      return <ProfessionalConsultationManager token={token} shopId={shopId} shop={shop} />;
    case 'tailoring':
      return <TailoringManager token={token} shopId={shopId} shop={shop} />;
    case 'education':
      return <EducationCoachingManager token={token} shopId={shopId} shop={shop} />;
    // All others use the GenericManager with archetype-specific panels
    default:
      return <GenericManager token={token} shopId={shopId} shop={shop} archetype={archetype} categorySlug={categorySlug} />;
  }
}
