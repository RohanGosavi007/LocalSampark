import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { loadWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';

// Mock Bookings
const MOCK_BOOKINGS = [
  { id: 'B-1001', serviceName: 'AC Deep Cleaning', date: 'Oct 24, 2026', time: '11:00 AM', status: 'Confirmed', price: '₹799', provider: 'CoolBreeze Experts' },
  { id: 'B-1002', serviceName: 'Plumbing Repair', date: 'Oct 25, 2026', time: '02:00 PM', status: 'Pending', price: '₹450', provider: 'Local Plumbers Co' },
  { id: 'B-0990', serviceName: 'Home Salon Service', date: 'Oct 10, 2026', time: '10:00 AM', status: 'Completed', price: '₹1200', provider: 'Elite Styling' },
  { id: 'B-0985', serviceName: 'Washing Machine Repair', date: 'Oct 05, 2026', time: '04:00 PM', status: 'Cancelled', price: '₹550', provider: 'HomeTech Repairs' }
];

export default function ServiceBookingsScreen() {
  const [activeTab, setActiveTab] = useState('Active');
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = async () => {
      await loadWithFallback('/services/bookings', MOCK_BOOKINGS, setBookings, setIsDemo);
      setLoading(false);
    };
    load();
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Confirmed': return '#10b981';
      case 'Pending': return '#f59e0b';
      case 'Completed': return '#3b82f6';
      case 'Cancelled': return '#ef4444';
      case 'In Progress': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'Active') return ['Confirmed', 'Pending', 'In Progress'].includes(b.status);
    if (activeTab === 'Completed') return b.status === 'Completed';
    if (activeTab === 'Cancelled') return b.status === 'Cancelled';
    return true;
  });

  const renderBookingCard = (booking) => (
    <TouchableOpacity 
      key={booking.id} 
      style={styles.card}
      onPress={() => router.push({ pathname: '/modules/service-booking/booking-detail', params: { id: booking.id } })}
    >
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.serviceName}>{booking.serviceName}</Text>
          <Text style={styles.bookingId}>Booking ID: {booking.id}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(booking.status) }]}>{booking.status}</Text>
        </View>
      </View>
      
      <View style={styles.divider} />
      
      <View style={styles.detailsRow}>
        <View style={styles.detailItem}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{booking.date}</Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>{booking.time}</Text>
        </View>
      </View>
      
      <View style={styles.providerRow}>
        <Ionicons name="person-circle-outline" size={20} color="#9ca3af" />
        <Text style={styles.providerText}>{booking.provider}</Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.priceText}>{booking.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
      </View>

      <View style={styles.tabContainer}>
        {['Active', 'Completed', 'Cancelled'].map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : filteredBookings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-clear-outline" size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No {activeTab.toLowerCase()} bookings</Text>
            <Text style={styles.emptyDesc}>You have no service bookings in this status.</Text>
          </View>
        ) : (
          filteredBookings.map(renderBookingCard)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#3b82f6' },

  content: { padding: 16 },
  
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  serviceName: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  bookingId: { fontSize: 12, color: '#94a3b8' },
  
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  
  detailsRow: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  
  providerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  providerText: { fontSize: 13, color: '#475569', marginLeft: 8, fontWeight: '500' },
  priceText: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#475569', marginTop: 16 },
  emptyDesc: { fontSize: 14, color: '#94a3b8', marginTop: 8 }
});
