import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function ServiceVisitorView({ shop }) {
  const handleQuote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{shop?.name || 'Quick Repair Garage'}</Text>
        <Text style={styles.subtitle}>Automotive Services</Text>
      </View>
      
      <View style={styles.estimatorBox}>
        <Text style={styles.estimatorTitle}>Need a repair?</Text>
        <Text style={styles.estimatorSub}>Get a quick estimated quote for your service.</Text>
        <TouchableOpacity style={styles.estimatorBtn} onPress={handleQuote}>
          <Text style={styles.estimatorBtnText}>GET ESTIMATE</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.servicesContainer}>
        <Text style={styles.sectionTitle}>Popular Services</Text>
        {['Car Wash', 'Oil Change', 'Wheel Alignment'].map((service, idx) => (
          <View key={idx} style={styles.serviceCard}>
            <View style={styles.serviceDetails}>
              <Text style={styles.serviceName}>{service}</Text>
              <Text style={styles.servicePrice}>From ₹399</Text>
            </View>
            <TouchableOpacity style={styles.addButton} onPress={handleQuote}>
              <Text style={styles.addText}>ADD</Text>
            </TouchableOpacity>
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
  estimatorBox: { margin: 16, backgroundColor: '#FFD60015', borderWidth: 1, borderColor: '#FFD60040', borderRadius: 16, padding: 20 },
  estimatorTitle: { fontSize: 18, fontWeight: 'bold', color: '#B45309', marginBottom: 4 },
  estimatorSub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  estimatorBtn: { backgroundColor: '#FFD600', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  estimatorBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  servicesContainer: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  serviceCard: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 16, borderRadius: 16, marginBottom: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  serviceDetails: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  servicePrice: { fontSize: 14, fontWeight: '600', color: '#F59E0B', marginTop: 4 },
  addButton: { borderWidth: 1, borderColor: '#F59E0B', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addText: { color: '#F59E0B', fontWeight: 'bold' }
});
