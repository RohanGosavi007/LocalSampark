import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Scissors, Clock, Star, Calendar } from 'lucide-react-native';

export default function BeautyVisitorView({ shop, services = [], staff = [] }) {
  const [selectedService, setSelectedService] = useState(null);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Services ({services.length})</Text>
      
      {services.map((s, i) => (
        <TouchableOpacity 
          key={s.id || i} 
          style={[styles.serviceCard, selectedService?.id === s.id && styles.serviceCardActive]}
          onPress={() => setSelectedService(s)}
        >
          <View style={styles.serviceInfo}>
            <Text style={styles.serviceName}>{s.name}</Text>
            <Text style={styles.serviceDesc} numberOfLines={2}>{s.description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.metaBadge}>
                <Clock size={12} color="#6b7280" />
                <Text style={styles.metaText}>{s.duration_minutes} mins</Text>
              </View>
            </View>
          </View>
          <Text style={styles.servicePrice}>₹{s.price}</Text>
        </TouchableOpacity>
      ))}

      {selectedService && (
        <View style={styles.bookingSection}>
          <Text style={styles.sectionTitle}>Select Stylist/Professional</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.staffScroll}>
            {staff.map((st, i) => (
              <TouchableOpacity key={st.id || i} style={styles.staffCard}>
                <View style={styles.avatarContainer}>
                  {st.profile_image ? (
                    <Image source={st.profile_image } style={styles.avatar}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
                  ) : (
                    <Text style={styles.avatarEmoji}>👤</Text>
                  )}
                </View>
                <Text style={styles.staffName}>{st.name}</Text>
                <Text style={styles.staffRole}>{st.specialization || st.role}</Text>
                <View style={styles.ratingRow}>
                  <Star size={10} color="#f59e0b" fill="#f59e0b" />
                  <Text style={styles.ratingText}>{st.avg_rating || '4.5'}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity style={styles.bookBtn}>
            <Calendar size={18} color="#fff" />
            <Text style={styles.bookBtnText}>Select Date & Time</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
  serviceCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 12
  },
  serviceCardActive: { borderColor: '#db2777', backgroundColor: '#fdf2f8' },
  serviceInfo: { flex: 1, marginRight: 16 },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#111827', marginBottom: 4 },
  serviceDesc: { fontSize: 12, color: '#6b7280', marginBottom: 8 },
  metaRow: { flexDirection: 'row' },
  metaBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f3f4f6', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  metaText: { fontSize: 10, color: '#6b7280', fontWeight: 'bold' },
  servicePrice: { fontSize: 18, fontWeight: '900', color: '#db2777' },
  
  bookingSection: { marginTop: 16, borderTopWidth: 1, borderTopColor: '#e5e7eb', paddingTop: 16 },
  staffScroll: { marginBottom: 16 },
  staffCard: {
    width: 110, padding: 12, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb',
    alignItems: 'center', marginRight: 12
  },
  avatarContainer: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', marginBottom: 8, overflow: 'hidden' },
  avatar: { width: '100%', height: '100%' },
  avatarEmoji: { fontSize: 24 },
  staffName: { fontSize: 13, fontWeight: 'bold', color: '#111827', textAlign: 'center' },
  staffRole: { fontSize: 10, color: '#6b7280', textAlign: 'center', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  ratingText: { fontSize: 10, color: '#d97706', fontWeight: 'bold' },
  
  bookBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#db2777', paddingVertical: 14, borderRadius: 12,
    shadowColor: '#db2777', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4
  },
  bookBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
