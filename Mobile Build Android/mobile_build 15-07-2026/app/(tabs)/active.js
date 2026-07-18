import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function ActiveOrders() {
  const [activeOrder, setActiveOrder] = useState({
    id: 'DEL-1049', 
    type: 'Food Delivery', 
    pickup: 'Sharma Grocery', 
    dropoff: 'Flat 402, Goodwill Society',
    customerPhone: '9876543210',
    status: 'Picked Up', // 'Assigned', 'Picked Up', 'Delivered'
    otp: ''
  });

  const handleUpdateStatus = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeOrder.status === 'Assigned') {
      setActiveOrder({...activeOrder, status: 'Picked Up'});
    } else if (activeOrder.status === 'Picked Up') {
      if (activeOrder.otp.length !== 4) {
        Alert.alert('Error', 'Please enter a valid 4-digit OTP provided by the customer.');
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Delivery Successful!', 'Earnings (₹45) added to your wallet.');
      setActiveOrder(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚚 Active Delivery</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!activeOrder ? (
          <View style={styles.emptyState}>
            <Text style={{fontSize: 40, marginBottom: 15}}>🏁</Text>
            <Text style={styles.emptyText}>No active deliveries.</Text>
            <Text style={styles.emptySubText}>Head to the 'Available' tab to find your next job!</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.orderId}>{activeOrder.id}</Text>
              <View style={styles.statusBadge}><Text style={styles.statusText}>{activeOrder.status}</Text></View>
            </View>

            <Text style={styles.orderType}>{activeOrder.type}</Text>
            
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapText}>🗺️ Live Map Tracking Active</Text>
            </View>

            <View style={styles.locationBox}>
              <Text style={styles.locationText}>📍 Pickup: {activeOrder.pickup}</Text>
              <Text style={styles.locationText}>🎯 Drop: {activeOrder.dropoff}</Text>
              <TouchableOpacity style={styles.callBtn}>
                <Text style={styles.callBtnText}>📞 Call Customer</Text>
              </TouchableOpacity>
            </View>

            {activeOrder.status === 'Picked Up' && (
              <View style={styles.otpBox}>
                <Text style={styles.otpLabel}>Customer OTP required to deliver:</Text>
                <TextInput 
                  style={styles.otpInput} 
                  keyboardType="numeric" 
                  maxLength={4} 
                  placeholder="Enter 4-Digit OTP" 
                  placeholderTextColor="#64748b"
                  value={activeOrder.otp}
                  onChangeText={t => setActiveOrder({...activeOrder, otp: t})}
                />
              </View>
            )}

            <TouchableOpacity 
              style={[styles.actionBtn, activeOrder.status === 'Picked Up' && styles.actionBtnComplete]} 
              onPress={handleUpdateStatus}
            >
              <Text style={styles.actionBtnText}>
                {activeOrder.status === 'Assigned' ? 'Confirm Pickup from Shop' : 'Verify OTP & Complete Delivery'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  
  content: { padding: 15 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  emptySubText: { color: '#64748b', fontSize: 14, textAlign: 'center' },
  
  card: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#f59e0b' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  orderId: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
  statusBadge: { backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  statusText: { color: '#fcd34d', fontWeight: 'bold', fontSize: 12 },
  orderType: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  mapPlaceholder: { height: 120, backgroundColor: '#f8fafc', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  mapText: { color: '#64748b', fontWeight: 'bold' },

  locationBox: { backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, marginBottom: 15 },
  locationText: { color: '#475569', fontSize: 14, marginBottom: 10 },
  callBtn: { backgroundColor: '#e2e8f0', padding: 10, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  callBtnText: { color: '#0f172a', fontWeight: 'bold' },
  
  otpBox: { marginBottom: 15 },
  otpLabel: { color: '#64748b', marginBottom: 5, fontSize: 13 },
  otpInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 15, fontSize: 18, textAlign: 'center', letterSpacing: 5 },

  actionBtn: { backgroundColor: '#f59e0b', padding: 15, borderRadius: 10, alignItems: 'center' },
  actionBtnComplete: { backgroundColor: '#10b981' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 }
});
