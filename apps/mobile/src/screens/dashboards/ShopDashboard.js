import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueueService } from '../../services/OfflineQueueService';

import FoodKDS from './components/FoodKDS';
import RetailPOS from './components/RetailPOS';
import QueueReceptionDesk from './components/QueueReceptionDesk';
import JobCardConsole from './components/JobCardConsole';
import FleetAssetTracker from './components/FleetAssetTracker';
import LeadCRMCenter from './components/LeadCRMCenter';

export default function ShopDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  
  // Category detection for Factory Pattern
  const categorySlug = user?.category_slug || 'retail'; 

  useEffect(() => {
    // Detect Offline State
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });

    // Simulate loading to show Skeleton
    setTimeout(() => {
      setLoading(false);
    }, 1500);

    return () => unsubscribe();
  }, []);

  const getArchetypeConfig = (category) => {
    const map = {
      'restaurants-cafes': { view: 'food', theme: '#FF6B00', title: 'Food KDS' },
      'tiffin-meal-subscription': { view: 'food', theme: '#FF6B00', title: 'Food KDS' },
      'grocery-supermarkets': { view: 'retail', theme: '#00E676', title: 'Retail POS' },
      'pharmacy-healthcare': { view: 'retail', theme: '#00E676', title: 'Retail POS' },
      'dentists-orthodontists': { view: 'booking', theme: '#00E5FF', title: 'Reception Desk' },
      'salon-beauty-spa': { view: 'booking', theme: '#FF007F', title: 'Queue & Appointments' },
      'automotive-mechanic': { view: 'jobcard', theme: '#FFD600', title: 'Job Cards' },
      'home-services-plumbers': { view: 'jobcard', theme: '#FFD600', title: 'Job Cards' },
      'vehicle-rentals': { view: 'fleet', theme: '#10B981', title: 'Fleet Tracker' },
      'real-estate-brokers': { view: 'crm', theme: '#6366F1', title: 'Lead CRM' },
      'jobs-placements': { view: 'crm', theme: '#6366F1', title: 'Lead CRM' },
    };
    return map[category] || { view: 'retail', theme: '#0f172a', title: 'Shop Manager' };
  };

  const config = getArchetypeConfig(categorySlug);

  const renderDashboard = () => {
    switch (config.view) {
      case 'food': return <FoodKDS themeColor={config.theme} />;
      case 'retail': return <RetailPOS themeColor={config.theme} />;
      case 'booking': return <QueueReceptionDesk themeColor={config.theme} />;
      case 'jobcard': return <JobCardConsole themeColor={config.theme} />;
      case 'fleet': return <FleetAssetTracker themeColor={config.theme} />;
      case 'crm': return <LeadCRMCenter themeColor={config.theme} />;
      default: return <RetailPOS themeColor={config.theme} />;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <SkeletonLoader width={200} height={30} style={{ marginBottom: 10 }} />
          <SkeletonLoader width={150} height={20} />
        </View>
        <View style={styles.statsGrid}>
          {[1,2,3,4].map(i => (
             <SkeletonLoader key={i} width={'48%'} height={100} style={{ marginBottom: 15 }} borderRadius={16} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={[styles.header, { borderBottomColor: config.theme, borderBottomWidth: 3 }]}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.greeting}>{config.title}</Text>
          {isOffline && (
            <View style={styles.offlineBadge}>
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>{user?.name || 'Local'} • {categorySlug}</Text>
      </View>

      {/* Render the dynamically selected Phase 2 archetype dashboard */}
      {renderDashboard()}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flexGrow: 1, backgroundColor: '#f8fafc' },
  header: { marginBottom: 10, marginTop: 10, paddingBottom: 16 },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#64748b', textTransform: 'capitalize' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  offlineBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  offlineText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' }
});
