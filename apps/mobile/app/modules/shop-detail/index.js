import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
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
  const { id, category, type } = useLocalSearchParams();
  const [shop, setShop] = useState(null);
  const [products, setProducts] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchShop = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiGet(`/shops/${id}`);
        const resolved = data?.shop || data;
        if (!resolved || !resolved.id) throw new Error('Shop not found');
        setShop(resolved);

        // This router never fetched a catalog, so each view supplied its own
        // hardcoded one. Products and services are fetched here and passed down
        // instead; a view that gets an empty list says so rather than showing
        // goods the shop does not sell.
        const [prodRes, servRes] = await Promise.allSettled([
          apiGet(`/shops/${id}/products`),
          apiGet(`/shops/${id}/services`),
        ]);

        const unwrap = (res, key) => {
          if (res.status !== 'fulfilled') return [];
          const v = res.value;
          const rows = v?.[key] ?? v?.data ?? v;
          return Array.isArray(rows) ? rows : [];
        };

        setProducts(unwrap(prodRes, 'products'));
        setServices(unwrap(servRes, 'services'));
      } catch (err) {
        // The fallback here built a shop out of URL parameters and called it
        // "Demo Shop" when the name was missing, with the category taken from a
        // query string a caller controls. A customer who opened a link to a
        // specific shop and hit a network error was shown a fabricated one and
        // given no indication anything had failed.
        console.warn('[ShopDetail] Failed to load shop:', err?.message);
        setShop(null);
        setProducts([]);
        setServices([]);
        setError(
          err?.message === 'Shop not found'
            ? 'This shop may have been removed.'
            : 'Could not load this shop. Check your connection and try again.'
        );
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchShop();
    } else {
      setShop(null);
      setError('No shop was specified.');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc' }}>
        <SkeletonLoader type="list" count={4} />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🏪</Text>
        <Text style={styles.errorTitle}>Shop unavailable</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
          <Text style={styles.errorBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // The category recorded on the shop wins; the query parameter is only a hint
  // from the caller and can be stale or wrong.
  const slug = shop.category_slug || shop.category_details?.slug || category || type;
  const viewName = getVisitorView(slug);
  const ComponentToRender = VIEW_COMPONENTS[viewName] || RetailVisitorView;

  return <ComponentToRender shop={shop} products={products} services={services} />;
}

const styles = StyleSheet.create({
  errorContainer: { flex: 1, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  errorMessage: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  errorBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  errorBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 15 },
});
