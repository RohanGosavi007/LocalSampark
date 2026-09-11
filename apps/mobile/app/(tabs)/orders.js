import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { apiGet, apiPut } from '../../src/lib/api';

/**
 * Merchant order queue.
 *
 * Every order on this screen was invented — "ORD-8921, Priya Sharma, 3 items,
 * ₹450, 10 mins ago", "Rahul Verma", "Amit Patel", "Sneha Gupta" — and the
 * action buttons had no handlers at all: Accept, Decline, Mark Ready and Handed
 * Over were decoration. A merchant could tap Accept on what looked like a live
 * order and nothing would happen, to a customer who did not exist.
 *
 * /shops/my-shop/orders and /shops/my-shop/orders/:id/status now back it. Note
 * those endpoints were themselves reading a table nothing writes to
 * (universal_orders) until this round — the merchant queue has never shown a
 * real order before.
 */

// Tabs map onto the stored order_status values.
const TAB_STATUS = {
  new: ['pending'],
  preparing: ['confirmed', 'preparing'],
  ready: ['ready', 'assigned'],
  completed: ['delivered', 'dispatched', 'out_for_delivery', 'cancelled'],
};

const OrderCard = React.memo(function OrderCard({ order, activeTab, onAction, busy }) {
  const Action = ({ label, style, textStyle, status }) => (
    <TouchableOpacity
      style={[styles.actionBtn, style, busy && { opacity: 0.5 }]}
      disabled={busy}
      onPress={() => onAction(order, status)}
    >
      {busy ? (
        <ActivityIndicator size="small" color="#0f172a" />
      ) : (
        <Text style={[styles.actionBtnText, textStyle]}>{label}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>{order.id}</Text>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{order.type}</Text>
        </View>
      </View>

      <Text style={styles.customerName}>{order.customer}</Text>

      <View style={styles.orderMeta}>
        <Text style={styles.metaText}>{order.items} Items</Text>
        <Text style={styles.metaDot}>•</Text>
        <Text style={styles.metaText}>{order.time}</Text>
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.amount}>{order.amount}</Text>
        <View style={styles.actions}>
          {activeTab === 'new' && (
            <>
              {/* Transparent button, so it needs its own text colour — white
                  on white made the label invisible. */}
              <Action label="Decline" style={styles.declineBtn} textStyle={styles.declineBtnText} status="cancelled" />
              <Action label="Accept" style={styles.acceptBtn} status="confirmed" />
            </>
          )}
          {activeTab === 'preparing' && (
            <Action label="Mark Ready" style={styles.acceptBtn} status="ready" />
          )}
          {activeTab === 'ready' && order.type === 'Pickup' && (
            <Action label="Handed Over" style={styles.acceptBtn} status="delivered" />
          )}
          {activeTab === 'ready' && order.type === 'Delivery' && (
            <Action
              label="Dispatch"
              style={[styles.acceptBtn, { backgroundColor: '#f59e0b', borderColor: '#d97706' }]}
              status="out_for_delivery"
            />
          )}
        </View>
      </View>
    </View>
  );
}, (prev, next) =>
  prev.order.id === next.order.id &&
  prev.order.status === next.order.status &&
  prev.activeTab === next.activeTab &&
  prev.busy === next.busy
);

export default function OrdersScreen() {
  const [activeTab, setActiveTab] = useState('new');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/shops/my-shop/orders?limit=100');
      const rows = res?.orders ?? [];
      setOrders(
        rows.map((o) => {
          let itemCount = 0;
          try {
            const parsed = typeof o.items === 'string' ? JSON.parse(o.items) : o.items;
            itemCount = Array.isArray(parsed) ? parsed.length : 0;
          } catch {
            itemCount = 0;
          }
          return {
            id: String(o.id),
            // No placeholder name: a guest checkout shows as Customer.
            customer: o.customer_name || 'Customer',
            items: itemCount,
            amount: `₹${Number(o.total_amount) || 0}`,
            time: o.created_at ? relativeTime(o.created_at) : '',
            type: (o.fulfillment_method || '').toLowerCase() === 'pickup' ? 'Pickup' : 'Delivery',
            status: String(o.status || o.order_status || 'pending').toLowerCase(),
          };
        })
      );
    } catch (err) {
      setOrders([]);
      setError(err?.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = useCallback(async (order, status) => {
    setBusyId(order.id);
    try {
      await apiPut(`/shops/my-shop/orders/${order.id}/status`, { status });
      await load({ isRefresh: true });
    } catch (err) {
      // The buttons previously did nothing at all, so a failure was
      // indistinguishable from success.
      Alert.alert('Order not updated', err?.message || 'The change was not saved. Try again.');
    } finally {
      setBusyId(null);
    }
  }, [load]);

  const grouped = useMemo(() => {
    const out = { new: [], preparing: [], ready: [], completed: [] };
    for (const o of orders) {
      const tab = Object.keys(TAB_STATUS).find((t) => TAB_STATUS[t].includes(o.status));
      if (tab) out[tab].push(o);
    }
    return out;
  }, [orders]);

  const tabs = useMemo(() => [
    { id: 'new', label: `New (${grouped.new.length})` },
    { id: 'preparing', label: `Cooking (${grouped.preparing.length})` },
    { id: 'ready', label: `Ready (${grouped.ready.length})` },
    { id: 'completed', label: 'Done' },
  ], [grouped]);

  const currentOrders = grouped[activeTab] || [];

  const renderItem = useCallback(({ item }) => (
    <OrderCard order={item} activeTab={activeTab} onAction={handleAction} busy={busyId === item.id} />
  ), [activeTab, handleAction, busyId]);

  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyText}>
        {error ? 'Could not load your orders' : 'No orders in this status'}
      </Text>
      {error ? (
        <>
          <Text style={styles.emptySub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  ), [error, load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Order Management</Text>
      </View>

      <View style={styles.tabContainer}>
        {tabs.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {loading ? (
          <View style={styles.emptyState}><ActivityIndicator color="#3b82f6" /></View>
        ) : (
          <FlashList
            data={currentOrders}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            estimatedItemSize={140}
            getItemType={() => 'order_card'}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={{ paddingVertical: 16 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#3b82f6" />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/** "10 mins ago" from a timestamp, rather than a hardcoded string. */
function relativeTime(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return '';
  const mins = Math.round((Date.now() - then.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min${mins === 1 ? '' : 's'} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  return then.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold' },

  tabContainer: { flexDirection: 'row', backgroundColor: '#ffffff', paddingHorizontal: 8, paddingBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#3b82f6' },
  tabText: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: '#3b82f6' },

  orderCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderId: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  typeBadge: { backgroundColor: 'rgba(59, 130, 246, 0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { color: '#3b82f6', fontSize: 11, fontWeight: 'bold' },

  // Was #e2e8f0 — near-white text on a white card, effectively invisible.
  customerName: { color: '#0f172a', fontSize: 18, fontWeight: '600', marginBottom: 6 },

  orderMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  metaText: { color: '#64748b', fontSize: 14 },
  metaDot: { color: '#64748b', fontSize: 14, marginHorizontal: 8 },

  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 16 },
  amount: { color: '#10b981', fontSize: 20, fontWeight: 'bold' },

  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { paddingHorizontal: 16, minHeight: 44, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  declineBtn: { backgroundColor: 'transparent', borderColor: '#ef4444' },
  declineBtnText: { color: '#ef4444' },
  acceptBtn: { backgroundColor: '#3b82f6', borderColor: '#2563eb' },
  actionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 24 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#0f172a', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  emptySub: { color: '#64748b', fontSize: 13, marginTop: 8, textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#ffffff', fontWeight: '900', fontSize: 13 },
});
