import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

export default function AmenitiesTab({ role }) {
  const [amenities] = useState([
    { id: 1, name: 'Clubhouse Hall', capacity: '100 pax', status: 'Available' },
    { id: 2, name: 'Swimming Pool', capacity: '20 pax', status: 'Maintenance' },
    { id: 3, name: 'Gymnasium', capacity: '15 pax', status: 'Available' }
  ]);

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {role === 'admin' && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Manage Amenities</Text>
          <Text style={styles.subtitle}>Add new amenities or change operational status.</Text>
          <TouchableOpacity style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>+ Add Amenity</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Society Amenities</Text>
        {amenities.map(amenity => (
          <View key={amenity.id} style={styles.amenityRow}>
            <View style={{flex: 1}}>
              <Text style={styles.amenityTitle}>{amenity.name}</Text>
              <Text style={styles.amenityMeta}>Capacity: {amenity.capacity}</Text>
            </View>
            <View style={{alignItems: 'flex-end'}}>
              <View style={[styles.badge, amenity.status === 'Available' ? styles.badgeSuccess : styles.badgeWarning]}>
                <Text style={[styles.badgeText, amenity.status === 'Available' ? styles.badgeSuccessText : styles.badgeWarningText]}>
                  {amenity.status}
                </Text>
              </View>
              {amenity.status === 'Available' && (role === 'resident' || role === 'admin') && (
                <TouchableOpacity style={styles.bookBtn}>
                  <Text style={styles.bookBtnText}>Book Slot</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16 },
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#64748b', fontSize: 13, marginBottom: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  
  amenityRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  amenityTitle: { color: '#0f172a', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  amenityMeta: { color: '#64748b', fontSize: 12 },
  
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, marginBottom: 8 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  badgeSuccessText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  badgeWarning: { backgroundColor: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.2)' },
  badgeWarningText: { color: '#f59e0b', fontSize: 10, fontWeight: 'bold' },
  
  bookBtn: { backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  bookBtnText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 12 }
});
