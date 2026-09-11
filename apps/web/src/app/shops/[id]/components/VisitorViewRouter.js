'use client';
import React from 'react';

import dynamic from 'next/dynamic';

const loadingFallback = () => <div className="p-8 text-center"><div className="animate-pulse flex flex-col space-y-4"><div className="h-4 bg-slate-800 rounded w-3/4 mx-auto"></div><div className="h-4 bg-slate-800 rounded w-1/2 mx-auto"></div></div></div>;

// Orphaned by the taxonomy change, so deliberately NOT imported here. Their
// files remain under ./ and can be wired back the moment a matching category
// exists — importing them while nothing renders them only implies a coverage
// that does not exist:
//
//   DoctorVisitorView       — a video-consultation view. No teleconsultation
//                             category exists; the practitioner categories
//                             (dentist, physio, dietician) are served by
//                             HospitalVisitorView, whose own header names them.
//   TwoWheelerVisitorView   — 36-line "Track My Vehicle Repair" stubs. The one
//   FourWheelerVisitorView    live vehicle category, automotive-mechanic, is
//                             better served by the full GarageVisitorView.
//
// RentalVisitorView is a third case: the switch below still has a 'rental' arm,
// but no category maps to it. The arm is kept so adding a rental category is a
// one-line map entry.
const HospitalVisitorView = dynamic(() => import('./HospitalVisitorView'), { loading: loadingFallback });
const RetailVisitorView = dynamic(() => import('./RetailVisitorView'), { loading: loadingFallback });
const BeautyVisitorView = dynamic(() => import('./BeautyVisitorView'), { loading: loadingFallback });
const HomeServiceVisitorView = dynamic(() => import('./HomeServiceVisitorView'), { loading: loadingFallback });
const ProfessionalVisitorView = dynamic(() => import('./ProfessionalVisitorView'), { loading: loadingFallback });
const EducationEventsVisitorView = dynamic(() => import('./EducationEventsVisitorView'), { loading: loadingFallback });
const RestaurantVisitorView = dynamic(() => import('./RestaurantVisitorView'), { loading: loadingFallback });
const PharmacyVisitorView = dynamic(() => import('./PharmacyVisitorView'), { loading: loadingFallback });
const TiffinCateringVisitorView = dynamic(() => import('./TiffinCateringVisitorView'), { loading: loadingFallback });
const GarageVisitorView = dynamic(() => import('./GarageVisitorView'), { loading: loadingFallback });
const TurfVisitorView = dynamic(() => import('./TurfVisitorView'), { loading: loadingFallback });
const RentalVisitorView = dynamic(() => import('./RentalVisitorView'), { loading: loadingFallback });
const LeadDirectoryVisitorView = dynamic(() => import('./LeadDirectoryVisitorView'), { loading: loadingFallback });

// ═══════════════════════════════════════════════════════════════════════
// VISITOR VIEW ROUTER — Maps every shop_categories.slug → visitor experience
// ═══════════════════════════════════════════════════════════════════════
//
// The keys here MUST be `shop_categories.slug` values, because the shop page
// passes `shop.category_details.slug` straight through with no normalisation.
//
// This map previously held 66 snake_case keys (`kirana_grocery`, `restaurant`,
// `salon_spa`) from a taxonomy that was replaced by the current kebab-case one.
// Not one of them matched a row in shop_categories, so *every* shop — clinic,
// salon, garage, pharmacy — fell through `|| 'retail'` and rendered
// RetailVisitorView. The specialised views existed and were simply never
// reached, and because the fallback is silent there was nothing in the console
// to show it.
//
// ShopManagerRouter.ARCHETYPE_MAP and the backend's ARCHETYPE_MAP in
// shop-management.controller.js were both already on the correct slugs; only
// this file was stale. Keep all three in step when categories change.
const CATEGORY_VIEW_MAP = {
  // ── Retail counters ────────────────────────────────────────────────
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
  'gas-cylinder-lpg':           'retail',
  'printing-xerox-dtp':         'retail',
  'tailoring-boutiques':        'retail',

  // ── Food ───────────────────────────────────────────────────────────
  'restaurants-cafes':          'restaurant',
  'tiffin-meal-subscription':   'tiffin',
  'catering-party':             'tiffin',
  'catering-party-services':    'tiffin',

  // ── Pharmacy (prescription upload flow) ────────────────────────────
  'pharmacy-healthcare':        'pharmacy',

  // ── Clinical (token queue + slot booking) ──────────────────────────
  'dentists-orthodontists':     'hospital',
  'pathology-labs':             'hospital',
  'pathology-labs-diagnostics': 'hospital',
  'physiotherapy':              'hospital',
  'physiotherapy-chiropractic': 'hospital',
  'ayurvedic-homeopathic':      'hospital',
  'dieticians-nutritionists':   'hospital',

  // ── Salon / wellness (specialist + combo booking) ──────────────────
  'salon-beauty-spa':           'beauty',
  'yoga-wellness':              'beauty',
  'gym-fitness':                'beauty', // class/session booking shares this UX

  // ── Repair bays (job cards, drop-off) ──────────────────────────────
  'automotive-mechanic':        'garage',
  'mobile-computer-repair':     'garage',
  'ac-appliance-repair':        'garage',
  'ro-water-purifier':          'garage',
  'ro-water-purifier-service':  'garage',
  'car-bike-wash':              'garage',

  // ── Visit-my-home services (quote request) ─────────────────────────
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
  'water-tanker-supply':        'home_service',

  // ── Consultations (appointment with a professional) ────────────────
  'cas-tax-consultants':        'professional',
  'lawyers-advocates':          'professional',
  'insurance-agents':           'professional',
  'travel-agents-visa':         'professional',
  'interior-design-decor':      'professional',
  'astrologer-pandit':          'professional',

  // ── Education & events (batches, packages, portfolios) ─────────────
  'tutors-education':           'education',
  'coaching-test-prep':         'education',
  'driving-schools':            'education',
  'event-planners-decorators':  'education',
  'wedding-party-planner':      'education',
  'photographers-videographers':'education',

  // ── Slot-by-the-hour grounds ───────────────────────────────────────
  // Restores TurfVisitorView, which the switch below handled but no category
  // reached.
  'turf-grounds':               'turf',

  // ── Enquiry-led listings (no cart, contact the lister) ─────────────
  'real-estate-brokers':        'lead_directory',
};

/**
 * Resolve a category slug to a view type.
 *
 * Falling back to 'retail' is the right runtime behaviour — a shop page must
 * still render — but doing it *silently* is how the entire map came to be
 * mismatched without anyone noticing. Outside production an unmapped slug now
 * says so, naming the file to edit.
 *
 * Warnings are de-duplicated because this runs on every render of every card.
 */
const warnedSlugs = new Set();

function resolveViewType(categorySlug) {
  const viewType = CATEGORY_VIEW_MAP[categorySlug];
  if (viewType) return viewType;

  if (process.env.NODE_ENV !== 'production' && categorySlug && !warnedSlugs.has(categorySlug)) {
    warnedSlugs.add(categorySlug);
    console.warn(
      `[VisitorViewRouter] No view mapped for category "${categorySlug}" — ` +
      'falling back to the generic retail view. Add it to CATEGORY_VIEW_MAP in ' +
      'apps/web/src/app/shops/[id]/components/VisitorViewRouter.js.'
    );
  }
  return 'retail';
}

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
const VisitorViewRouterComponent = ({
  categorySlug,
  shop,
  services = [],
  staff = [],
  products = [],
  onBookAppointment,
  onRequestQuote,
  onSubscribe,
  onRequestService,
  onAddToCart,
}) => {
  const viewType = resolveViewType(categorySlug);

  const renderView = () => {
    switch (viewType) {
      case 'restaurant': return <RestaurantVisitorView shop={shop} products={products} onAddToCart={onAddToCart} />;
      case 'tiffin': return <TiffinCateringVisitorView shop={shop} products={products} onSubscribe={onSubscribe} />;
      case 'beauty': return <BeautyVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
      case 'hospital': return <HospitalVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
      case 'pharmacy': return <PharmacyVisitorView shop={shop} products={products} onAddToCart={onAddToCart} />;
      case 'garage': return <GarageVisitorView shop={shop} services={services} onBookAppointment={onBookAppointment} onRequestService={onRequestService} />;
      case 'home_service': return <HomeServiceVisitorView shop={shop} services={services} staff={staff} onRequestQuote={onRequestQuote} />;
      case 'professional': return <ProfessionalVisitorView shop={shop} services={services} onBookAppointment={onBookAppointment} />;
      // EducationEventsVisitorView takes onEnroll, not onBookAppointment. It was
      // handed onBookAppointment, so `onEnroll?.(selectedPkg)` behind its Enrol
      // button resolved to undefined and the optional chaining swallowed the
      // call — the button did nothing, with no error in the console. Enrolling
      // in a batch or booking an event package is the same action as booking an
      // appointment, so it maps onto the handler the page already supplies.
      case 'education': return <EducationEventsVisitorView shop={shop} services={services} onEnroll={onBookAppointment} />;
      case 'turf': return <TurfVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
      case 'rental': return <RentalVisitorView shop={shop} />;
      case 'lead_directory': return <LeadDirectoryVisitorView shop={shop} />;
      case 'retail':
      default: return <RetailVisitorView shop={shop} products={products} onAddToCart={onAddToCart} />;
    }
  };

  return (
    <React.Suspense fallback={<div className="p-8 text-center text-text-muted animate-pulse">Loading Shop View...</div>}>
      {renderView()}
    </React.Suspense>
  );
};

// 10x Scale: Strict Component Memoization
export default React.memo(VisitorViewRouterComponent, (prevProps, nextProps) => {
  return (
    prevProps.shop?.id === nextProps.shop?.id &&
    prevProps.categorySlug === nextProps.categorySlug &&
    prevProps.services?.length === nextProps.services?.length &&
    prevProps.products?.length === nextProps.products?.length &&
    prevProps.staff?.length === nextProps.staff?.length
  );
});

/**
 * Get the view type for a category
 */
export function getVisitorViewType(categorySlug) {
  return resolveViewType(categorySlug);
}

// Exported so a test can assert every shop_categories.slug is covered.
export { CATEGORY_VIEW_MAP };
