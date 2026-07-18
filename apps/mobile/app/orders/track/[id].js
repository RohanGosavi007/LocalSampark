import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MapPin, Navigation, Truck, Package, PhoneCall, CheckCircle } from 'lucide-react-native';
// In a real app we'd use react-native-maps
// import MapView, { Marker, Polyline } from 'react-native-maps';

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    // Simulated fetching from API
    setTimeout(() => {
      setOrder({
        id: id || 'ORD-1234',
        shop_name: 'Sharma Grocery & Daily Needs',
        status: 'out_for_delivery',
        eta: '12 mins',
        driver: {
          name: 'Ramesh Kumar',
          phone: '+91 9876543210',
          vehicle: 'MH 12 AB 1234 (Hero Splendor)'
        },
        coords: {
          shop: { latitude: 18.5793, longitude: 73.8780 },
          user: { latitude: 18.5710, longitude: 73.8820 },
          driver: { latitude: 18.5750, longitude: 73.8800 }
        }
      });
      setLoading(false);
    }, 1000);
  }, [id]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
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
          <Text style={styles.etaText}>Arriving in <Text style={{color: '#4f46e5'}}>{order.eta}</Text></Text>
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
              <Text style={styles.driverVehicle}>{order.driver.vehicle}</Text>
            </View>
            <TouchableOpacity style={styles.callBtn}>
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
