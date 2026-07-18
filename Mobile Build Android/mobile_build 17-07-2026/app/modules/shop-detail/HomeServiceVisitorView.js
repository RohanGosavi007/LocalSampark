import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

export default function HomeServiceVisitorView({ shop }) {
  return (
    <VisitorLayout 
      shopName={shop.name || 'QuickFix AC & Appliances'} 
      shopAddress="Serves Pune City"
      shopIcon="🔧"
      cartCount={0}
      onCheckout={() => {}}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Select Service</Text>
        
        <TouchableOpacity style={styles.serviceBox} onPress={() => router.push('/modules/service-booking')}>
          <Text style={{fontSize: 32, marginBottom: 8}}>❄️</Text>
          <Text style={styles.serviceTitle}>AC Repair & Service</Text>
          <Text style={styles.serviceDesc}>Starts from ₹499</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.serviceBox} onPress={() => router.push('/modules/service-booking')}>
          <Text style={{fontSize: 32, marginBottom: 8}}>📺</Text>
          <Text style={styles.serviceTitle}>TV Repair</Text>
          <Text style={styles.serviceDesc}>Inspection: ₹199</Text>
        </TouchableOpacity>

      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  
  serviceBox: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  serviceDesc: { fontSize: 13, color: '#64748b' },
});
