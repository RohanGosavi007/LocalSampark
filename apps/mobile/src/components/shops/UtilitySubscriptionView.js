import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView } from 'react-native';
import { Truck, RotateCw, ArrowRight } from 'lucide-react-native';

export default function UtilitySubscriptionView({ shop, products = [] }) {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Truck size={24} color="#fff" />
          <Text style={styles.heroTitle}>Utility & Supply</Text>
        </View>
        <Text style={styles.heroDesc}>Reliable and timely delivery of your essential supplies.</Text>
      </View>

      <Text style={styles.sectionHeader}>Available Supplies</Text>

      {products.length === 0 ? (
        <View style={styles.empty}>
          <Truck size={40} color="#94a3b8" />
          <Text style={styles.emptyText}>No items available currently.</Text>
        </View>
      ) : (
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
              <View style={styles.actionCol}>
                <TouchableOpacity style={styles.subBtn}>
                  <RotateCw size={14} color="#059669" />
                  <Text style={styles.subBtnText}>Subscribe</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.buyBtn}>
                  <Text style={styles.buyBtnText}>Buy Once</Text>
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
  container: { flex: 1, backgroundColor: '#f8fafc' },
  heroCard: { backgroundColor: '#0ea5e9', padding: 24, borderBottomWidth: 1, borderBottomColor: '#0284c7' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  heroDesc: { fontSize: 13, color: '#e0f2fe' },
  sectionHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', margin: 16 },
  empty: { alignItems: 'center', padding: 32 },
  emptyText: { marginTop: 12, color: '#94a3b8', fontSize: 15 },
  productCard: { flexDirection: 'row', backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  productInfo: { flex: 1, paddingRight: 12 },
  productName: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginBottom: 4 },
  productDesc: { fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  productPrice: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  actionCol: { justifyContent: 'center', gap: 8 },
  subBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#d1fae5', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#a7f3d0' },
  subBtnText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  buyBtn: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#f1f5f9', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  buyBtnText: { color: '#334155', fontSize: 12, fontWeight: '600' },
});
