import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator, ScrollView, Linking, Alert, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Package, CheckCircle, Clock, Truck, MapPin, PhoneCall, XCircle } from 'lucide-react-native';
import { useSocket, useSocketEvent, useSocketRoom } from '../../../src/context/SocketContext';
import { useCartStore } from '../../../src/store/cartStore';
import {
  ORDER_STEPS, ORDER_EVENTS, POLL_INTERVAL_MS, stepIndex, canCancel, shouldPoll, isEventFor,
  orderRef, statusLabel, loadOrder, cancelOrder, orderAgain, downloadInvoice, slotText, reviewOrder,
} from '../../../src/services/orders';

const STEP_ICONS = { pending: Clock, confirmed: CheckCircle, preparing: Package, out_for_delivery: Truck, delivered: MapPin };

/**
 * One order (C9). The screen used to hand back a made-up delivery (removed
 * earlier), then showed a progress bar keyed on statuses the server never
 * sends, with no way to cancel, get the invoice or order again, and no live
 * updates. The rules are in src/services/orders.js.
 */
/** C11: rate a delivered order's shop (a verified purchase). */
function RateOrder({ order }) {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [note, setNote] = useState(null);
  const send = async () => {
    try {
      await reviewOrder(order, stars, text);
      setNote({ ok: true, text: 'Thank you. Your review is published as a verified purchase.' });
    } catch (e) {
      setNote({ ok: false, text: e?.message || 'The review could not be saved.' });
    }
  };
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Rate {order.shopName}</Text>
      <View style={{ flexDirection: 'row', gap: 4 }} accessibilityRole="radiogroup">
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} accessibilityRole="radio" accessibilityState={{ checked: stars === n }} accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}
            onPress={() => setStars(n)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 26, color: n <= stars ? '#f59e0b' : '#cbd5e1' }}>★</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput value={text} onChangeText={setText} placeholder="Your review (optional)" multiline maxLength={2000}
        style={{ borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, padding: 10, minHeight: 64, marginTop: 8 }} />
      <TouchableOpacity accessibilityRole="button" style={[styles.primaryBtn, { marginTop: 10 }]} onPress={send}>
        <Text style={styles.primaryText}>Publish review</Text>
      </TouchableOpacity>
      {note ? <Text style={[styles.notice, { color: note.ok ? '#047857' : '#dc2626' }]}>{note.text}</Text> : null}
    </View>
  );
}

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { isConnected } = useSocket();
  const addItem = useCartStore((s) => s.addItem);

  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (quiet = false) => {
    if (!id) {
      setError('No order was specified.');
      setLoading(false);
      return;
    }
    if (!quiet) setLoading(true);
    try {
      setOrder(await loadOrder(id));
      setError(null);
    } catch (err) {
      // A failed background refresh keeps the order already on screen.
      if (!quiet) {
        setOrder(null);
        setError(err?.message === 'Order not found' || err?.status === 404
          ? 'This order could not be found.'
          : 'Could not load this order. Check your connection and try again.');
      }
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Live: the order room, and every event that means the order changed.
  useSocketRoom('order', id);
  const onEvent = useCallback((payload) => { if (isEventFor(payload, id)) load(true); }, [id, load]);
  useSocketEvent(ORDER_EVENTS[0], onEvent);
  useSocketEvent(ORDER_EVENTS[1], onEvent);
  useSocketEvent(ORDER_EVENTS[2], onEvent);

  // Polling fallback while the socket is down and the order can still change.
  const status = order?.status;
  useEffect(() => {
    if (!status || !shouldPoll(status, isConnected)) return undefined;
    const timer = setInterval(() => load(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [status, isConnected, load]);

  const onCancel = () => {
    Alert.alert('Cancel this order?', 'The shop will be told, and any payment refunded.', [
      { text: 'Keep order', style: 'cancel' },
      {
        text: 'Cancel order',
        style: 'destructive',
        onPress: async () => {
          setBusy('cancel');
          setNotice(null);
          try {
            await cancelOrder(order);
            setNotice({ ok: true, text: 'Your order has been cancelled.' });
          } catch (e) {
            setNotice({ ok: false, text: e.message || 'The order could not be cancelled.' });
          } finally {
            setBusy(null);
            load(true);
          }
        },
      },
    ]);
  };

  const onInvoice = async () => {
    setBusy('invoice');
    setNotice(null);
    try {
      // Loaded on demand: expo-router loads every route at start-up, and a
      // build made before expo-sharing was added would otherwise fail to open
      // at all instead of only this one action failing.
      let fs;
      let sharing;
      try {
        fs = require('expo-file-system');
        sharing = require('expo-sharing');
      } catch {
        throw new Error('Update the app to download invoices.');
      }
      await downloadInvoice(order.id, { fs, sharing });
    } catch (e) {
      setNotice({ ok: false, text: e.message || 'The invoice could not be downloaded.' });
    } finally {
      setBusy(null);
    }
  };

  const onOrderAgain = async () => {
    setBusy('reorder');
    setNotice(null);
    try {
      const r = await orderAgain(order, { addItem });
      if (r.reason === 'none_available') {
        setNotice({ ok: false, text: 'None of these items is available from the shop any more.' });
      } else if (r.reason === 'different_shop') {
        setNotice({ ok: false, text: `Your cart has items from ${r.currentShopName}. Empty it first, then order again.` });
      } else {
        if (r.missing.length) Alert.alert('Some items were not added', `Not available any more: ${r.missing.join(', ')}`);
        router.push('/cart');
      }
    } catch (e) {
      setNotice({ ok: false, text: e.message || 'Could not order again.' });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Order unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const reached = stepIndex(order.status);
  const cancelled = reached < 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.shopName}>{order.shopName}</Text>
            <Text style={styles.orderId}>#{orderRef(order.id)} • {statusLabel(order.status)}</Text>
          </View>
          <Text style={styles.total}>₹{order.total}</Text>
        </View>
        {/* No invented ETA: shown only if the server sent one. */}
        {order.eta && !cancelled ? <Text style={styles.etaText}>Arriving in {order.eta}</Text> : null}
        {order.scheduledFor && !cancelled ? (
          <Text style={styles.etaText}>{order.pickup ? 'Collect' : 'Arrives'} {slotText(order.scheduledFor)}</Text>
        ) : null}

        {cancelled ? (
          <View style={styles.cancelledRow}>
            <XCircle size={20} color="#dc2626" />
            <Text style={styles.cancelledText}>This order was cancelled.</Text>
          </View>
        ) : (
          <View style={styles.steps} accessibilityLabel={`Order status: ${statusLabel(order.status)}`}>
            {ORDER_STEPS.map((step, i) => {
              const Icon = STEP_ICONS[step.key];
              const done = i <= reached;
              return (
                <View key={step.key} style={styles.stepRow}>
                  <View style={[styles.stepIcon, done && styles.stepDone]}>
                    <Icon size={16} color={done ? '#fff' : '#9ca3af'} />
                  </View>
                  <Text style={[styles.stepText, done && styles.stepTextDone]}>{step.label}</Text>
                </View>
              );
            })}
          </View>
        )}

        {order.driver && (
          <View style={styles.driverCard}>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{order.driver.name}</Text>
              {order.driver.vehicle ? <Text style={styles.driverVehicle}>{order.driver.vehicle}</Text> : null}
            </View>
            <TouchableOpacity
              accessibilityLabel="Call the delivery partner"
              style={[styles.callBtn, !order.driver.phone && { opacity: 0.45 }]}
              disabled={!order.driver.phone}
              onPress={() =>
                Linking.openURL(`tel:${order.driver.phone}`).catch(() =>
                  Alert.alert('Could not place the call', `Dial ${order.driver.phone} manually.`)
                )
              }
            >
              <PhoneCall size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        {order.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Items</Text>
            {order.items.map((it, i) => (
              <Text key={`${it.productId}-${i}`} style={styles.itemText}>{it.name} × {it.quantity}</Text>
            ))}
          </View>
        )}

        <View style={styles.actions}>
          {canCancel(order.status) && (
            <TouchableOpacity accessibilityRole="button" style={styles.dangerBtn} disabled={!!busy} onPress={onCancel}>
              <Text style={styles.dangerText}>{busy === 'cancel' ? 'Cancelling…' : 'Cancel order'}</Text>
            </TouchableOpacity>
          )}
          {!cancelled && (
            <TouchableOpacity accessibilityRole="button" style={styles.outlineBtn} disabled={!!busy} onPress={onInvoice}>
              <Text style={styles.outlineText}>{busy === 'invoice' ? 'Preparing…' : 'Download invoice'}</Text>
            </TouchableOpacity>
          )}
          {['delivered', 'cancelled'].includes(order.status) && order.items.length > 0 && (
            <TouchableOpacity accessibilityRole="button" style={styles.primaryBtn} disabled={!!busy} onPress={onOrderAgain}>
              <Text style={styles.primaryText}>{busy === 'reorder' ? 'Adding…' : 'Order again'}</Text>
            </TouchableOpacity>
          )}
        </View>
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: notice.ok ? '#047857' : '#dc2626' }]}>{notice.text}</Text>
        ) : null}

        {order.status === 'delivered' ? <RateOrder order={order} /> : null}

        {/* C14: in-app order help; the ticket keeps this order. */}
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.helpBtn}
          onPress={() => router.push(`/support?order=${encodeURIComponent(String(id))}`)}
        >
          <Text style={styles.helpText}>Get help with this order</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  body: { padding: 20, paddingBottom: 48 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  shopName: { fontSize: 17, fontWeight: '900', color: '#111827' },
  orderId: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  total: { fontSize: 18, fontWeight: '900', color: '#111827' },
  etaText: { fontSize: 15, fontWeight: '700', color: '#4f46e5', marginBottom: 12 },
  cancelledRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef2f2', padding: 16, borderRadius: 16, marginBottom: 12 },
  cancelledText: { marginLeft: 8, color: '#dc2626', fontWeight: '800' },
  steps: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  stepDone: { backgroundColor: '#4f46e5' },
  stepText: { marginLeft: 12, fontSize: 14, color: '#9ca3af', fontWeight: '700' },
  stepTextDone: { color: '#111827' },
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  driverVehicle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  cardTitle: { fontWeight: '800', color: '#111827', marginBottom: 6 },
  itemText: { color: '#374151', paddingVertical: 2 },
  actions: { gap: 10, marginTop: 4 },
  primaryBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 24, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  outlineBtn: { borderWidth: 1, borderColor: '#d1d5db', backgroundColor: '#fff', minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  outlineText: { color: '#111827', fontWeight: '800' },
  dangerBtn: { borderWidth: 1, borderColor: '#dc2626', backgroundColor: '#fff', minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12 },
  dangerText: { color: '#dc2626', fontWeight: '800' },
  notice: { marginTop: 10, fontWeight: '700' },
  helpBtn: { marginTop: 16, minHeight: 44, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#4f46e5' },
  helpText: { color: '#4f46e5', fontWeight: '800' },
});
