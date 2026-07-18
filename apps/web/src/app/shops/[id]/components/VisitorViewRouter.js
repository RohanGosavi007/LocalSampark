'use client';
import React from 'react';

// ─── Visitor View Imports ──────────────────────────────────────────
import HospitalVisitorView from './HospitalVisitorView';
import RetailVisitorView from './RetailVisitorView';
import TwoWheelerVisitorView from './TwoWheelerVisitorView';
import FourWheelerVisitorView from './FourWheelerVisitorView';
import DoctorVisitorView from './DoctorVisitorView';
import BeautyVisitorView from './BeautyVisitorView';
import HomeServiceVisitorView from './HomeServiceVisitorView';
import ProfessionalVisitorView from './ProfessionalVisitorView';
import EducationEventsVisitorView from './EducationEventsVisitorView';
import RestaurantVisitorView from './RestaurantVisitorView';
import PharmacyVisitorView from './PharmacyVisitorView';
import TiffinCateringVisitorView from './TiffinCateringVisitorView';
import GarageVisitorView from './GarageVisitorView';
import TurfVisitorView from './TurfVisitorView';

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

  switch (viewType) {
    case 'restaurant':
      return <RestaurantVisitorView shop={shop} products={products} />;
    case 'tiffin':
      return <TiffinCateringVisitorView shop={shop} products={products} onSubscribe={onSubscribe} />;
    case 'beauty':
      return <BeautyVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
    case 'hospital':
      return <HospitalVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
    case 'pharmacy':
      return <PharmacyVisitorView shop={shop} products={products} />;
    case 'garage':
      return <GarageVisitorView shop={shop} services={services} onRequestService={onRequestService} />;
    case 'home_service':
      return <HomeServiceVisitorView shop={shop} services={services} staff={staff} onRequestQuote={onRequestQuote} />;
    case 'professional':
      return <ProfessionalVisitorView shop={shop} services={services} onBookAppointment={onBookAppointment} />;
    case 'education':
      return <EducationEventsVisitorView shop={shop} services={services} onBookAppointment={onBookAppointment} />;
    case 'turf':
      return <TurfVisitorView shop={shop} services={services} staff={staff} onBookAppointment={onBookAppointment} />;
    case 'retail':
    default:
      return <RetailVisitorView shop={shop} products={products} />;
  }
}

/**
 * Get the view type for a category
 */
export function getVisitorViewType(categorySlug) {
  return CATEGORY_VIEW_MAP[categorySlug] || 'retail';
}
