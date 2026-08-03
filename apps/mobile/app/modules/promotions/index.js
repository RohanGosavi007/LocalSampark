import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { loadWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';

const MOCK_PROMOS = [
  { id: 1, title: 'Weekend Sale 20% OFF', code: 'WEEKEND20', status: 'Active' },
  { id: 2, title: 'Buy 1 Get 1 Free', code: 'BOGO', status: 'Expired' }
];

export default function PromotionsScreen() {
  const [promotions, setPromotions] = useState(MOCK_PROMOS);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    loadWithFallback('/shops/promotions', MOCK_PROMOS, setPromotions, setIsDemo);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Promotions & Offers</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.createCard}>
          <Text style={styles.sectionTitle}>Create New Offer</Text>
          <TextInput style={styles.input} placeholder="Offer Title" placeholderTextColor="#64748b" />
          <TextInput style={styles.input} placeholder="Promo Code" placeholderTextColor="#64748b" />
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.btnText}>Publish Offer</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Your Active Offers</Text>
        {promotions.map(promo => (
          <View key={promo.id} style={styles.promoCard}>
            <View>
              <Text style={styles.promoTitle}>{promo.title}</Text>
              <Text style={styles.promoCode}>Code: {promo.code}</Text>
            </View>
            <View style={[styles.badge, promo.status === 'Active' ? styles.badgeActive : styles.badgeExpired]}>
              <Text style={styles.badgeText}>{promo.status}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, 
  backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  
  createCard: { backgroundColor: '#ffffff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#ffffff' },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, color: '#0f172a', marginBottom: 12 },
  primaryBtn: { backgroundColor: '#f59e0b', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  btnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 },

  promoCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  promoTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  promoCode: { color: '#64748b', fontSize: 13 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeActive: { backgroundColor: 'rgba(16, 185, 129, 0.2)' },
  badgeExpired: { backgroundColor: 'rgba(239, 68, 68, 0.2)' },
  badgeText: { color: '#0f172a', fontSize: 12, fontWeight: 'bold' }
});
