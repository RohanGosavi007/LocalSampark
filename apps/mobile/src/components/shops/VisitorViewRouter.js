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

export default function VisitorViewRouter({ shop, products, categories, services, serviceSlots = [], onBook }) {
  if (!shop) return null;

  const categorySlug = (shop.category?.slug || '').toLowerCase();

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
    'salon_spa':                  'wellness',

    // Healthcare & Clinics
    'medical_clinic':             'clinic',
    'dental_clinic':              'clinic',
    'pathology_diagnostic_lab':   'pathology',
    'physiotherapy_rehab':        'clinic',
    'ayurveda_homeopathy':        'clinic',
    'veterinary_clinic':          'clinic',
    'optical':                    'retail',

    // Coaching & Education
    'coaching_tuition':           'education',

    // Garage & Auto
    'garage_auto':                'garage',
    'car_bike_dealer':            'retail',
    'car_bike_wash':              'car_wash',

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
    'ca_legal_services':          'consultation',
    'insurance_financial':        'consultation',
    'travel_agent':               'consultation',
    'event_wedding_planner':      'event_booking',
    'interior_designer':          'consultation',
    
    // Logistics & Printing
    'courier_logistics':          'retail',
    'printing_xerox':             'retail',

    // Fitness
    'gym_yoga_studio':            'wellness', // Reusing wellness for fitness classes
  };

  const viewType = CATEGORY_VIEW_MAP[categorySlug] || 'retail';

  switch (viewType) {
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
