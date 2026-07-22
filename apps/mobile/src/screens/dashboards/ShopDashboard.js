import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import SkeletonLoader from '../../components/ui/SkeletonLoader';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueueService } from '../../services/OfflineQueueService';
import { WifiOff, Store, Box, ListChecks, Calendar, Users, Briefcase, Car } from 'lucide-react-native';

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
      <View className="flex-1 bg-slate-950 p-4 pt-12">
        <View className="mb-6">
          <SkeletonLoader width={200} height={30} style={{ marginBottom: 10 }} borderRadius={8} />
          <SkeletonLoader width={150} height={20} borderRadius={8} />
        </View>
        <View className="flex-row flex-wrap justify-between">
          {[1,2,3,4].map(i => (
             <SkeletonLoader key={i} width={'48%'} height={100} style={{ marginBottom: 15 }} borderRadius={16} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View className="mb-6 mt-2 pb-4 border-b-2" style={{ borderBottomColor: `${config.theme}40` }}>
        <View className="flex-row justify-between items-center mb-1">
          <View className="flex-row items-center">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${config.theme}20` }}>
              <IconComponent size={20} color={config.theme} />
            </View>
            <View>
              <Text className="text-2xl font-black text-white">{config.title}</Text>
            </View>
          </View>
          
          {isOffline && (
            <View className="bg-red-500/20 border border-red-500/50 px-3 py-1.5 rounded-full flex-row items-center">
              <WifiOff size={14} color="#ef4444" className="mr-1.5" />
              <Text className="text-red-400 font-bold text-xs">OFFLINE</Text>
            </View>
          )}
        </View>
        <Text className="text-slate-400 font-semibold text-sm capitalize mt-1 ml-13" style={{ marginLeft: 52 }}>
          {user?.name || 'Local'} • {categorySlug.replace(/-/g, ' ')}
        </Text>
      </View>

      {/* Render the dynamically selected Phase 2 archetype dashboard */}
      {renderDashboard()}

    </ScrollView>
  );
}
