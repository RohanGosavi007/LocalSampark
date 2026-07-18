import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';

export default function PremiumScreen() {
  const handleUpgrade = () => {
    Alert.alert('Processing Upgrade', 'Redirecting to secure payment gateway for SamparkPlus ₹199/mo subscription...');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>✨ Premium</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>✨ SamparkPlus</Text>
        </View>

        <Text style={styles.heroTitle}>Elevate Your Local Experience</Text>
        <Text style={styles.heroSubtitle}>
          Unlock exclusive features, zero convenience fees on utility bills, priority delivery, and premium badges on the community forum.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Basic Member</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹0</Text>
            <Text style={styles.priceFreq}>/mo</Text>
          </View>
          
          <View style={styles.featureList}>
            {['Access all local shops', 'Standard delivery fees', 'Community forum access', 'Basic support'].map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={styles.checkIcon}>✓</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.currentBtn}>
            <Text style={styles.currentBtnText}>Current Plan</Text>
          </View>
        </View>

        <View style={[styles.card, styles.premiumCard, { backgroundColor: '#1e1b4b' }]}>
          <View style={styles.recBadge}>
            <Text style={styles.recBadgeText}>RECOMMENDED</Text>
          </View>
          
          <Text style={[styles.cardTitle, {color: '#c084fc'}]}>SamparkPlus</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceText}>₹199</Text>
            <Text style={styles.priceFreq}>/mo</Text>
          </View>
          
          <View style={styles.featureList}>
            {['Zero convenience fees on bills', 'Free delivery on orders ₹500+', 'Premium verified badge', 'Priority 24/7 support', 'Exclusive flash deals'].map((f, i) => (
              <View key={i} style={styles.featureItem}>
                <Text style={[styles.checkIcon, {color: '#c084fc'}]}>✦</Text>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
          
          <TouchableOpacity onPress={handleUpgrade} style={[styles.upgradeBtn, { backgroundColor: '#4f46e5' }]}>
              <Text style={styles.upgradeBtnText}>Upgrade to Plus</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  content: { padding: 20, paddingBottom: 60, alignItems: 'center' },
  
  badgeWrap: { backgroundColor: '#312e81', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  badgeText: { color: '#c7d2fe', fontSize: 12, fontWeight: 'bold' },
  
  heroTitle: { color: '#0f172a', fontSize: 28, fontWeight: '900', marginBottom: 16, textAlign: 'center' },
  heroSubtitle: { color: '#64748b', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  
  card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', width: '100%', marginBottom: 24 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  priceText: { color: '#0f172a', fontSize: 40, fontWeight: '900' },
  priceFreq: { color: '#64748b', fontSize: 14, marginLeft: 4 },
  
  featureList: { marginBottom: 24 },
  featureItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkIcon: { color: '#4ade80', fontSize: 16, marginRight: 12, width: 20 },
  featureText: { color: '#475569', fontSize: 14 },
  
  currentBtn: { backgroundColor: '#ffffff', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  currentBtnText: { color: '#475569', fontWeight: 'bold', fontSize: 15 },
  
  premiumCard: { borderColor: '#818cf8', borderWidth: 2, position: 'relative', marginTop: 12 },
  recBadge: { position: 'absolute', top: -14, left: '50%', transform: [{translateX: -50}], backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 20 },
  recBadgeText: { color: '#0f172a', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  upgradeBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  upgradeBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});
