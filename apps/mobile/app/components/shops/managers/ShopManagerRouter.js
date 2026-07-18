import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import GenericManager from './GenericManager';
import AdvancedRestaurantManager from './AdvancedRestaurantManager';
import SalonWellnessManager from './SalonWellnessManager';
import JobCardManager from './JobCardManager';
import HealthcareManager from './HealthcareManager';
import TiffinSubscriptionManager from './TiffinSubscriptionManager';
import HomeVisitServiceManager from './HomeVisitServiceManager';
import EventCreativeManager from './EventCreativeManager';
import ProfessionalConsultationManager from './ProfessionalConsultationManager';
import TailoringManager from './TailoringManager';
import EducationCoachingManager from './EducationCoachingManager';

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
  'restaurants-cafes':        'restaurant',
  'tiffin-meal-subscription': 'tiffin',
  'salon-beauty-spa':         'salon',
  'yoga-wellness':            'salon',
  'gym-fitness':              'salon',
  'pharmacy-healthcare':      'healthcare',
  'dentists-orthodontists':   'healthcare',
  'pathology-labs':           'healthcare',
  'physiotherapy':            'healthcare',
  'ayurvedic-homeopathic':    'healthcare',
  'dieticians-nutritionists': 'healthcare',
  'automotive-mechanic':      'garage',
  'mobile-computer-repair':   'garage',
  'ac-appliance-repair':      'garage',
  'ro-water-purifier':        'garage',
  'laundry-dry-cleaning':     'laundry',
  'home-services-plumbers':   'home_service',
  'electricians-electronics': 'home_service',
  'pest-control':             'home_service',
  'deep-cleaning':            'home_service',
  'painting-renovation':      'home_service',
  'interior-design-decor':    'home_service',
  'security-cctv':            'home_service',
  'locksmith-key-maker':      'home_service',
  'cas-tax-consultants':      'consultation',
  'lawyers-advocates':        'consultation',
  'insurance-agents':         'consultation',
  'real-estate-brokers':      'consultation',
  'tutors-education':         'education',
  'coaching-test-prep':       'education',
  'event-planners-decorators':    'event_creative',
  'photographers-videographers':  'event_creative',
  'catering-party':               'event_creative',
  'wedding-party-planner':        'event_creative',
  'tailoring-boutiques':      'tailoring',
  'courier-parcel-services':  'logistics',
  'packers-movers':           'logistics',
  'printing-xerox-dtp':       'print_counter',
  'driving-schools':          'driving_school',
  'car-bike-wash':            'car_wash',
  'travel-agents-visa':       'travel',
  'water-tanker-supply':      'supply',
  'gas-cylinder-lpg':         'supply',
  'astrologer-pandit':        'consultation',
};

export default function ShopManagerRouter({ shop }) {
  if (!shop) return null;

  const slug = shop.category_details?.slug;
  const archetype = CATEGORY_ARCHETYPE[slug] || 'retail';

  switch (archetype) {
    case 'restaurant':
      return <AdvancedRestaurantManager shop={shop} />;
    case 'tiffin':
      return <TiffinSubscriptionManager shop={shop} />;
    case 'salon':
      return <SalonWellnessManager shop={shop} />;
    case 'healthcare':
      return <HealthcareManager shop={shop} />;
    case 'home_service':
      return <HomeVisitServiceManager shop={shop} />;
    case 'garage':
    case 'laundry':
      return <JobCardManager shop={shop} />;
    case 'event_creative':
      return <EventCreativeManager shop={shop} />;
    case 'consultation':
      return <ProfessionalConsultationManager shop={shop} />;
    case 'tailoring':
      return <TailoringManager shop={shop} />;
    case 'education':
      return <EducationCoachingManager shop={shop} />;
    
    // Everything else maps to Generic Manager with Product/Service Type
    case 'retail':
    case 'supply':
    case 'logistics':
    case 'print_counter':
      return <GenericManager shop={shop} type="product" />;
    
    default:
      return <GenericManager shop={shop} type="appointment" />;
  }
}
