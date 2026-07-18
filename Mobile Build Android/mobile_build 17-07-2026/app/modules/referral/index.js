import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Share, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

import { API_V1 } from '../../config/api';
export default function ReferralScreen() {
  const [referralCode, setReferralCode] = useState('SAMPARK-WAIT');
  
  useEffect(() => {
    fetchReferralData();
  }, []);

  const fetchReferralData = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const res = await fetch(`${API_V1}/referral/code`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.code) {
        setReferralCode(data.code);
      }
    } catch(e) { console.error(e); }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join LocalSampark with my code: ${referralCode} and we both get ₹50!`,
      });
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Refer & Earn</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.heroSection}>
          <Text style={styles.heroIcon}>🎁</Text>
          <Text style={styles.heroTitle}>Refer & Earn Rewards</Text>
          <Text style={styles.heroSub}>
            Invite your neighbors and local shops to LocalSampark. You both get ₹50 in your wallet when they complete their first transaction!
          </Text>
        </View>

        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>YOUR UNIQUE REFERRAL CODE</Text>
          <View style={styles.codeDisplayBox}>
            <Text style={styles.codeDisplayText}>{referralCode}</Text>
          </View>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>Share Code 📤</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stepsGrid}>
          <View style={styles.stepCard}>
            <Text style={styles.stepIcon}>🔗</Text>
            <Text style={styles.stepTitle}>1. Share Link</Text>
            <Text style={styles.stepSub}>Send your unique referral code to friends and neighbors.</Text>
          </View>
          <View style={styles.stepCard}>
            <Text style={styles.stepIcon}>📱</Text>
            <Text style={styles.stepTitle}>2. They Sign Up</Text>
            <Text style={styles.stepSub}>They create an account and apply your referral code.</Text>
          </View>
          <View style={styles.stepCard}>
            <Text style={styles.stepIcon}>💰</Text>
            <Text style={styles.stepTitle}>3. You Both Earn</Text>
            <Text style={styles.stepSub}>Once they make a purchase, ₹50 is credited to both wallets.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16 },
  
  heroSection: { alignItems: 'center', marginBottom: 32, marginTop: 16 },
  heroIcon: { fontSize: 48, marginBottom: 12 },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  heroSub: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 16 },

  codeCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center', marginBottom: 32 },
  codeLabel: { fontSize: 12, fontWeight: '700', color: '#64748b', letterSpacing: 1, marginBottom: 16 },
  codeDisplayBox: { backgroundColor: '#eff6ff', borderWidth: 2, borderStyle: 'dashed', borderColor: '#3b82f6', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, marginBottom: 16, width: '100%', alignItems: 'center' },
  codeDisplayText: { fontSize: 24, fontWeight: '900', color: '#3b82f6', letterSpacing: 2 },
  shareBtn: { backgroundColor: '#10b981', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8, width: '100%', alignItems: 'center' },
  shareBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  stepsGrid: { gap: 16 },
  stepCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  stepIcon: { fontSize: 32, marginBottom: 8 },
  stepTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 4 },
  stepSub: { fontSize: 13, color: '#64748b', lineHeight: 20 }
});
