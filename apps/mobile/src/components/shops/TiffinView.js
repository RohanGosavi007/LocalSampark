import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { Utensils, CalendarCheck, Clock, ArrowRight } from 'lucide-react-native';

export default function TiffinView({ shop, products = [] }) {
  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Utensils size={24} color="#f59e0b" />
          <Text style={styles.heroTitle}>Home Style Meals</Text>
        </View>
        <Text style={styles.heroDesc}>Subscribe for weekly or monthly fresh tiffin delivery to your doorstep.</Text>
      </View>

      <View style={styles.actionRow}>
        <View style={styles.actionCard}>
          <CalendarCheck size={20} color="#3b82f6" />
          <Text style={styles.actionTitle}>Monthly Plans</Text>
          <Text style={styles.actionSub}>Save up to 15%</Text>
        </View>
        <View style={styles.actionCard}>
          <Clock size={20} color="#10b981" />
          <Text style={styles.actionTitle}>Pause Anytime</Text>
          <Text style={styles.actionSub}>Flexible delivery</Text>
        </View>
      </View>

      <Text style={styles.menuHeader}>Available Meal Plans</Text>

      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        renderItem={({ item }) => (
          <View style={styles.productCard}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{item.name}</Text>
              <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.productPrice}>₹{item.pricePaise ? (item.pricePaise / 100).toFixed(2) : '0.00'} / meal</Text>
            </View>
            <TouchableOpacity style={styles.subscribeBtn}>
              <Text style={styles.subscribeBtnText}>SUBSCRIBE</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  heroCard: { backgroundColor: '#fffbeb', padding: 20, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#fde68a' },
  heroHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  heroTitle: { fontSize: 18, fontWeight: '700', color: '#92400e' },
  heroDesc: { fontSize: 13, color: '#b45309', lineHeight: 20 },
  actionRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  actionCard: { flex: 1, backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  actionTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b', marginTop: 8, marginBottom: 4 },
  actionSub: { fontSize: 11, color: '#64748b' },
  menuHeader: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  productCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  productInfo: { marginBottom: 16 },
  productName: { fontSize: 16, fontWeight: '600', color: '#0f172a', marginBottom: 4 },
  productDesc: { fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 18 },
  productPrice: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  subscribeBtn: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  subscribeBtnText: { color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 0.5 },
});
