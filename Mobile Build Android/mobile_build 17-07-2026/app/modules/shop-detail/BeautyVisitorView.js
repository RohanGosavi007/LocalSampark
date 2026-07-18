import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

const MOCK_SERVICES = [
  { id: 1, name: 'Classic Haircut', duration: '30 mins', price: '₹250' },
  { id: 2, name: 'Facial & Cleanup', duration: '45 mins', price: '₹499' },
  { id: 3, name: 'Bridal Makeup', duration: '2 hours', price: '₹4,500' },
];

export default function BeautyVisitorView({ shop }) {
  const [selectedService, setSelectedService] = useState(null);
  
  return (
    <VisitorLayout 
      shopName={shop.name || 'A-One Beauty Parlour'} 
      shopAddress="Sector 4, Viman Nagar"
      shopIcon="✂️"
      cartCount={selectedService ? 1 : 0}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Our Services</Text>
        
        {MOCK_SERVICES.map(service => (
          <TouchableOpacity 
            key={service.id} 
            style={[styles.serviceCard, selectedService === service.id && styles.serviceCardActive]}
            onPress={() => setSelectedService(service.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDuration}>⏱️ {service.duration}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.servicePrice}>{service.price}</Text>
              <Text style={styles.bookText}>{selectedService === service.id ? 'Selected' : 'Book'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Select Stylist</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
          <View style={styles.stylistCard}>
            <View style={styles.stylistAvatar}><Text>👩</Text></View>
            <Text style={styles.stylistName}>Any</Text>
          </View>
          <View style={[styles.stylistCard, styles.stylistCardActive]}>
            <View style={styles.stylistAvatar}><Text>👱‍♀️</Text></View>
            <Text style={styles.stylistName}>Pooja</Text>
          </View>
          <View style={styles.stylistCard}>
            <View style={styles.stylistAvatar}><Text>👩‍🦰</Text></View>
            <Text style={styles.stylistName}>Neha</Text>
          </View>
        </ScrollView>
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  
  serviceCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  serviceCardActive: { borderColor: '#db2777', backgroundColor: '#fdf2f8' },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  serviceDuration: { fontSize: 13, color: '#64748b' },
  servicePrice: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  bookText: { fontSize: 12, color: '#db2777', fontWeight: 'bold' },
  
  stylistCard: { alignItems: 'center', marginRight: 16 },
  stylistCardActive: { opacity: 1 },
  stylistAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginBottom: 8, borderWidth: 2, borderColor: 'transparent' },
  stylistName: { fontSize: 13, fontWeight: 'bold', color: '#475569' },
});
