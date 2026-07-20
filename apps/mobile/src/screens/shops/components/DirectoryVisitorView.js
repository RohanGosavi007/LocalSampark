import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function DirectoryVisitorView({ shop }) {
  const handleContact = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{shop?.name || 'Local Real Estate'}</Text>
        <Text style={styles.subtitle}>Directory Listing</Text>
      </View>
      
      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact('call')}>
          <Text style={styles.contactIcon}>📞</Text>
          <Text style={styles.contactText}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact('whatsapp')}>
          <Text style={styles.contactIcon}>💬</Text>
          <Text style={styles.contactText}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtn} onPress={() => handleContact('map')}>
          <Text style={styles.contactIcon}>📍</Text>
          <Text style={styles.contactText}>Map</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.listingsContainer}>
        <Text style={styles.sectionTitle}>Featured Listings</Text>
        {['2 BHK Apartment in City Center', 'Office Space - 1200 sqft', 'Plot for Sale'].map((item, idx) => (
          <View key={idx} style={styles.listingCard}>
            <View style={styles.listingImage} />
            <View style={styles.listingDetails}>
              <Text style={styles.listingTitle} numberOfLines={2}>{item}</Text>
              <Text style={styles.listingPrice}>₹45,00,000</Text>
              <Text style={styles.listingLoc}>Sector 15, Near Mall</Text>
              <TouchableOpacity style={styles.inquireBtn} onPress={() => handleContact('inquire')}>
                <Text style={styles.inquireText}>Inquire Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#ffffff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { fontSize: 14, color: '#64748b', marginTop: 4 },
  contactRow: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#ffffff', marginBottom: 16 },
  contactBtn: { flex: 1, backgroundColor: '#EEF2FF', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  contactIcon: { fontSize: 20, marginBottom: 4 },
  contactText: { fontSize: 12, color: '#4338CA', fontWeight: 'bold' },
  listingsContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  listingCard: { backgroundColor: '#ffffff', borderRadius: 16, marginBottom: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  listingImage: { width: '100%', height: 160, backgroundColor: '#e2e8f0' },
  listingDetails: { padding: 16 },
  listingTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  listingPrice: { fontSize: 16, color: '#6366F1', fontWeight: 'bold', marginBottom: 4 },
  listingLoc: { fontSize: 13, color: '#64748b', marginBottom: 12 },
  inquireBtn: { borderWidth: 1, borderColor: '#6366F1', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  inquireText: { color: '#6366F1', fontWeight: 'bold' }
});
