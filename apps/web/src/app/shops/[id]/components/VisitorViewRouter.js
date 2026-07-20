'use client';
import React from 'react';

// ─── Lazy-Loaded Visitor View Imports ──────────────────────────────────────────
const HospitalVisitorView = React.lazy(() => import('./HospitalVisitorView'));
const RetailVisitorView = React.lazy(() => import('./RetailVisitorView'));
const TwoWheelerVisitorView = React.lazy(() => import('./TwoWheelerVisitorView'));
const FourWheelerVisitorView = React.lazy(() => import('./FourWheelerVisitorView'));
const DoctorVisitorView = React.lazy(() => import('./DoctorVisitorView'));
const BeautyVisitorView = React.lazy(() => import('./BeautyVisitorView'));
const HomeServiceVisitorView = React.lazy(() => import('./HomeServiceVisitorView'));
const ProfessionalVisitorView = React.lazy(() => import('./ProfessionalVisitorView'));
const EducationEventsVisitorView = React.lazy(() => import('./EducationEventsVisitorView'));
const RestaurantVisitorView = React.lazy(() => import('./RestaurantVisitorView'));
const PharmacyVisitorView = React.lazy(() => import('./PharmacyVisitorView'));
const TiffinCateringVisitorView = React.lazy(() => import('./TiffinCateringVisitorView'));
const GarageVisitorView = React.lazy(() => import('./GarageVisitorView'));
const TurfVisitorView = React.lazy(() => import('./TurfVisitorView'));
const RentalVisitorView = React.lazy(() => import('./RentalVisitorView'));
const LeadDirectoryVisitorView = React.lazy(() => import('./LeadDirectoryVisitorView'));

// ═══════════════════════════════════════════════════════════════════════
// VISITOR VIEW ROUTER — Maps 55 categories → correct visitor experience
// ═══════════════════════════════════════════════════════════════════════

const CATEGORY_VIEW_MAP = {
  // Retail
  'grocery-supermarkets':       'retail',
  'fresh-produce-meat':         'retail',
  'dairy-sweets-bakery':        'retail',
  'stationery-gifts-books':     'retail',
  'pooja-samagri-religious':    'retail',
  'hardware-sanitary':          'retail',
  'clothing-fashion':           'retail',
  'pet-care-supplies':          'retail',
  'jewellery-gold':             'retail',
  'florists-nurseries':         'retail',
  'eyewear-opticians':          'retail',

  // Restaurant
  'restaurants-cafes':          'restaurant',

  // Tiffin / Catering
  'tiffin-meal-subscription':   'tiffin',
  'catering-party':             'tiffin',

  // Salon / Beauty / Wellness
  'salon-beauty-spa':           'beauty',
  'yoga-wellness':              'beauty',
  'gym-fitness':                'beauty',

  // Healthcare
  'pharmacy-healthcare':        'pharmacy',
  'dentists-orthodontists':     'hospital',
  'pathology-labs':             'hospital',
  'physiotherapy':              'hospital',
  'ayurvedic-homeopathic':      'hospital',
  'dieticians-nutritionists':   'hospital',

  // Garage / Repair
  'automotive-mechanic':        'garage',
  'mobile-computer-repair':     'garage',
  'ac-appliance-repair':        'garage',
  'ro-water-purifier':          'garage',
  'laundry-dry-cleaning':       'garage',
  'car-bike-wash':              'garage',

  // Home Services
  'home-services-plumbers':     'home_service',
  'electricians-electronics':   'home_service',
  'pest-control':               'home_service',
  'deep-cleaning':              'home_service',
  'painting-renovation':        'home_service',
  'interior-design-decor':      'home_service',
  'security-cctv':              'home_service',
  'locksmith-key-maker':        'home_service',

  // Professional Consultation
  'cas-tax-consultants':        'professional',
  'lawyers-advocates':          'professional',
  'insurance-agents':           'professional',
  'real-estate-brokers':        'professional',
  'astrologer-pandit':          'professional',

  // Education
  'tutors-education':           'education',
  'coaching-test-prep':         'education',
  'driving-schools':            'education',

  // Events / Creative
  'event-planners-decorators':      'education',
  'photographers-videographers':    'education',
  'wedding-party-planner':          'education',
  'tailoring-boutiques':            'retail',

  // Logistics
  'courier-parcel-services':    'retail',
  'packers-movers':             'home_service',

  // Supply
  'water-tanker-supply':        'retail',
  'gas-cylinder-lpg':           'retail',

  // Travel
  'travel-agents-visa':         'professional',

  // Print
  'printing-xerox-dtp':         'retail',

  // Sports & Recreation
  'turf-grounds':               'turf',
  
  // NEW Archetype 5: Rentals & Heavy Equipment
  'vehicle-rentals':            'rental',
  'construction-equipment':     'rental',
  'agriculture-tractor':        'rental',
  'party-tent-rentals':         'rental',
  'scaffolding-rentals':        'rental',
  'borewell-drilling':          'rental',

  // NEW Archetype 6: Leads & Directory
  'real-estate-brokers':        'lead_directory', // Moved from professional
  'matrimony-marriage':         'lead_directory',
  'jobs-placements':            'lead_directory',
  'scrap-kabadi':               'lead_directory',
  'krishi-mandi':               'lead_directory',
  'community-volunteer':        'lead_directory',
};

/**
 * VisitorViewRouter — Resolves category slug → correct visitor view component
 *
 * @param {string} categorySlug - The shop's category slug
 * @param {object} shop - Full shop data
 * @param {array} services - Shop services
 * @param {array} staff - Shop staff
 * @param {function} onBookAppointment - Callback for booking
 * @param {function} onRequestQuote - Callback for quotes
 */
export default function VisitorViewRouter({
  categorySlug,
  shop,
  services = [],
  staff = [],
  products = [],
  onBookAppointment,
  onRequestQuote,
  onSubscribe,
  onRequestService,
}) {
  const viewType = CATEGORY_VIEW_MAP[categorySlug] || 'retail';

  const renderView = () => {
    switch (viewType) {
      case 'restaurant': return <RestaurantVisitorView shop={shop} products={products} />;
      case 'tiffin': return <TiffinCateringVisitorView shop={shop} products={products} onSubscribe={onSubscribe} />;
      case 'beauty': return <BeautyVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
      case 'hospital': return <HospitalVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
      case 'pharmacy': return <PharmacyVisitorView shop={shop} products={products} />;
      case 'garage': return <GarageVisitorView shop={shop} services={services} onRequestService={onRequestService} />;
      case 'home_service': return <HomeServiceVisitorView shop={shop} services={services} staff={staff} onRequestQuote={onRequestQuote} />;
      case 'professional': return <ProfessionalVisitorView shop={shop} services={services} onBookAppointment={onBookAppointment} />;
      case 'education': return <EducationEventsVisitorView shop={shop} services={services} onBookAppointment={onBookAppointment} />;
      case 'turf': return <TurfVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
      case 'rental': return <RentalVisitorView shop={shop} products={products} />;
      case 'lead_directory': return <LeadDirectoryVisitorView shop={shop} />;
      case 'retail':
      default: return <RetailVisitorView shop={shop} products={products} />;
    }
  };

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-text-muted animate-pulse">Loading Shop View...</div>}>
      {renderView()}
    </React.Suspense>
  );
}

/**
 * Get the view type for a category
 */
export function getVisitorViewType(categorySlug) {
  return CATEGORY_VIEW_MAP[categorySlug] || 'retail';
}
