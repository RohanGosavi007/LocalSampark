import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import RestaurantVisitorView from './visitor-views/RestaurantVisitorView';
import PharmacyVisitorView from './visitor-views/PharmacyVisitorView';
import RetailVisitorView from './visitor-views/RetailVisitorView';
import BeautyVisitorView from './visitor-views/BeautyVisitorView';
import TiffinCateringVisitorView from './visitor-views/TiffinCateringVisitorView';
import HospitalVisitorView from './visitor-views/HospitalVisitorView';
import GarageVisitorView from './visitor-views/GarageVisitorView';
import HomeServiceVisitorView from './visitor-views/HomeServiceVisitorView';
import ProfessionalVisitorView from './visitor-views/ProfessionalVisitorView';
import EducationEventsVisitorView from './visitor-views/EducationEventsVisitorView';

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
  
  // Tailoring (Retail view fits best for visitor facing right now)
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
};

export default function VisitorViewRouter({ shop, services, products, staff }) {
  if (!shop) return null;

  const slug = shop.category_details?.slug;
  const viewType = CATEGORY_VIEW_MAP[slug] || 'retail';

  switch (viewType) {
    case 'restaurant':
      return <RestaurantVisitorView shop={shop} products={products} />;
    case 'tiffin':
      return <TiffinCateringVisitorView shop={shop} />;
    case 'beauty':
      return <BeautyVisitorView shop={shop} services={services} staff={staff} />;
    case 'hospital':
      return <HospitalVisitorView shop={shop} />;
    case 'pharmacy':
      return <PharmacyVisitorView shop={shop} products={products} />;
    case 'garage':
      return <GarageVisitorView shop={shop} />;
    case 'home_service':
      return <HomeServiceVisitorView shop={shop} />;
    case 'professional':
      return <ProfessionalVisitorView shop={shop} />;
    case 'education':
      return <EducationEventsVisitorView shop={shop} />;
    case 'retail':
    default:
      return <RetailVisitorView shop={shop} products={products} />;
  }
}

const styles = StyleSheet.create({
  fallbackContainer: {
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center'
  }
});
