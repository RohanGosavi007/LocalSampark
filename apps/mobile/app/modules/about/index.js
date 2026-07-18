import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>ℹ️ About</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.badgeWrap}>
          <Text style={styles.badgeText}>Our Story</Text>
        </View>

        <Text style={styles.heroTitle}>About LocalSampark</Text>
        <Text style={styles.heroSubtitle}>Empowering local communities and economies through open digital connections.</Text>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Our Mission</Text>
          <Text style={styles.paragraph}>
            LocalSampark (लोकल संपर्क) is designed to bring local housing societies, neighborhood retailers, service providers, and residents together on a single, secure digital platform. Our goal is to reduce dependency on high-commission global aggregates by offering a commission-free direct trading and logistics framework.
          </Text>
        </View>

        <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: '#3b82f6' }]}>
          <Text style={styles.sectionTitle}>Pilot Project: Dhanori, Pune</Text>
          <Text style={styles.paragraph}>
            We are actively running our initial pilot project in the Dhanori neighborhood of Pune, Maharashtra. Over 12,000 residents across various societies use our app daily to communicate, share carpools, discover properties, trade used items, and support local businesses.
          </Text>
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Platform Features</Text>
          <View style={styles.valueRow}>
            <Text style={styles.valueIcon}>🔒</Text>
            <View style={{flex: 1}}>
              <Text style={styles.valueDesc}>OTP verified user accounts to ensure community safety.</Text>
            </View>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueIcon}>🛒</Text>
            <View style={{flex: 1}}>
              <Text style={styles.valueDesc}>Commission-free digital storefronts for verified merchants.</Text>
            </View>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueIcon}>🔧</Text>
            <View style={{flex: 1}}>
              <Text style={styles.valueDesc}>Gig economy engine connecting plumbers, electricians, and tutors directly.</Text>
            </View>
          </View>
          <View style={styles.valueRow}>
            <Text style={styles.valueIcon}>📦</Text>
            <View style={{flex: 1}}>
              <Text style={styles.valueDesc}>Peer-to-peer micro-delivery network with zero platform commissions.</Text>
            </View>
          </View>
          <View style={[styles.valueRow, {borderBottomWidth: 0, paddingBottom: 0, marginBottom: 0}]}>
            <Text style={styles.valueIcon}>🚗</Text>
            <View style={{flex: 1}}>
              <Text style={styles.valueDesc}>Local carpool matches to IT parks like Kharadi and Hinjewadi.</Text>
            </View>
          </View>
        </View>
        
        <View style={styles.footerLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://localsampark.com/terms')}>
            <Text style={styles.linkText}>Terms & Conditions</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => Linking.openURL('https://localsampark.com/privacy')}>
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
        
        <Text style={styles.version}>LocalSampark App v1.0.0 (Build 42)</Text>
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
  
  badgeWrap: { backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
  badgeText: { color: '#0f172a', fontSize: 12, fontWeight: 'bold' },
  
  heroTitle: { color: '#0f172a', fontSize: 28, fontWeight: '900', marginBottom: 8, textAlign: 'center' },
  heroSubtitle: { color: '#64748b', fontSize: 14, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', width: '100%', marginBottom: 20 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  paragraph: { color: '#475569', fontSize: 14, lineHeight: 22, marginBottom: 12 },
  
  valueRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ffffff', paddingBottom: 16, marginBottom: 16 },
  valueIcon: { fontSize: 32, marginRight: 16 },
  valueTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  valueDesc: { color: '#64748b', fontSize: 13, lineHeight: 20 },
  
  footerLinks: { flexDirection: 'row', justifyContent: 'center', gap: 24, marginVertical: 24 },
  linkText: { color: '#3b82f6', fontSize: 14, fontWeight: 'bold' },
  
  version: { color: '#64748b', fontSize: 12, textAlign: 'center' }
});
