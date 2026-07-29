import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

export default function OrderTrackingScreen() {
  const { orderId } = useLocalSearchParams();
  const [orderStatus, setOrderStatus] = useState('accepted');
  const [driverLocation, setDriverLocation] = useState({ lat: 19.076, lng: 72.8777 });
  const [etaMinutes, setEtaMinutes] = useState(18);

  // Real-time Supabase Location Tracking Subscription
  useEffect(() => {
    if (!orderId) return;

    // Listen to real-time driver updates for this specific order
    const channel = supabase
      .channel(`order:${orderId}`)
      .on('broadcast', { event: 'delivery:location:update' }, (payload) => {
        if (payload.coordinates) {
          setDriverLocation(payload.coordinates);
        }
        if (payload.eta) setEtaMinutes(payload.eta);
      })
      .on('broadcast', { event: 'shop:order:status' }, (payload) => {
        if (payload.status) setOrderStatus(payload.status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  const steps = [
    { key: 'placed', label: 'Order Placed', icon: '📝', done: true },
    { key: 'accepted', label: 'Accepted by Vendor', icon: '👨‍🍳', done: ['accepted', 'preparing', 'out_for_delivery', 'delivered'].includes(orderStatus) },
    { key: 'preparing', label: 'Preparing Items', icon: '🔥', done: ['preparing', 'out_for_delivery', 'delivered'].includes(orderStatus) },
    { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🛵', done: ['out_for_delivery', 'delivered'].includes(orderStatus) },
    { key: 'delivered', label: 'Delivered', icon: '🎉', done: orderStatus === 'delivered' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Order Tracking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Estimated Arrival Banner */}
        <View style={styles.etaCard}>
          <Text style={styles.etaLabel}>ESTIMATED ARRIVAL TIME</Text>
          <Text style={styles.etaTime}>{etaMinutes} Mins</Text>
          <Text style={styles.etaSub}>Driver is navigating through your pincode territory</Text>
        </View>

        {/* Real-time Order Stepper */}
        <View style={styles.stepperCard}>
          <Text style={styles.cardTitle}>Order Status</Text>
          {steps.map((step, idx) => (
            <View key={step.key} style={styles.stepRow}>
              <View style={[styles.stepIconBox, step.done && styles.stepIconBoxActive]}>
                <Text style={{ fontSize: 16 }}>{step.icon}</Text>
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepLabel, step.done && styles.stepLabelActive]}>{step.label}</Text>
                {step.done && <Text style={styles.stepSub}>Completed</Text>}
              </View>
              {step.done && <Text style={{ color: '#10b981', fontWeight: '800' }}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Live Driver Location Info */}
        <View style={styles.driverCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={styles.avatar}><Text style={{ fontSize: 24 }}>🛵</Text></View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '800', color: '#0f172a' }}>Ramesh Kumar</Text>
              <Text style={{ fontSize: 13, color: '#64748b' }}>Delivery Partner • 4.9 ⭐</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
              <Text style={styles.callBtnText}>📞 Call Driver</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  backBtnText: { fontSize: 18, fontWeight: '700' },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16 },
  etaCard: { backgroundColor: '#1e40af', padding: 20, borderRadius: 20, marginBottom: 16 },
  etaLabel: { color: '#93c5fd', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  etaTime: { color: '#fff', fontSize: 36, fontWeight: '900', marginVertical: 4 },
  etaSub: { color: '#bfdbfe', fontSize: 13 },
  stepperCard: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 16, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  stepIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  stepIconBoxActive: { backgroundColor: '#dcfce7' },
  stepTextCol: { flex: 1 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  stepLabelActive: { color: '#0f172a', fontWeight: '800' },
  stepSub: { fontSize: 11, color: '#10b981', fontWeight: '600' },
  driverCard: { backgroundColor: '#fff', padding: 16, borderRadius: 20, elevation: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  callBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  callBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' }
});
