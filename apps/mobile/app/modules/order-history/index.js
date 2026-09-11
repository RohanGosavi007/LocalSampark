import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { loadWithFallback } from '../../../src/utils/mockDataHelper';
import SkeletonLoader from '../../../src/components/SkeletonLoader';

// MOCK_ORDERS listed three purchases the user never made — ₹340 at "Sharma
// Grocery & Daily Needs", ₹100 at "A-One Beauty Parlour", ₹350 to "Pune
// Electricians". This screen did fetch the real order list into `orders`, then
// rendered MOCK_ORDERS anyway, so the fetched data was discarded on every run
// and every customer saw the same three fabricated receipts as their own
// purchase history.
//
// It also called /orders, which is not a route. The customer's order list is
// /orders/my-orders; /orders/:orderId is the per-order route, so '/orders'
// matched nothing and 404'd, which is how the mock came to be showing every
// time.

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      await loadWithFallback('/orders/my-orders', null, setOrders, null, { setError });
      setLoading(false);
    };
    load();
  }, []);

  // /orders/my-orders returns snake_case columns; this screen was written
  // against the mock's field names.
  const rows = orders.map((o) => ({
    id: o.id,
    shop: o.shop_name || 'Shop',
    amount: `₹${Number(o.total_amount) || 0}`,
    date: o.created_at ? new Date(o.created_at).toLocaleString(undefined, {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
    }) : '',
    status: o.status || 'Pending',
    type: o.fulfillment_method === 'pickup' ? 'pickup' : 'delivery',
    items: Number(o.items_count) ? `${o.items_count} item${Number(o.items_count) === 1 ? '' : 's'}` : '',
  }));

  if (loading) {
    return <SafeAreaView style={styles.container}><SkeletonLoader type="list" count={3} /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order History</Text>
        <View style={{width: 60}} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {rows.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>
              {error ? 'Could not load your orders' : 'No orders yet'}
            </Text>
            <Text style={styles.emptyBody}>
              {error || 'Orders you place will appear here.'}
            </Text>
          </View>
        ) : rows.map(order => (
          <TouchableOpacity 
            key={order.id} 
            style={styles.orderCard}
            onPress={() => router.push(`/modules/order-tracking?id=${order.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.shopRow}>
                <View style={styles.shopIcon}>
                  <Text style={{fontSize: 20}}>
                    {order.type === 'appointment' ? '✂️' : order.type === 'service' ? '🔧' : '🛒'}
                  </Text>
                </View>
                <View>
                  <Text style={styles.shopName}>{order.shop}</Text>
                  <Text style={styles.orderDate}>{order.date}</Text>
                </View>
              </View>
              <Text style={styles.orderAmount}>{order.amount}</Text>
            </View>

            <View style={styles.cardMid}>
              <Text style={styles.itemsText}>{order.items}</Text>
            </View>

            <View style={styles.cardFooter}>
              <View style={[styles.statusBadge, order.status === 'Completed' || order.status === 'Delivered' ? styles.statusSuccess : styles.statusPending]}>
                <Text style={[styles.statusText, order.status === 'Completed' || order.status === 'Delivered' ? styles.statusTextSuccess : styles.statusTextPending]}>
                  {order.status}
                </Text>
              </View>
              
              <TouchableOpacity style={styles.reorderBtn}>
                <Text style={styles.reorderBtnText}>
                  {order.type === 'appointment' ? 'Book Again' : 'Reorder'}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  emptyBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#f1f5f9', marginTop: 24 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptyBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backBtnText: { color: '#0f172a', fontWeight: '800', fontSize: 16 },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900' },
  
  content: { padding: 16 },
  
  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, borderWidth: 1, borderColor: '#f1f5f9' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  shopRow: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  shopIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  shopName: { color: '#0f172a', fontSize: 15, fontWeight: '800', marginBottom: 2 },
  orderDate: { color: '#64748b', fontSize: 12, fontWeight: '500' },
  orderAmount: { color: '#0f172a', fontSize: 16, fontWeight: '900' },
  
  cardMid: { paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', marginBottom: 16 },
  itemsText: { color: '#475569', fontSize: 13, lineHeight: 20 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusSuccess: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusText: { fontSize: 12, fontWeight: '800' },
  statusTextSuccess: { color: '#16a34a' },
  statusTextPending: { color: '#d97706' },
  
  reorderBtn: { backgroundColor: '#eff6ff', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#3b82f6' },
  reorderBtnText: { color: '#3b82f6', fontWeight: '800', fontSize: 13 }
});
