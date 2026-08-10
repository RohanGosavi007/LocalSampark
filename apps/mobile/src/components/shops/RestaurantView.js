import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { UtensilsCrossed, CalendarClock, Bike, Clock, Info, ChevronRight } from 'lucide-react-native';

export default function RestaurantView({ shop, products = [], services = [] }) {
  const [activeTab, setActiveTab] = useState('delivery'); // 'delivery' or 'dine-in'

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'delivery' && styles.activeTab]}
          onPress={() => setActiveTab('delivery')}
        >
          <Bike size={18} color={activeTab === 'delivery' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'delivery' && styles.activeTabText]}>
            Order Online
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'dine-in' && styles.activeTab]}
          onPress={() => setActiveTab('dine-in')}
        >
          <UtensilsCrossed size={18} color={activeTab === 'dine-in' ? '#fff' : '#64748b'} />
          <Text style={[styles.tabText, activeTab === 'dine-in' && styles.activeTabText]}>
            Book a Table
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'delivery' ? (
        <View style={styles.content}>
          <View style={styles.deliveryInfoRow}>
            <Clock size={16} color="#64748b" />
            <Text style={styles.deliveryInfoText}>Delivery in 30-45 mins</Text>
          </View>
          
          <Text style={styles.menuHeader}>Full Menu</Text>
          
          <FlatList
            data={products}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            renderItem={({ item }) => (
              <View style={styles.productCard}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.name}</Text>
                  <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
                  <Text style={styles.productPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'}</Text>
                </View>
                <TouchableOpacity style={styles.addButton}>
                  <Text style={styles.addButtonText}>ADD</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.bookingCard}>
            <View style={styles.bookingHeader}>
              <CalendarClock size={24} color="#f97316" />
              <Text style={styles.bookingTitle}>Reserve a Table</Text>
            </View>
            <Text style={styles.bookingDesc}>Skip the waiting line by booking your table in advance.</Text>
            
            <TouchableOpacity style={styles.bookButton}>
              <Text style={styles.bookButtonText}>Select Date & Time</Text>
              <ChevronRight size={20} color="#fff" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.restaurantInfo}>
            <Info size={16} color="#64748b" />
            <Text style={styles.restaurantInfoText}>
              Your reservation is instantly confirmed by the restaurant's appointment engine.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  tabContainer: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8, backgroundColor: '#f8fafc' },
  activeTab: { backgroundColor: '#0f172a' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  activeTabText: { color: '#ffffff' },
  content: { padding: 16 },
  deliveryInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, marginBottom: 24 },
  deliveryInfoText: { fontSize: 14, color: '#334155', fontWeight: '500' },
  menuHeader: { fontSize: 20, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  productCard: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productInfo: { flex: 1, paddingRight: 16 },
  productName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#334155' },
  addButton: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#f97316', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 24, marginTop: 4 },
  addButtonText: { color: '#f97316', fontWeight: '700', fontSize: 14 },
  bookingCard: { backgroundColor: '#fff', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3, marginBottom: 24 },
  bookingHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  bookingTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  bookingDesc: { fontSize: 14, color: '#64748b', lineHeight: 22, marginBottom: 24 },
  bookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f97316', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10 },
  bookButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  restaurantInfo: { flexDirection: 'row', gap: 12, paddingHorizontal: 8 },
  restaurantInfoText: { flex: 1, fontSize: 13, color: '#64748b', lineHeight: 20 },
});
