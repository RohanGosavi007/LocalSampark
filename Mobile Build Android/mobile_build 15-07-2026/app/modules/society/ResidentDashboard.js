import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { router } from 'expo-router';

export default function ResidentDashboard() {
  const categories = [
    { title: 'Gate & Security', icon: '🛡️', items: ['Visitor Approvals', 'Smart Intercom', 'Child Exit Pass', 'Daily Staff'] },
    { title: 'Utility & Bills', icon: '💡', items: ['Maintenance Bill', 'Pay Water Bill', 'Recharge FASTag', 'Book EV Charger'] },
    { title: 'Community', icon: '🤝', items: ['Helpdesk Tickets', 'Book Amenities', 'Notices', 'Society Polls'] },
    { title: 'Marketplace', icon: '🛍️', items: ['Group Buy Deals', 'Society Classifieds', 'Lost & Found', 'Carpool Network'] },
    { title: 'Advanced Tech', icon: '🚀', items: ['FaceID Setup', 'Drone Pad PINs', 'Smart Water Stats', 'Medical SOS / CPR'] }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Society (Resident)</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Quick Actions / SOS */}
        <View style={styles.sosCard}>
          <View style={styles.sosTextContainer}>
            <Text style={styles.sosTitle}>Emergency SOS</Text>
            <Text style={styles.sosSub}>Alert guards and CPR network instantly.</Text>
          </View>
          <TouchableOpacity style={styles.sosBtn}>
            <Text style={styles.sosBtnText}>🚨 PRESS</Text>
          </TouchableOpacity>
        </View>

        {/* Feature Grid */}
        {categories.map((cat, idx) => (
          <View key={idx} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{cat.icon} {cat.title}</Text>
            <View style={styles.grid}>
              {cat.items.map((item, itemIdx) => (
                <TouchableOpacity key={itemIdx} style={styles.gridItem}>
                  <Text style={styles.gridItemText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Karma Tokens */}
        <View style={styles.karmaCard}>
          <Text style={styles.karmaTitle}>My Karma Tokens: 450 🪙</Text>
          <Text style={styles.karmaSub}>You earned 50 tokens for carpooling yesterday!</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16, paddingBottom: 40 },
  
  sosCard: { backgroundColor: '#fee2e2', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, borderWidth: 1, borderColor: '#fca5a5' },
  sosTextContainer: { flex: 1, marginRight: 16 },
  sosTitle: { fontSize: 18, fontWeight: '800', color: '#b91c1c', marginBottom: 4 },
  sosSub: { fontSize: 12, color: '#991b1b', fontWeight: '500' },
  sosBtn: { backgroundColor: '#ef4444', width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', shadowColor: '#dc2626', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  sosBtnText: { color: '#fff', fontWeight: '900', fontSize: 14 },
  
  categorySection: { marginBottom: 24 },
  categoryTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  gridItem: { width: (Dimensions.get('window').width - 44) / 2, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', justifyContent: 'center' },
  gridItemText: { fontSize: 13, fontWeight: '700', color: '#0f172a' },

  karmaCard: { backgroundColor: '#fef3c7', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', marginTop: 12 },
  karmaTitle: { fontSize: 16, fontWeight: '800', color: '#d97706', marginBottom: 4 },
  karmaSub: { fontSize: 12, color: '#b45309', fontWeight: '500' }
});
