import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

// MOCK_SERVICES was a fixed price list — Classic Haircut ₹250, Facial & Cleanup
// ₹499, Bridal Makeup ₹4,500 — presented as this salon's own rates. A customer
// choosing a salon on price was being shown numbers the salon never set. The
// router now passes the real service list from /shops/:id/services.

export default function BeautyVisitorView({ shop, services = [] }) {
  const [selectedService, setSelectedService] = useState(null);

  const items = services.map((s) => ({
    id: String(s.id),
    name: s.name || '',
    duration: Number(s.duration_minutes ?? s.durationMinutes) || null,
    price: Number(s.price) || 0,
  }));

  return (
    <VisitorLayout shop={shop} 
      /* The fallbacks invented a business: "A-One Beauty Parlour" in
          "Sector 4, Viman Nagar". */
      shopName={shop.name || 'Salon'}
      shopAddress={shop.address || ''}
      shopIcon="✂️"
      cartCount={selectedService ? 1 : 0}
      onCheckout={() => router.push('/modules/checkout')}
    >
      <View style={{ padding: 16 }}>
        <Text style={styles.sectionTitle}>Our Services</Text>

        {items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>No services listed yet</Text>
            <Text style={styles.emptyBody}>This salon has not published its service list.</Text>
          </View>
        ) : items.map(service => (
          <TouchableOpacity
            key={service.id}
            style={[styles.serviceCard, selectedService === service.id && styles.serviceCardActive]}
            onPress={() => setSelectedService(service.id)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{service.name}</Text>
              {service.duration ? (
                <Text style={styles.serviceDuration}>⏱️ {service.duration} mins</Text>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.servicePrice}>₹{service.price}</Text>
              <Text style={styles.bookText}>{selectedService === service.id ? 'Selected' : 'Book'}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* A "Select Stylist" strip used to sit here offering "Pooja" and
            "Neha" — two invented staff members, one of them pre-selected, at
            every salon in the app. Staff come from /shops/:id/staff, which this
            view does not fetch, so the section is removed rather than filled
            with names. */}
      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  emptyBox: { backgroundColor: '#f8fafc', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 6 },
  emptyBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18 },
  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  
  serviceCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  serviceCardActive: { borderColor: '#db2777', backgroundColor: '#fdf2f8' },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 4 },
  serviceDuration: { fontSize: 13, color: '#64748b' },
  servicePrice: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  bookText: { fontSize: 12, color: '#db2777', fontWeight: 'bold' },
  
});
