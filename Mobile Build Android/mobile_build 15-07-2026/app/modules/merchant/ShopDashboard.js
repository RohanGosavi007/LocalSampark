import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Switch } from 'react-native';
import { router } from 'expo-router';

export default function ShopDashboard() {
  const [isOnline, setIsOnline] = useState(true);
  
  // Dummy live orders
  const [activeOrders, setActiveOrders] = useState([
    { id: 'ORD-8921', status: 'NEW', items: '2x Milk, 1x Bread', total: '₹145', time: 'Just Now' },
    { id: 'ORD-8920', status: 'PREPARING', items: '1x Soap, 1x Shampoo', total: '₹320', time: '5 mins ago' }
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={styles.headerTitle}>Merchant Terminal</Text>
          <Switch 
            value={isOnline} 
            onValueChange={setIsOnline}
            trackColor={{ false: '#94a3b8', true: '#10b981' }}
            style={{ marginLeft: 16 }}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹4,250</Text>
            <Text style={styles.statTitle}>Today's Sales</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statTitle}>Orders Completed</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>🔴 LIVE: Incoming Orders</Text>
        
        {activeOrders.map((order, idx) => (
          <View key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderId}>{order.id}</Text>
              <Text style={styles.orderTime}>{order.time}</Text>
            </View>
            <Text style={styles.orderItems}>{order.items}</Text>
            <Text style={styles.orderTotal}>{order.total}</Text>
            
            <View style={styles.actionRow}>
              {order.status === 'NEW' ? (
                <>
                  <TouchableOpacity style={[styles.actionBtn, styles.acceptBtn]}>
                    <Text style={styles.btnTextWhite}>Accept Order</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]}>
                    <Text style={styles.btnTextRed}>Reject</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity style={[styles.actionBtn, styles.readyBtn]}>
                  <Text style={styles.btnTextWhite}>Mark Ready for Runner</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}

        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Management</Text>
        <View style={styles.manageGrid}>
          <TouchableOpacity style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>Catalog Manager</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>Settlements</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  header: { padding: 16, backgroundColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { marginRight: 16 },
  backText: { color: '#94a3b8', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  content: { padding: 16 },
  
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  statValue: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  statTitle: { fontSize: 12, color: '#64748b', fontWeight: '700', textTransform: 'uppercase' },

  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#334155', marginBottom: 12 },
  
  orderCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 12 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderId: { fontSize: 16, fontWeight: '900', color: '#0f172a' },
  orderTime: { fontSize: 12, color: '#ef4444', fontWeight: '800' },
  orderItems: { fontSize: 14, color: '#475569', marginBottom: 8, fontWeight: '500' },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#10b981', marginBottom: 16 },
  
  actionRow: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  acceptBtn: { backgroundColor: '#3b82f6' },
  rejectBtn: { backgroundColor: '#fee2e2', borderWidth: 1, borderColor: '#fca5a5' },
  readyBtn: { backgroundColor: '#10b981' },
  btnTextWhite: { color: '#fff', fontWeight: '800', fontSize: 14 },
  btnTextRed: { color: '#ef4444', fontWeight: '800', fontSize: 14 },

  manageGrid: { flexDirection: 'row', gap: 12 },
  manageBtn: { flex: 1, backgroundColor: '#fff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#cbd5e1', alignItems: 'center' },
  manageBtnText: { fontSize: 14, fontWeight: '700', color: '#0f172a' }
});
