import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { CalendarDays, MapPin, CheckCircle } from 'lucide-react-native';

export default function EventBookingView({ shop, services = [], serviceSlots = [], onBook }) {
  const [selectedSlot, setSelectedSlot] = useState(null);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <CalendarDays size={24} color="#fff" />
          <Text style={styles.heroTitle}>Events & Venues</Text>
        </View>
        <Text style={styles.heroDesc}>Book packages and secure dates for your special events.</Text>
      </View>

      <Text style={styles.sectionHeader}>Available Packages & Venues</Text>

      {services.length === 0 ? (
        <View style={styles.empty}>
          <CalendarDays size={40} color="#cbd5e1" />
          <Text style={styles.emptyText}>No packages listed.</Text>
        </View>
      ) : (
        <FlatList
          data={services}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.serviceCard}>
              <View style={styles.serviceHeader}>
                <View style={styles.iconBox}>
                  <MapPin size={20} color="#ec4899" />
                </View>
                <View style={styles.serviceInfo}>
                  <Text style={styles.serviceName}>{item.serviceName}</Text>
                  <Text style={styles.serviceDuration}>{item.durationMinutes >= 1440 ? 'Full Day Booking' : `Duration: ${item.durationMinutes} mins`}</Text>
                </View>
              </View>

              <Text style={{ fontSize: 12, fontWeight: '700', marginBottom: 8, color: '#831843' }}>Available Dates:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                {serviceSlots
                  .filter((slot) => slot.status === 'AVAILABLE')
                  .map((slot) => (
                    <TouchableOpacity 
                      key={slot.id} 
                      style={[styles.slotBtn, selectedSlot?.id === slot.id && styles.selectedSlotBtn]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text style={[styles.slotText, selectedSlot?.id === slot.id && { color: '#fff' }]}>{slot.date} {slot.startTime}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>

              <View style={styles.actionRow}>
                <Text style={styles.servicePrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
                <TouchableOpacity 
                  style={[styles.bookBtn, !selectedSlot && { opacity: 0.5 }]}
                  disabled={!selectedSlot}
                  onPress={() => onBook(selectedSlot.id, {})}
                >
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf2f8' },
  heroCard: { backgroundColor: '#db2777', padding: 24, paddingBottom: 24, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#fbcfe8' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#831843', margin: 16, marginTop: 24 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#f472b6', fontSize: 15 },
  serviceCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 16, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#fbcfe8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  serviceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBox: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#fdf2f8', alignItems: 'center', justifyContent: 'center' },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 16, fontWeight: '700', color: '#831843', marginBottom: 4 },
  serviceDuration: { fontSize: 13, color: '#be185d' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#fce7f3', paddingTop: 16 },
  servicePrice: { fontSize: 18, fontWeight: '800', color: '#831843' },
  bookBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#db2777', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8 },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  slotBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: '#fdf2f8', marginRight: 8, borderWidth: 1, borderColor: '#fbcfe8' },
  selectedSlotBtn: { backgroundColor: '#db2777', borderColor: '#db2777' },
  slotText: { color: '#be185d', fontWeight: '600', fontSize: 13 },
});
