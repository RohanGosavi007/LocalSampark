import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

import POSManager from './components/POSManager';
import AnalyticsManager from './components/AnalyticsManager';
import FleetManager from './components/FleetManager';
import HospitalManager from './components/HospitalManager';
import GarageManager from './components/GarageManager';
import TwoWheelerManager from './components/TwoWheelerManager';
import FourWheelerManager from './components/FourWheelerManager';
import RetailManager from './components/RetailManager';
import DoctorManager from './components/DoctorManager';
import BeautyManager from './components/BeautyManager';
import HomeServiceManager from './components/HomeServiceManager';
import ProfessionalManager from './components/ProfessionalManager';
import EducationEventsManager from './components/EducationEventsManager';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../../components/LanguageToggle';

export default function ShopDashboardScreen() {
  const router = useRouter();
  const { t } = useLanguage();

  useEffect(() => {
    // Setup Push Notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });

    const requestPermissions = async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions denied.');
      }
    };
    
    requestPermissions();

    const subscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Received notification:', notification);
      Alert.alert(
        notification.request.content.title || 'New Order / Booking',
        notification.request.content.body || 'You have a new update.'
      );
    });

    return () => subscription.remove();
  }, []);

  // Mock Shop Data matching Web Structure
  const shop = {
    id: 1,
    name: 'Sample Shop Native',
    category_id: 'cat_040',
    category_details: {
      slug: 'hospitals-opd-clinics',
      business_model: 'appointment'
    },
    tier: 'big_hospital' // Mock tier
  };

  const [activeTab, setActiveTab] = useState('dashboard');

  const catId = parseInt(shop.category_id.replace('cat_', ''), 10);
  const bm = shop.category_details?.business_model;
  
  const isRetail = ['cat_010', 'cat_028', 'cat_001', 'cat_002', 'cat_003', 'cat_004', 'cat_005', 'cat_006', 'cat_007', 'cat_008', 'cat_009', 'cat_015', 'cat_016'].includes(shop.category_id) || bm === 'product';
  const isHospital = shop.category_id === 'cat_040' || shop.category_id === 'cat-hosp';
  const isTwoWheeler = shop.category_id === 'cat-2w';
  const isFourWheeler = shop.category_id === 'cat-4w' || shop.category_id === 'cat_041' || shop.category_id === 'cat_019';
  const isBeauty = ['cat_012', 'cat_017', 'cat_038'].includes(shop.category_id);
  const isHomeService = ['cat_013', 'cat_011', 'cat_024', 'cat_025', 'cat_026', 'cat_027', 'cat_030'].includes(shop.category_id);
  const isProfessional = ['cat_018', 'cat_035', 'cat_036', 'cat_037'].includes(shop.category_id);
  const isEduEvent = ['cat_014', 'cat_031', 'cat_032', 'cat_033', 'cat_034'].includes(shop.category_id);
  const isDoctor = ['cat_022', 'cat_023', 'cat_020', 'cat_021', 'cat_039'].includes(shop.category_id);

  const navItems = [
    { id: 'dashboard', label: t('nav_dashboard'), icon: 'home-outline', show: true },
    { id: 'pos', label: t('nav_pos'), icon: 'calculator-outline', show: true },
    { id: 'retail_manager', label: t('nav_retail'), icon: 'cart-outline', show: isRetail },
    { id: 'hospital_manager', label: t('nav_hospital'), icon: 'medical-outline', show: isHospital },
    { id: 'doctor_manager', label: t('nav_doctor'), icon: 'medkit-outline', show: isDoctor },
    { id: 'tw_manager', label: t('nav_tw'), icon: 'build-outline', show: isTwoWheeler },
    { id: 'fw_manager', label: t('nav_fw'), icon: 'car-sport-outline', show: isFourWheeler },
    { id: 'beauty_manager', label: t('nav_beauty'), icon: 'flower-outline', show: isBeauty },
    { id: 'home_service_manager', label: t('nav_home_service'), icon: 'hammer-outline', show: isHomeService },
    { id: 'professional_manager', label: t('nav_professional'), icon: 'briefcase-outline', show: isProfessional },
    { id: 'edu_events_manager', label: t('nav_edu'), icon: 'school-outline', show: isEduEvent },
    { id: 'fleet', label: t('nav_fleet'), icon: 'car-outline', show: true },
    { id: 'analytics', label: t('nav_analytics'), icon: 'analytics-outline', show: true },
  ].filter(n => n.show);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{shop.name} Dashboard</Text>
        <LanguageToggle />
      </View>

      <View style={styles.mainLayout}>
        {/* Sidebar / Bottom Navigation Equivalent */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
          {navItems.map(item => (
            <TouchableOpacity 
              key={item.id} 
              style={[styles.tabButton, activeTab === item.id && styles.activeTabButton]}
              onPress={() => setActiveTab(item.id)}
            >
              <Ionicons name={item.icon} size={20} color={activeTab === item.id ? '#3b82f6' : '#6b7280'} />
              <Text style={[styles.tabText, activeTab === item.id && styles.activeTabText]}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Dynamic Content Area */}
        <View style={styles.contentArea}>
          {activeTab === 'dashboard' && (
             <View style={styles.genericDashboard}>
               <Text style={styles.genericTitle}>Welcome to Native Dashboard</Text>
               <Text style={{color: '#6b7280', marginTop: 8}}>Select a tab above to view specialized modules.</Text>
             </View>
          )}
          {activeTab === 'pos' && <POSManager shop={shop} />}
          {activeTab === 'analytics' && <AnalyticsManager shop={shop} />}
          {activeTab === 'fleet' && <FleetManager shop={shop} />}
          {activeTab === 'hospital_manager' && <HospitalManager shop={shop} />}
          {activeTab === 'doctor_manager' && <DoctorManager shop={shop} />}
          {activeTab === 'tw_manager' && <TwoWheelerManager shop={shop} />}
          {activeTab === 'fw_manager' && <FourWheelerManager shop={shop} />}
          {activeTab === 'beauty_manager' && <BeautyManager shop={shop} />}
          {activeTab === 'home_service_manager' && <HomeServiceManager shop={shop} />}
          {activeTab === 'professional_manager' && <ProfessionalManager shop={shop} />}
          {activeTab === 'edu_events_manager' && <EducationEventsManager shop={shop} />}
          {activeTab === 'retail_manager' && <RetailManager shop={shop} />}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1 },
  mainLayout: { flex: 1 },
  tabScroll: { maxHeight: 60, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tabScrollContent: { paddingHorizontal: 16, alignItems: 'center' },
  tabButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, borderRadius: 20, backgroundColor: '#f9fafb' },
  activeTabButton: { backgroundColor: '#eff6ff' },
  tabText: { marginLeft: 6, fontSize: 14, fontWeight: '600', color: '#6b7280' },
  activeTabText: { color: '#3b82f6' },
  contentArea: { flex: 1 },
  genericDashboard: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  genericTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' }
});
