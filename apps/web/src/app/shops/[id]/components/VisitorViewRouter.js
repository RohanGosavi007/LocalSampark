'use client';
import React from 'react';

import dynamic from 'next/dynamic';

const loadingFallback = () => <div className="p-8 text-center"><div className="animate-pulse flex flex-col space-y-4"><div className="h-4 bg-slate-800 rounded w-3/4 mx-auto"></div><div className="h-4 bg-slate-800 rounded w-1/2 mx-auto"></div></div></div>;

const HospitalVisitorView = dynamic(() => import('./HospitalVisitorView'), { loading: loadingFallback });
const RetailVisitorView = dynamic(() => import('./RetailVisitorView'), { loading: loadingFallback });
const TwoWheelerVisitorView = dynamic(() => import('./TwoWheelerVisitorView'), { loading: loadingFallback });
const FourWheelerVisitorView = dynamic(() => import('./FourWheelerVisitorView'), { loading: loadingFallback });
const DoctorVisitorView = dynamic(() => import('./DoctorVisitorView'), { loading: loadingFallback });
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
// VISITOR VIEW ROUTER — Maps 55 categories → correct visitor experience
// ═══════════════════════════════════════════════════════════════════════

const CATEGORY_VIEW_MAP = {
  // Retail
  'kirana_grocery':             'retail',
  'pharmacy':                   'pharmacy',
  'bakery_sweets':              'retail',
  'dairy_milk_booth':           'retail',
  'meat_fish_poultry':          'retail',
  'fruit_vegetable':            'retail',
  'electronics':                'retail',
  'clothing_fashion':           'retail',
  'hardware_paint':             'retail',
  'stationery_bookstore':       'retail',
  'florist':                    'retail',
  'jewellery':                  'retail',
  'sports_fitness':             'retail',
  'home_decor':                 'retail',
  'general_retail':             'retail',
  'pet_store':                  'retail',
  'cosmetics_beauty':           'retail',
  'furniture':                  'retail',
  'mattress_bedding':           'retail',
  'kitchenware_utensils':       'retail',
  'electrical_plumbing_supply': 'retail',
  'tyre_battery':               'retail',
  'pan_betel_shop':             'retail',
  'liquor_wine':                'retail',
  'ice_cream_dessert':          'retail',
  'juice_smoothie_bar':         'retail',
  'mobile_recharge_dth':        'retail',
  'gift_novelty':               'retail',
  'toy_store':                  'retail',
  'nursery_garden':             'retail',
  'pooja_religious':            'retail',
  'fuel_station':               'retail',
  'farm_agri_input':            'retail',
  'recycling_scrap':            'lead_directory',

  // Restaurant & Food
  'restaurant':                 'restaurant',
  'tiffin_catering':            'tiffin',
  'tea_coffee_cafe':            'restaurant',

  // Salon / Spa / Beauty
  'salon_spa':                  'beauty',

  // Healthcare & Clinics
  'medical_clinic':             'hospital',
  'dental_clinic':              'hospital',
  'pathology_diagnostic_lab':   'hospital',
  'physiotherapy_rehab':        'hospital',
  'ayurveda_homeopathy':        'hospital',
  'veterinary_clinic':          'hospital',
  'optical':                    'retail',

  // Coaching & Education
  'coaching_tuition':           'education',

  // Garage & Auto
  'garage_auto':                'garage',
  'car_bike_dealer':            'retail',

  // Home Services & Repair
  'computer_mobile_repair':     'garage',
  'ac_appliance_repair':        'garage',
  'water_purifier_ro':          'garage',
  'pest_control':               'home_service',
  'packers_movers':             'home_service',
  'laundry_dryclean':           'home_service',
  'cobbler_shoe_repair':        'home_service',
  'key_locksmith':              'home_service',
  'tailoring_alteration':       'retail',

  // Professionals & Planners
  'photography_studio':         'education',
  'ca_legal_services':          'professional',
  'insurance_financial':        'professional',
  'travel_agent':               'professional',
  'event_wedding_planner':      'education',
  'interior_designer':          'professional',
  
  // Logistics & Printing
  'courier_logistics':          'retail',
  'printing_xerox':             'retail',

  // Fitness
  'gym_yoga_studio':            'beauty', // Reusing beauty for fitness classes
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
}) => {
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
  return CATEGORY_VIEW_MAP[categorySlug] || 'retail';
}
