import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getVisitorView } from '../../../src/config/visitor-config';
import { apiGet } from '../../../src/lib/api';
import SkeletonLoader from '../../../src/components/SkeletonLoader';

// Import all visitor views
import RetailVisitorView from './RetailVisitorView';
import PharmacyVisitorView from './PharmacyVisitorView';
import RestaurantVisitorView from './RestaurantVisitorView';
import TiffinCateringVisitorView from './TiffinCateringVisitorView';
import BeautyVisitorView from './BeautyVisitorView';
import DoctorVisitorView from './DoctorVisitorView';
import EducationEventsVisitorView from './EducationEventsVisitorView';
import HomeServiceVisitorView from './HomeServiceVisitorView';
import ProfessionalVisitorView from './ProfessionalVisitorView';
import HospitalVisitorView from './HospitalVisitorView';
import FleetVisitorView from './FleetVisitorView';
import GarageVisitorView from './GarageVisitorView';
import TwoWheelerVisitorView from './TwoWheelerVisitorView';
import FourWheelerVisitorView from './FourWheelerVisitorView';

const VIEW_COMPONENTS = {
  RetailVisitorView,
  PharmacyVisitorView,
  RestaurantVisitorView,
  TiffinCateringVisitorView,
  BeautyVisitorView,
  DoctorVisitorView,
  EducationEventsVisitorView,
  HomeServiceVisitorView,
  ProfessionalVisitorView,
  HospitalVisitorView,
  FleetVisitorView,
  GarageVisitorView,
  TwoWheelerVisitorView,
  FourWheelerVisitorView,
};

export default function ShopDetailRouter() {
  const { id, category, type, name } = useLocalSearchParams();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const data = await apiGet(`/shops/${id}`);
        setShop(data);
      } catch (err) {
        console.warn('Failed to load shop, falling back to params data:', err);
        // Use URL params for demo/offline fallback so the right view renders
        setShop({
          id,
          name: name ? decodeURIComponent(name) : 'Demo Shop',
          category_slug: category || type || 'retail',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id, category, type, name]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <SkeletonLoader type="list" count={4} />
      </View>
    );
  }

  const viewName = getVisitorView(shop.category_slug);
  const ComponentToRender = VIEW_COMPONENTS[viewName] || RetailVisitorView;

  return <ComponentToRender shop={shop} />;
}
