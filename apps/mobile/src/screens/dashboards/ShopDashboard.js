import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { WifiOff, Store, Box, ListChecks, Calendar, Users, Briefcase, Car } from 'lucide-react-native';

let Haptics = null;
try { Haptics = require('expo-haptics'); } catch (e) { console.warn('[ShopDashboard] expo-haptics not available'); }

let SkeletonLoader = null;
try { SkeletonLoader = require('../../components/ui/SkeletonLoader').default; } catch (e) { console.warn('[ShopDashboard] SkeletonLoader not found'); }

let NetInfo = null;
try { NetInfo = require('@react-native-community/netinfo').default; } catch (e) { console.warn('[ShopDashboard] NetInfo not available'); }

let FoodKDS = ({ themeColor }) => <View style={s.placeholder}><Text style={s.placeholderText}>Food KDS Module</Text></View>;
let RetailPOS = ({ themeColor }) => <View style={s.placeholder}><Text style={s.placeholderText}>Retail POS Module</Text></View>;
let QueueReceptionDesk = ({ themeColor }) => <View style={s.placeholder}><Text style={s.placeholderText}>Queue Desk Module</Text></View>;
let JobCardConsole = ({ themeColor }) => <View style={s.placeholder}><Text style={s.placeholderText}>Job Card Module</Text></View>;
let FleetAssetTracker = ({ themeColor }) => <View style={s.placeholder}><Text style={s.placeholderText}>Fleet Tracker Module</Text></View>;
let LeadCRMCenter = ({ themeColor }) => <View style={s.placeholder}><Text style={s.placeholderText}>Lead CRM Module</Text></View>;

try { FoodKDS = require('./components/FoodKDS').default; } catch (e) {}
try { RetailPOS = require('./components/RetailPOS').default; } catch (e) {}
try { QueueReceptionDesk = require('./components/QueueReceptionDesk').default; } catch (e) {}
try { JobCardConsole = require('./components/JobCardConsole').default; } catch (e) {}
try { FleetAssetTracker = require('./components/FleetAssetTracker').default; } catch (e) {}
try { LeadCRMCenter = require('./components/LeadCRMCenter').default; } catch (e) {}

import CatalogManagerView from './components/CatalogManagerView';

export default function ShopDashboard({ user }) {
  const [loading, setLoading] = useState(true);
  const [shopStats, setShopStats] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [categorySlug, setCategorySlug] = useState(user?.category_slug || 'retail');
  const [shopCategoryType, setShopCategoryType] = useState('PRODUCT'); // PRODUCT, APPOINTMENT, HYBRID
  const [viewMode, setViewMode] = useState('live'); // 'live' | 'catalog'

  // `shop` is what CatalogManagerView needs (shop?.id / shop?.ownerToken) to
  // call the catalog API — it was previously referenced below without ever
  // being defined, crashing the moment a shop owner opened Catalog view.
  const shop = { id: user?.shop_id || user?.id, ownerToken: user?.token };

  const fetchShopData = () => {
    setLoading(true);
    // Mock fetch dashboard setup
    setTimeout(() => {
      setShopStats({ todaySales: '12,450', activeOrders: 8 });
      setLoading(false);
    }, 1000);
  };

  useEffect(() => {
    let unsubscribe;
    if (NetInfo) {
      unsubscribe = NetInfo.addEventListener(state => {
        setIsOffline(!(state.isConnected && state.isInternetReachable));
      });
    }

    fetchShopData();

    return () => unsubscribe?.();
  }, []);

  const getArchetypeConfig = (category) => {
    const map = {
      'restaurants-cafes': { view: 'food', theme: '#f97316', title: 'Food KDS', icon: Store },
      'tiffin-meal-subscription': { view: 'food', theme: '#f97316', title: 'Food KDS', icon: Store },
      'grocery-supermarkets': { view: 'retail', theme: '#10b981', title: 'Retail POS', icon: Box },
      'pharmacy-healthcare': { view: 'retail', theme: '#10b981', title: 'Retail POS', icon: Box },
      'dentists-orthodontists': { view: 'booking', theme: '#0ea5e9', title: 'Reception Desk', icon: Calendar },
      'salon-beauty-spa': { view: 'booking', theme: '#ec4899', title: 'Queue & Appointments', icon: ListChecks },
      'automotive-mechanic': { view: 'jobcard', theme: '#eab308', title: 'Job Cards', icon: Briefcase },
      'home-services-plumbers': { view: 'jobcard', theme: '#eab308', title: 'Job Cards', icon: Briefcase },
      'vehicle-rentals': { view: 'fleet', theme: '#14b8a6', title: 'Fleet Tracker', icon: Car },
      'real-estate-brokers': { view: 'crm', theme: '#6366f1', title: 'Lead CRM', icon: Users },
      'jobs-placements': { view: 'crm', theme: '#6366f1', title: 'Lead CRM', icon: Users },
    };
    return map[category] || { view: 'retail', theme: '#3b82f6', title: 'Shop Manager', icon: Store };
  };

  const config = getArchetypeConfig(categorySlug);
  const IconComponent = config.icon;

  const renderDashboard = () => {
    if (viewMode === 'catalog') {
      return (
        <CatalogManagerView 
          shop={shop} 
          shopCategoryType={shopCategoryType} 
          themeColor={config.theme} 
          onRefresh={fetchShopData}
        />
      );
    }

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
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color={config.theme} />
        <Text style={s.loadingText}>Loading Dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={[s.headerSection, { borderBottomColor: `${config.theme}40` }]}>
        <View style={s.headerRow}>
          <View style={s.headerLeft}>
            <View style={[s.iconBox, { backgroundColor: `${config.theme}20` }]}>
              <IconComponent size={20} color={config.theme} />
            </View>
            <View>
              <Text style={s.headerTitle}>{config.title}</Text>
            </View>
          </View>
          {isOffline && (
            <View style={s.offlineBadge}>
              <WifiOff size={14} color="#ef4444" />
              <Text style={s.offlineText}>OFFLINE</Text>
            </View>
          )}
        </View>
        <Text style={s.headerSubtitle}>
          {user?.name || 'Local'} • {categorySlug.replace(/-/g, ' ')}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: viewMode === 'live' ? config.theme : '#1e293b', alignItems: 'center' }}
          onPress={() => setViewMode('live')}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Live Dashboard</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: viewMode === 'catalog' ? config.theme : '#1e293b', alignItems: 'center' }}
          onPress={() => setViewMode('catalog')}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Manage Catalog</Text>
        </TouchableOpacity>
      </View>

      {renderDashboard()}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loadingContainer: { flex: 1, backgroundColor: '#020617', padding: 16, paddingTop: 48, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#94a3b8', fontSize: 14, fontWeight: '600', marginTop: 16 },
  headerSection: { marginBottom: 24, marginTop: 8, paddingBottom: 16, borderBottomWidth: 2 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  headerSubtitle: { color: '#94a3b8', fontWeight: '600', fontSize: 14, textTransform: 'capitalize', marginTop: 4, marginLeft: 52 },
  offlineBadge: { backgroundColor: 'rgba(239,68,68,0.2)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6 },
  offlineText: { color: '#f87171', fontWeight: '700', fontSize: 12 },
  placeholder: { backgroundColor: '#0f172a', borderRadius: 16, padding: 24, alignItems: 'center', marginTop: 16 },
  placeholderText: { color: '#94a3b8', fontWeight: '600', fontSize: 14 },
});
