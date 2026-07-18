import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import HospitalVisitorView from './components/HospitalVisitorView';
import TwoWheelerVisitorView from './components/TwoWheelerVisitorView';
import FourWheelerVisitorView from './components/FourWheelerVisitorView';
import RetailVisitorView from './components/RetailVisitorView';
import DoctorVisitorView from './components/DoctorVisitorView';
import BeautyVisitorView from './components/BeautyVisitorView';
import HomeServiceVisitorView from './components/HomeServiceVisitorView';
import ProfessionalVisitorView from './components/ProfessionalVisitorView';
import EducationEventsVisitorView from './components/EducationEventsVisitorView';

export default function ShopDetailScreen() {
  const router = useRouter();

  // Mock Shop Data matching Web Structure
  const shop = {
    id: 1,
    name: 'Sample Shop Native',
    address: '123 Native Street, Mobile City',
    category_id: 'cat_040',
    category_details: {
      name: 'Hospitals & OPD',
      slug: 'hospitals-opd-clinics',
      business_model: 'appointment',
      icon: '🏨'
    }
  };

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

  const handleShare = () => {
    Alert.alert('Share', 'Link copied to clipboard!');
  };

  const handleReferral = () => {
    Alert.alert('Refer & Earn', 'Referral link generated! You earn ₹50 if your friend orders.');
  };

  const handleAR = () => {
    Alert.alert('AR Store Navigator', 'Opening native AR camera view...');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Universal Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{shop.name}</Text>
      </View>

      <ScrollView style={styles.scrollContent}>
        {/* Banner Section */}
        <View style={styles.banner}>
          <View style={styles.badge}><Text style={styles.badgeText}>{shop.category_details?.name}</Text></View>
          <Text style={styles.shopName}>{shop.name}</Text>
          <Text style={styles.address}>📍 {shop.address}</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScroll}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>💬 WhatsApp API</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Text style={styles.actionBtnText}>🔗 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#ec4899', borderColor: '#ec4899'}]} onPress={handleReferral}>
              <Text style={[styles.actionBtnText, {color: '#fff'}]}>🎁 Refer & Earn ₹50</Text>
            </TouchableOpacity>
            {(bm === 'product' || bm === 'hybrid') && (
              <TouchableOpacity style={styles.actionBtn} onPress={handleAR}>
                <Text style={styles.actionBtnText}>📱 Navigate Store (AR)</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        {/* Dynamic Category View Injection */}
        <View style={styles.dynamicContent}>
          {isHospital && <HospitalVisitorView shop={shop} />}
          {isDoctor && <DoctorVisitorView shop={shop} />}
          {isTwoWheeler && <TwoWheelerVisitorView shop={shop} />}
          {isFourWheeler && <FourWheelerVisitorView shop={shop} />}
          {isBeauty && <BeautyVisitorView shop={shop} />}
          {isHomeService && <HomeServiceVisitorView shop={shop} />}
          {isProfessional && <ProfessionalVisitorView shop={shop} />}
          {isEduEvent && <EducationEventsVisitorView shop={shop} />}
          {isRetail && <RetailVisitorView shop={shop} />}
          {/* Fallback for other categories if missed */}
          {!isHospital && !isTwoWheeler && !isFourWheeler && !isRetail && !isDoctor && !isBeauty && !isHomeService && !isProfessional && !isEduEvent && (
             <View style={styles.fallbackCard}>
               <Text style={styles.fallbackTitle}>Standard Service Menu</Text>
               <Text style={styles.fallbackDesc}>Select items below to proceed.</Text>
             </View>
          )}
        </View>

        {/* Universal Footer: Similar Shops Nearby */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>🏪 Similar Shops Nearby</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {[1, 2, 3].map(i => (
              <View key={i} style={styles.similarCard}>
                <Text style={{fontSize: 24, marginBottom: 4}}>{shop.category_details?.icon || '🏪'}</Text>
                <Text style={styles.similarName}>Neighbor Shop {i}</Text>
                <Text style={styles.similarMeta}>⭐ 4.8 • 1.2 km</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1 },
  scrollContent: { flex: 1 },
  banner: { backgroundColor: '#fff', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  badge: { backgroundColor: '#eff6ff', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  badgeText: { color: '#1d4ed8', fontSize: 12, fontWeight: 'bold' },
  shopName: { fontSize: 24, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  address: { fontSize: 14, color: '#6b7280', marginBottom: 12 },
  actionScroll: { flexDirection: 'row' },
  actionBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8, alignItems: 'center', justifyContent: 'center' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  dynamicContent: { paddingHorizontal: 16 },
  fallbackCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, marginTop: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  fallbackTitle: { fontSize: 16, fontWeight: 'bold' },
  fallbackDesc: { color: '#6b7280', marginTop: 4 },
  footer: { padding: 16, marginTop: 16, marginBottom: 32 },
  footerTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  similarCard: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginRight: 12, width: 140 },
  similarName: { fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  similarMeta: { fontSize: 12, color: '#6b7280' }
});
