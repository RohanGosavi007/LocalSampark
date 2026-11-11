import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, Package, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { listMyOrders, orderRef, statusLabel } from '../../src/services/orders';

const BADGE = {
  done: { bg: '#ecfdf5', fg: '#065f46' },
  stopped: { bg: '#fef2f2', fg: '#b91c1c' },
  active: { bg: '#fef3c7', fg: '#b45309' },
};
const tone = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'delivered') return 'done';
  if (s === 'cancelled' || s === 'rejected') return 'stopped';
  return 'active';
};

export default function OrdersScreen() {
  const router = useRouter();

  // Using React Query (Phase C)
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['myOrders'],
    queryFn: () => listMyOrders(),
    // Re-read on every visit: a cancellation or a status change made on the
    // order screen must show here, not after a five-minute cache.
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'delivered': return <CheckCircle size={20} color="#10B981" />;
      case 'cancelled': return <XCircle size={20} color="#EF4444" />;
      default: return <Clock size={20} color="#F59E0B" />;
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.orderCard}
      // The order screen is /orders/track/:id; /orders/:id matched no route,
      // so tapping an order opened the "unmatched route" screen.
      onPress={() => router.push(`/orders/track/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.shopName}>{item.shop_name || 'Local Shop'}</Text>
        <Text style={styles.orderDate}>
          #{orderRef(item.id)}{item.created_at ? ` • ${new Date(item.created_at).toLocaleDateString()}` : ''}
        </Text>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Package size={16} color="#64748b" />
          <Text style={styles.itemsText}>
            {Number(item.items_count) || 0} {Number(item.items_count) === 1 ? 'item' : 'items'} • ₹{Number(item.total_amount) || 0}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: BADGE[tone(item.status)].bg }]}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: BADGE[tone(item.status)].fg }]}>
            {statusLabel(item.status)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>Failed to load orders.</Text>
        </View>
      ) : (
        <FlashList
          // An empty history is shown as empty. This used to fall back to two
          // invented orders presented as the customer's own.
          data={orders || []}
          renderItem={renderItem}
          estimatedItemSize={120}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>You have not placed an order yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 8, marginLeft: -8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  listContent: { padding: 16 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  shopName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  orderDate: { fontSize: 14, color: '#64748b' },
  orderDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  itemsText: { fontSize: 15, color: '#334155', fontWeight: '500' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: '#ef4444', fontSize: 16 },
  emptyContainer: { alignItems: 'center', paddingTop: 60 },
  emptyText: { color: '#64748b', fontSize: 16 },
});
