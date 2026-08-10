import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Cake, CalendarDays, Gift, ChevronRight } from 'lucide-react-native';

export default function BakeryView({ shop, products = [] }) {
  return (
    <View style={styles.container}>
      <View style={styles.promoBanner}>
        <Cake size={28} color="#fff" />
        <View style={styles.promoTextContainer}>
          <Text style={styles.promoTitle}>Custom Cakes</Text>
          <Text style={styles.promoSub}>Pre-order for Birthdays & Events</Text>
        </View>
        <TouchableOpacity style={styles.promoButton}>
          <Text style={styles.promoButtonText}>Order</Text>
          <ChevronRight size={16} color="#db2777" />
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionCard}>
          <CalendarDays size={20} color="#db2777" />
          <Text style={styles.actionText}>Schedule Delivery</Text>
        </View>
        <View style={styles.actionCard}>
          <Gift size={20} color="#f59e0b" />
          <Text style={styles.actionText}>Gift Packing</Text>
        </View>
      </View>

      <Text style={styles.menuHeader}>Fresh Bakes & Sweets</Text>

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
              {item.isCustomizable && (
                <Text style={styles.customizableTag}>Customizable Text</Text>
              )}
            </View>
            <TouchableOpacity style={styles.addButton}>
              <Text style={styles.addButtonText}>ADD</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#db2777', padding: 16, borderRadius: 12, marginBottom: 16 },
  promoTextContainer: { flex: 1, marginLeft: 16 },
  promoTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  promoSub: { color: '#fbcfe8', fontSize: 12, marginTop: 2 },
  promoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16 },
  promoButtonText: { color: '#db2777', fontWeight: '700', fontSize: 12, marginRight: 4 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf2f8', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fbcfe8', gap: 8 },
  actionText: { color: '#9d174d', fontSize: 13, fontWeight: '600' },
  menuHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  productCard: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  productInfo: { flex: 1, paddingRight: 16 },
  productName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  productDesc: { fontSize: 12, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#334155', marginBottom: 6 },
  customizableTag: { alignSelf: 'flex-start', backgroundColor: '#fef3c7', color: '#d97706', fontSize: 10, fontWeight: '600', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  addButton: { alignSelf: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#db2777', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 20 },
  addButtonText: { color: '#db2777', fontWeight: '700', fontSize: 14 },
});
