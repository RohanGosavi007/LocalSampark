import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, Package, Clock, CheckCircle, XCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../src/lib/api';

export default function OrdersScreen() {
  const router = useRouter();

  // Using React Query (Phase C)
  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['myOrders'],
    queryFn: async () => {
      const response = await apiGet('/orders/my-orders');
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
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
      onPress={() => router.push(`/orders/${item.id}`)}
    >
      <View style={styles.orderHeader}>
        <Text style={styles.shopName}>{item.shop_name || 'Local Shop'}</Text>
        <Text style={styles.orderDate}>{new Date(item.created_at || Date.now()).toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Package size={16} color="#64748b" />
          <Text style={styles.itemsText}>
            {item.items_count || 1} {item.items_count === 1 ? 'item' : 'items'} • ₹{item.total_amount}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'delivered' ? '#ecfdf5' : '#fef3c7' }]}>
          {getStatusIcon(item.status)}
          <Text style={[styles.statusText, { color: item.status === 'delivered' ? '#065f46' : '#b45309' }]}>
            {item.status?.toUpperCase() || 'PENDING'}
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
          data={orders?.length ? orders : [
            { id: 'mock1', shop_name: 'Dhanori Fresh', total_amount: 145, status: 'delivered', items_count: 3 },
            { id: 'mock2', shop_name: 'City Pharmacy', total_amount: 850, status: 'pending', items_count: 1 }
          ]}
          renderItem={renderItem}
          estimatedItemSize={120}
          keyExtractor={item => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No orders found</Text>
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
