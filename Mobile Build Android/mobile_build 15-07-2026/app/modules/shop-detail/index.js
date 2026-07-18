import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { getVisitorView } from '../../../src/config/visitor-config';
import { apiGet } from '../../../src/lib/api';

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
  const { id, category } = useLocalSearchParams();
  const [shop, setShop] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShop = async () => {
      try {
        const data = await apiGet(`/shops/${id}`);
        setShop(data);
      } catch (err) {
        console.warn('Failed to load shop, falling back to mock:', err);
        setShop({
          id,
          name: 'Demo Shop',
          category_slug: category || 'retail',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchShop();
  }, [id, category]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc' }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  const viewName = getVisitorView(shop.category_slug);
  const ComponentToRender = VIEW_COMPONENTS[viewName] || RetailVisitorView;

  return <ComponentToRender shop={shop} />;
}
