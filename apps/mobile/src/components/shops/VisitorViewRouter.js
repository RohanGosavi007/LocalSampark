import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import KiranaView from './KiranaView';
import PharmacyView from './PharmacyView';
import DairyView from './DairyView';
import FreshProduceView from './FreshProduceView';
import MeatView from './MeatView';
import RestaurantView from './RestaurantView';
import BakeryView from './BakeryView';
import TiffinView from './TiffinView';
import ClinicView from './ClinicView';
import PathologyView from './PathologyView';
import GarageView from './GarageView';
import CarWashView from './CarWashView';
import RetailView from './RetailView';
import WellnessView from './WellnessView';
import HomeServiceView from './HomeServiceView';
import UtilitySubscriptionView from './UtilitySubscriptionView';
import ConsultationView from './ConsultationView';
import EventBookingView from './EventBookingView';
import EducationView from './EducationView';
import ServiceCounterView from './ServiceCounterView';

// MeatView and BakeryView have no category to reach them: the catalogue
// combines these trades into 'fresh-produce-meat' and 'dairy-sweets-bakery',
// each of which is served by one view. They are left imported-but-unrouted
// rather than force-fitted, and become reachable the moment the taxonomy
// splits those categories.

export default function VisitorViewRouter({ shop, products, categories, services, serviceSlots = [], onBook }) {
  if (!shop) return null;

  const categorySlug = (shop.category?.slug || '').toLowerCase();

  // ═══════════════════════════════════════════════════════════════════
  // Maps shop_categories.slug → the specialised view for that trade.
  //
  // This held 67 snake_case keys ('kirana_grocery', 'bakery_sweets',
  // 'dairy_milk_booth') from a taxonomy that was retired when the catalogue
  // moved to kebab-case. Not one matched a row in shop_categories, so every
  // shop in the app — clinic, garage, salon, pharmacy — fell through
  // `|| 'retail'` and rendered RetailView. Twenty specialised views existed
  // and none of them were ever reached. The web router had exactly the same
  // defect and was corrected first; this is the mobile half.
  //
  // Keep in step with:
  //   apps/web/src/app/shops/[id]/components/VisitorViewRouter.js
  //   apps/web/src/app/shop-manager/components/ShopManagerRouter.js
  //   backend/src/modules/ecommerce/controllers/shop-management.controller.js
  // ═══════════════════════════════════════════════════════════════════
  const CATEGORY_VIEW_MAP = {
    // ── Grocery & fresh ──────────────────────────────────────────────
    // Each of these reaches a purpose-built view that the old map could not.
    'grocery-supermarkets':       'kirana',
    'fresh-produce-meat':         'fresh_produce',
    'dairy-sweets-bakery':        'dairy',

    // ── Pharmacy ─────────────────────────────────────────────────────
    'pharmacy-healthcare':        'pharmacy',

    // ── Food ─────────────────────────────────────────────────────────
    'restaurants-cafes':          'restaurant',
    'tiffin-meal-subscription':   'tiffin',
    'catering-party':             'tiffin',
    'catering-party-services':    'tiffin',

    // ── Wellness (appointment with a practitioner) ───────────────────
    'salon-beauty-spa':           'wellness',
    'yoga-wellness':              'wellness',
    'gym-fitness':                'wellness',

    // ── Clinical ─────────────────────────────────────────────────────
    'dentists-orthodontists':     'clinic',
    'ayurvedic-homeopathic':      'clinic',
    'dieticians-nutritionists':   'clinic',
    'physiotherapy':              'clinic',
    'physiotherapy-chiropractic': 'clinic',

    // ── Diagnostics (sample collection, report pickup) ───────────────
    'pathology-labs':             'pathology',
    'pathology-labs-diagnostics': 'pathology',

    // ── Repair bays (drop-off, job card) ─────────────────────────────
    'automotive-mechanic':        'garage',
    'mobile-computer-repair':     'garage',
    'ac-appliance-repair':        'garage',
    'ro-water-purifier':          'garage',
    'ro-water-purifier-service':  'garage',
    'car-bike-wash':              'car_wash',

    // ── Visit-my-home services ───────────────────────────────────────
    'home-services-plumbers':     'home_service',
    'electricians-electronics':   'home_service',
    'pest-control':               'home_service',
    'pest-control-services':      'home_service',
    'deep-cleaning':              'home_service',
    'deep-cleaning-services':     'home_service',
    'painting-renovation':        'home_service',
    'security-cctv':              'home_service',
    'locksmith-key-maker':        'home_service',
    'laundry-dry-cleaning':       'home_service',
    'packers-movers':             'home_service',
    'courier-parcel-services':    'home_service',

    // ── Recurring supply (cylinder, tanker) ──────────────────────────
    // Reaches UtilitySubscriptionView, which nothing could previously reach.
    'gas-cylinder-lpg':           'utility_subscription',
    'water-tanker-supply':        'utility_subscription',

    // ── Consultations ────────────────────────────────────────────────
    'cas-tax-consultants':        'consultation',
    'lawyers-advocates':          'consultation',
    'insurance-agents':           'consultation',
    'travel-agents-visa':         'consultation',
    'interior-design-decor':      'consultation',
    'astrologer-pandit':          'consultation',
    'real-estate-brokers':        'consultation',

    // ── Education ────────────────────────────────────────────────────
    'tutors-education':           'education',
    'coaching-test-prep':         'education',
    'driving-schools':            'education',

    // ── Booked by date or slot ───────────────────────────────────────
    'event-planners-decorators':  'event_booking',
    'wedding-party-planner':      'event_booking',
    'photographers-videographers':'event_booking',
    'turf-grounds':               'event_booking',

    // ── Over-the-counter retail ──────────────────────────────────────
    'clothing-fashion':           'retail',
    'jewellery-gold':             'retail',
    'stationery-gifts-books':     'retail',
    'pooja-samagri-religious':    'retail',
    'hardware-sanitary':          'retail',
    'pet-care-supplies':          'retail',
    'florists-nurseries':         'retail',
    'eyewear-opticians':          'retail',
    'printing-xerox-dtp':         'service_counter',
    'tailoring-boutiques':        'service_counter',
  };

  // Falling back to retail is right at runtime — a shop page must render —
  // but doing it silently is how the whole map drifted out of date unnoticed.
  const mapped = CATEGORY_VIEW_MAP[categorySlug];
  if (!mapped && __DEV__ && categorySlug) {
    console.warn(
      `[VisitorViewRouter] No view mapped for category "${categorySlug}" — ` +
      'falling back to retail. Add it to CATEGORY_VIEW_MAP in ' +
      'src/components/shops/VisitorViewRouter.js.'
    );
  }
  const viewType = mapped || 'retail';

  switch (viewType) {
    // These five reach views that existed on disk but had no arm, so no
    // category could ever render them.
    case 'kirana':
      return <KiranaView shop={shop} products={products} categories={categories} />;
    case 'dairy':
      return <DairyView shop={shop} products={products} categories={categories} />;
    case 'fresh_produce':
      return <FreshProduceView shop={shop} products={products} categories={categories} />;
    case 'utility_subscription':
      return <UtilitySubscriptionView shop={shop} products={products} services={services} />;
    case 'service_counter':
      return <ServiceCounterView shop={shop} services={services} products={products} />;
    case 'restaurant':
      return <RestaurantView shop={shop} products={products} categories={categories} />;
    case 'tiffin':
      return <TiffinView shop={shop} products={products} categories={categories} />;
    case 'pharmacy':
      return <PharmacyView shop={shop} products={products} categories={categories} />;
    case 'wellness':
      return <WellnessView shop={shop} services={services} serviceSlots={serviceSlots} onBook={onBook} />;
    case 'clinic':
      return <ClinicView shop={shop} services={services} serviceSlots={serviceSlots} onBook={onBook} />;
    case 'pathology':
      return <PathologyView shop={shop} services={services} serviceSlots={serviceSlots} onBook={onBook} />;
    case 'garage':
      return <GarageView shop={shop} services={services} serviceSlots={serviceSlots} onBook={onBook} />;
    case 'car_wash':
      return <CarWashView shop={shop} services={services} serviceSlots={serviceSlots} onBook={onBook} />;
    case 'home_service':
      return <HomeServiceView shop={shop} services={services} />;
    case 'consultation':
      return <ConsultationView shop={shop} services={services} serviceSlots={serviceSlots} onBook={onBook} />;
    case 'event_booking':
      return <EventBookingView shop={shop} services={services} />;
    case 'education':
      return <EducationView shop={shop} services={services} />;
    case 'retail':
    default:
      return <RetailView shop={shop} products={products} categories={categories} />;
  }
}
