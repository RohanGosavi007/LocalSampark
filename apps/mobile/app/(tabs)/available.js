import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function AvailableOrders() {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    // Simulated fetch of live socket orders for the delivery agent's pincode
    setOrders([
      { id: 'DEL-1049', type: 'Food Delivery', pickup: 'Sharma Grocery', dropoff: 'Flat 402, Goodwill Society', earnings: 45, distance: '1.2 km', time: '5 min ago' },
      { id: 'DEL-1052', type: 'Medicine', pickup: 'Pune Pharmacy', dropoff: 'A-Wing, Park Springs', earnings: 30, distance: '2.5 km', time: '1 min ago' }
    ]);
  }, []);

  const handleAccept = (id) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Order Accepted!', `You have accepted ${id}. Navigating to active orders...`);
    setOrders(orders.filter(o => o.id !== id));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📡 Available Jobs</Text>
        <Text style={styles.subtitle}>Pincode: 400001</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {orders.length === 0 ? (
          <Text style={styles.emptyText}>No available orders right now. Waiting for pings...</Text>
        ) : (
          orders.map(order => (
            <View key={order.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.orderId}>{order.id}</Text>
                <Text style={styles.earnings}>₹{order.earnings}</Text>
              </View>
              
              <Text style={styles.orderType}>{order.type}</Text>
              
              <View style={styles.locationBox}>
                <Text style={styles.locationText}>📍 Pickup: {order.pickup}</Text>
                <Text style={styles.locationText}>🎯 Drop: {order.dropoff}</Text>
              </View>
              
              <View style={styles.footerRow}>
                <Text style={styles.metaText}>📏 {order.distance}</Text>
                <Text style={styles.metaText}>🕒 {order.time}</Text>
              </View>
              
              <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(order.id)}>
                <Text style={styles.acceptBtnText}>Swipe to Accept</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  subtitle: { color: '#38bdf8', fontSize: 14, marginTop: 4, fontWeight: 'bold' },
  
  content: { padding: 15 },
  emptyText: { color: '#64748b', textAlign: 'center', marginTop: 50 },
  
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#3b82f6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  orderId: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
  earnings: { color: '#10b981', fontWeight: 'bold', fontSize: 18 },
  orderType: { color: '#0f172a', fontSize: 14, marginBottom: 15 },
  
  locationBox: { backgroundColor: '#f8fafc', padding: 10, borderRadius: 8, marginBottom: 15 },
  locationText: { color: '#475569', fontSize: 12, marginBottom: 5 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  metaText: { color: '#64748b', fontSize: 12 },
  
  acceptBtn: { backgroundColor: '#3b82f6', padding: 15, borderRadius: 10, alignItems: 'center' },
  acceptBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});
