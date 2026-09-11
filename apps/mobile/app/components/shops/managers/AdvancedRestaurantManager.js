import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { ChefHat, ListOrdered, CheckCircle2, Navigation } from 'lucide-react-native';

import { apiGet, apiPut } from '../../../../src/lib/api';

/**
 * Restaurant kitchen display.
 *
 * This board showed two invented tickets -- "2x Paneer Tikka, 1x Naan" and
 * "1x Veg Biryani, 1x Raita" -- to the person working the kitchen. A merchant
 * reading it could cook food nobody ordered, and a real ticket arriving would
 * have been indistinguishable from the two permanent fakes beside it.
 *
 * The two buttons were inert as well: "Start Prep" and "Mark Ready" had no
 * onPress at all, so a cook could tap them all shift and nothing moved.
 *
 * Tickets now come from GET /shops/my-shop/orders, which returns
 * { success, orders, total, page } with items as a JSON string of
 * { product_name, quantity } rows. The buttons drive
 * PUT /shops/my-shop/orders/:orderId/status.
 *
 * Note the status vocabulary. The board filtered on 'new', which the API never
 * emits: orders move pending -> confirmed -> preparing -> ready, so that column
 * would have stayed empty even once real data arrived. "New Tickets" now means
 * pending or confirmed. Because pending -> preparing is not a legal transition,
 * starting prep on a pending order confirms it first.
 */
const NEW_STATUSES = ['pending', 'confirmed'];

/** items arrives as a JSON string; render it as "2x Paneer Tikka, 1x Naan". */
function formatItems(raw) {
  let rows = raw;
  if (typeof rows === 'string') {
    try { rows = JSON.parse(rows); } catch { return ''; }
  }
  if (!Array.isArray(rows)) return '';
  return rows
    .map((i) => (i.quantity || 1) + 'x ' + (i.product_name || i.name || 'Item'))
    .join(', ');
}

export default function AdvancedRestaurantManager({ shop }) {
  const [activeTab, setActiveTab] = useState('kds');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/shops/my-shop/orders');
      const rows = Array.isArray(data) ? data : (data?.orders ?? []);
      setOrders(rows.map((o) => ({
        id: String(o.id),
        items: formatItems(o.items),
        status: String(o.status || '').toLowerCase(),
      })));
    } catch (e) {
      // A kitchen must never be left guessing whether the board is empty or
      // broken, so a failure is stated rather than shown as "no orders".
      setError(e?.message || 'Could not load orders.');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const advance = async (order, target) => {
    if (busyId) return;
    setBusyId(order.id);
    try {
      if (target === 'preparing' && order.status === 'pending') {
        await apiPut('/shops/my-shop/orders/' + order.id + '/status', { status: 'confirmed' });
      }
      await apiPut('/shops/my-shop/orders/' + order.id + '/status', { status: target });
      await loadOrders();
    } catch (e) {
      Alert.alert('Could not update order', e?.message || 'The change was not saved. Please try again.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Restaurant KDS & Orders</Text>
        <Text style={styles.subtitle}>{shop.name}</Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tab, activeTab === 'kds' && styles.activeTab]} onPress={() => setActiveTab('kds')}>
          <ChefHat size={20} color={activeTab === 'kds' ? '#f97316' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'kds' && styles.activeTabText]}>KDS View</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.tab, activeTab === 'delivery' && styles.activeTab]} onPress={() => setActiveTab('delivery')}>
          <Navigation size={20} color={activeTab === 'delivery' ? '#f97316' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'delivery' && styles.activeTabText]}>Dispatch</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'kds' && loading ? (
          <ActivityIndicator size="large" color="#f97316" style={{ marginTop: 32 }} />
        ) : activeTab === 'kds' && error ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Text style={{ color: '#b91c1c', fontWeight: '700', marginBottom: 6 }}>Could not load orders</Text>
            <Text style={{ color: '#6b7280', textAlign: 'center', marginBottom: 16 }}>{error}</Text>
            <TouchableOpacity onPress={loadOrders} style={{ backgroundColor: '#f97316', paddingVertical: 10, paddingHorizontal: 24, borderRadius: 8 }}>
              <Text style={{ color: '#fff', fontWeight: '700' }}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'kds' && (
          <View style={styles.kdsGrid}>
            <View style={styles.column}>
              <View style={styles.colHeader}><Text style={styles.colTitle}>New Tickets</Text></View>
              {orders.filter(o => NEW_STATUSES.includes(o.status)).map(o => (
                <View key={o.id} style={styles.ticket}>
                  <Text style={styles.ticketId}>{o.id}</Text>
                  <Text style={styles.ticketItems}>{o.items}</Text>
                  <TouchableOpacity
                    style={styles.btnStart}
                    disabled={busyId === o.id}
                    onPress={() => advance(o, 'preparing')}
                  >
                    <Text style={styles.btnText}>{busyId === o.id ? 'Working...' : 'Start Prep'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.column}>
              <View style={[styles.colHeader, {backgroundColor: '#fff7ed'}]}><Text style={[styles.colTitle, {color: '#ea580c'}]}>Preparing</Text></View>
              {orders.filter(o => o.status === 'preparing').map(o => (
                <View key={o.id} style={[styles.ticket, {borderColor: '#fed7aa'}]}>
                  <Text style={styles.ticketId}>{o.id}</Text>
                  <Text style={styles.ticketItems}>{o.items}</Text>
                  <TouchableOpacity
                    style={styles.btnReady}
                    disabled={busyId === o.id}
                    onPress={() => advance(o, 'ready')}
                  >
                    <Text style={styles.btnText}>{busyId === o.id ? 'Working...' : 'Mark Ready'}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  tabBar: { flexDirection: 'row', backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, gap: 4, borderRadius: 8 },
  activeTab: { backgroundColor: '#fff7ed' },
  tabText: { fontSize: 12, fontWeight: 'bold', color: '#6b7280' },
  activeTabText: { color: '#ea580c' },
  content: { flex: 1 },
  kdsGrid: { flexDirection: 'row', gap: 12, padding: 12 },
  column: { flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, padding: 8 },
  colHeader: { padding: 8, backgroundColor: '#e5e7eb', borderRadius: 8, marginBottom: 8, alignItems: 'center' },
  colTitle: { fontSize: 12, fontWeight: 'bold', color: '#374151', textTransform: 'uppercase' },
  ticket: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 8 },
  ticketId: { fontSize: 14, fontWeight: '900', color: '#111827', marginBottom: 4 },
  ticketItems: { fontSize: 13, color: '#4b5563', marginBottom: 12 },
  btnStart: { backgroundColor: '#f97316', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnReady: { backgroundColor: '#10b981', paddingVertical: 8, borderRadius: 6, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 }
});
