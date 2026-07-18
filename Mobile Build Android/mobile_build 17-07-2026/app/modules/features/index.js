import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';

const { width } = Dimensions.get('window');

export default function FeaturesScreen() {
  const platformFeatures = [
    { title: 'Local Directory', desc: 'Find every shop and service in your neighborhood.', icon: '🏪', color: '#3b82f6' },
    { title: 'Community Hub', desc: 'Connect with neighbors and local leaders.', icon: '💬', color: '#10b981' },
    { title: 'Local Commerce', desc: 'Order groceries, food, and essentials locally.', icon: '🛍️', color: '#f59e0b' },
    { title: 'Home Services', desc: 'Book verified plumbers, electricians, and more.', icon: '🔧', color: '#8b5cf6' },
    { title: 'Emergency SOS', desc: 'One-tap emergency alerts to neighbors & guards.', icon: '🚨', color: '#ef4444' },
    { title: 'Society Management', desc: 'Gate pass, notices, and society bills.', icon: '🏢', color: '#06b6d4' },
    { title: 'Jobs & Gigs', desc: 'Find local employment opportunities.', icon: '💼', color: '#14b8a6' },
    { title: 'Wallet & Rewards', desc: 'Pay locally and earn cashback rewards.', icon: '💳', color: '#6366f1' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Platform Features</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroSection}>
          <Text style={styles.heroEmoji}>🚀</Text>
          <Text style={styles.heroTitle}>Everything Your Neighborhood Needs</Text>
          <Text style={styles.heroSubtitle}>
            LocalSampark brings your entire neighborhood into one single super-app. Discover what you can do!
          </Text>
        </View>

        <View style={styles.grid}>
          {platformFeatures.map((feat, i) => (
            <View key={i} style={[styles.card, { borderTopColor: feat.color, borderTopWidth: 4 }]}>
              <View style={[styles.iconWrapper, { backgroundColor: feat.color + '15' }]}>
                <Text style={{ fontSize: 32 }}>{feat.icon}</Text>
              </View>
              <Text style={styles.cardTitle}>{feat.title}</Text>
              <Text style={styles.cardDesc}>{feat.desc}</Text>
            </View>
          ))}
        </View>

        <View style={styles.ctaBox}>
          <Text style={styles.ctaTitle}>Ready to get started?</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/directory')}>
            <Text style={styles.primaryBtnText}>Explore Local Shops</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  heroSection: { alignItems: 'center', paddingVertical: 32 },
  heroEmoji: { fontSize: 56, marginBottom: 16 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', textAlign: 'center', marginBottom: 12 },
  heroSubtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  card: { width: (width - 44) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2 },
  iconWrapper: { width: 64, height: 64, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 8 },
  cardDesc: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  ctaBox: { backgroundColor: '#1e293b', padding: 32, borderRadius: 24, alignItems: 'center', marginTop: 16 },
  ctaTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 20 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
