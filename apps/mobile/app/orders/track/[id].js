import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Navigation, Truck, Package, PhoneCall, CheckCircle } from 'lucide-react-native';
import { Linking, Alert } from 'react-native';
import { apiGet } from '../../../src/lib/api';
// In a real app we'd use react-native-maps
// import MapView, { Marker, Polyline } from 'react-native-maps';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // A setTimeout used to hand back a complete fictional delivery: order
    // "ORD-1234" from "Sharma Grocery & Daily Needs", arriving in 12 minutes,
    // with a driver named "Ramesh Kumar" on "+91 9876543210" riding
    // "MH 12 AB 1234 (Hero Splendor)". A named person, a working phone number
    // and a vehicle registration, none of them belonging to anyone, shown to a
    // customer as the rider bringing their order — with a Call button beside
    // them. /orders/:orderId has existed the whole time.
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet(`/orders/${id}`);
        const o = res?.order ?? res;
        if (!o || !o.id) throw new Error('Order not found');

        setOrder({
          id: o.id,
          shop_name: o.shop_name || 'Shop',
          status: o.status || o.order_status || 'pending',
          // Only shown when the server computed one. The mock always claimed
          // "12 mins".
          eta: o.eta || o.estimated_delivery_time || null,
          // The rider block renders only when a rider is actually assigned and
          // named. There is no invented fallback.
          driver: o.delivery_agent_name
            ? {
                name: o.delivery_agent_name,
                phone: o.delivery_agent_phone || null,
                vehicle: o.delivery_agent_vehicle || null,
              }
            : null,
        });
      } catch (err) {
        setOrder(null);
        setError(err?.message === 'Order not found'
          ? 'This order could not be found.'
          : 'Could not load this order. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      load();
    } else {
      setOrder(null);
      setError('No order was specified.');
      setLoading(false);
    }
  }, [id]);

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
          <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
            <Text style={styles.errorBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const steps = [
    { id: 'placed', label: 'Placed', icon: Package },
    { id: 'packing', label: 'Packing', icon: CheckCircle },
    { id: 'out_for_delivery', label: 'On the Way', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: MapPin }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.id === order.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Map View Placeholder */}
      <View style={styles.mapContainer}>
        {/* 
        <MapView 
          style={{flex: 1}}
          initialRegion={{
            latitude: order.coords.driver.latitude,
            longitude: order.coords.driver.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          <Marker coordinate={order.coords.shop} title="Shop" />
          <Marker coordinate={order.coords.user} title="Delivery Location" pinColor="green" />
          <Marker coordinate={order.coords.driver} title="Driver">
             <View style={styles.driverMarker}><Truck size={14} color="#fff"/></View>
          </Marker>
        </MapView>
        */}
        <View style={styles.simulatedMap}>
          <Navigation size={48} color="#9ca3af" style={{ opacity: 0.5 }} />
          <Text style={styles.simulatedText}>Live Map Tracking (Native)</Text>
          <Text style={styles.simulatedSubText}>Requires react-native-maps package</Text>
        </View>
      </View>

      {/* Tracking Details */}
      <View style={styles.detailsContainer}>
        <View style={styles.dragHandle} />
        
        <View style={styles.header}>
          <Text style={styles.orderId}>{order.id}</Text>
          {/* No invented ETA: shown only if the server sent one. */}
          {order.eta ? (
            <Text style={styles.etaText}>Arriving in <Text style={{color: '#4f46e5'}}>{order.eta}</Text></Text>
          ) : null}
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          {steps.map((step, index) => {
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const Icon = step.icon;
            
            return (
              <View key={step.id} style={styles.stepWrapper}>
                <View style={[styles.stepIcon, isCompleted && styles.stepCompleted, isCurrent && styles.stepCurrent]}>
                  <Icon size={16} color={isCompleted ? '#fff' : '#9ca3af'} />
                </View>
                <Text style={[styles.stepText, isCompleted && styles.stepTextCompleted]}>{step.label}</Text>
                
                {index < steps.length - 1 && (
                  <View style={[styles.stepLine, index < currentStepIndex && styles.stepLineCompleted]} />
                )}
              </View>
            );
          })}
        </View>

        {/* Driver Info */}
        {order.driver && (
          <View style={styles.driverCard}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverInitials}>{order.driver.name.charAt(0)}</Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{order.driver.name}</Text>
              {order.driver.vehicle ? (
                <Text style={styles.driverVehicle}>{order.driver.vehicle}</Text>
              ) : null}
            </View>
            {/* The Call button had no handler — it dialled nothing. */}
            <TouchableOpacity
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
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  errorBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  errorBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  mapContainer: { flex: 1, backgroundColor: '#e5e7eb' },
  simulatedMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#eef2ff' },
  simulatedText: { fontSize: 18, fontWeight: 'bold', color: '#6b7280', marginTop: 12 },
  simulatedSubText: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  
  detailsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    marginTop: -24
  },
  dragHandle: { width: 40, height: 4, backgroundColor: '#e5e7eb', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  orderId: { fontSize: 18, fontWeight: '900', color: '#111827' },
  etaText: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  
  progressContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 32 },
  stepWrapper: { alignItems: 'center', flex: 1, position: 'relative' },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  stepCompleted: { backgroundColor: '#4f46e5' },
  stepCurrent: { borderWidth: 2, borderColor: '#c7d2fe' },
  stepText: { fontSize: 10, color: '#9ca3af', marginTop: 8, textAlign: 'center', fontWeight: 'bold' },
  stepTextCompleted: { color: '#111827' },
  stepLine: { position: 'absolute', top: 15, left: '50%', width: '100%', height: 2, backgroundColor: '#f3f4f6', zIndex: 1 },
  stepLineCompleted: { backgroundColor: '#4f46e5' },
  
  driverCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9fafb', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  driverAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#c7d2fe', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  driverInitials: { fontSize: 18, fontWeight: 'bold', color: '#4f46e5' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  driverVehicle: { fontSize: 12, color: '#6b7280', marginTop: 2 },
  callBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center' }
});
