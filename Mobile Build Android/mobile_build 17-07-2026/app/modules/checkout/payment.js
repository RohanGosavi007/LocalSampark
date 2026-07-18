import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useCartStore } from '../../../src/store/cartStore';
import { useOrderRinger } from '../../../src/context/OrderRingerContext';

export default function PaymentScreen() {
  const { total } = useLocalSearchParams();
  const { clearCart } = useCartStore();
  const { triggerNewOrder } = useOrderRinger();
  
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [isProcessing, setIsProcessing] = useState(false);

  const methods = [
    { id: 'upi', title: 'UPI / QR Code', icon: '📱', desc: 'Google Pay, PhonePe, Paytm' },
    { id: 'card', title: 'Credit / Debit Card', icon: '💳', desc: 'Visa, MasterCard, RuPay' },
    { id: 'wallet', title: 'LocalSampark Wallet', icon: '👛', desc: 'Balance: ₹1,250' },
    { id: 'cod', title: 'Cash on Delivery', icon: '💵', desc: 'Pay at doorstep' }
  ];

  const handlePayment = () => {
    setIsProcessing(true);
    
    // Simulate payment gateway delay
    setTimeout(() => {
      setIsProcessing(false);
      clearCart();
      
      // TRIGGER THE RINGING SYSTEM FOR SHOP OWNER (DEV DEMO)
      triggerNewOrder({
        id: `ORD-${Math.floor(Math.random() * 90000) + 10000}`,
        customer: 'Local Resident',
        amount: `₹${total}`,
        items: 3,
        time: 'Just now'
      });
      
      // Redirect to tracking
      router.replace('/modules/orders/tracking');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Select Payment</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Amount to Pay</Text>
          <Text style={styles.totalValue}>₹{total}</Text>
        </View>

        <Text style={styles.sectionTitle}>Payment Methods</Text>
        
        {methods.map(method => (
          <TouchableOpacity 
            key={method.id} 
            style={[styles.methodCard, selectedMethod === method.id && styles.activeMethod]}
            onPress={() => setSelectedMethod(method.id)}
          >
            <Text style={styles.methodIcon}>{method.icon}</Text>
            <View style={styles.methodInfo}>
              <Text style={styles.methodTitle}>{method.title}</Text>
              <Text style={styles.methodDesc}>{method.desc}</Text>
            </View>
            <View style={[styles.radio, selectedMethod === method.id && styles.radioActive]}>
              {selectedMethod === method.id && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.payBtn, isProcessing && styles.payBtnDisabled]}
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payBtnText}>Pay ₹{total}</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnIcon: { color: '#0f172a', fontSize: 24 },
  
  scrollContent: { padding: 16 },
  
  totalCard: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#e2e8f0' },
  totalLabel: { color: '#64748b', fontSize: 14, marginBottom: 8 },
  totalValue: { color: '#0f172a', fontSize: 32, fontWeight: '900' },
  
  sectionTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  
  methodCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ffffff' },
  activeMethod: { borderColor: '#3b82f6', backgroundColor: 'rgba(59, 130, 246, 0.1)' },
  methodIcon: { fontSize: 28, marginRight: 16 },
  methodInfo: { flex: 1 },
  methodTitle: { color: '#e2e8f0', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  methodDesc: { color: '#64748b', fontSize: 13 },
  
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', justifyContent: 'center', alignItems: 'center' },
  radioActive: { borderColor: '#3b82f6' },
  radioInner: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6' },
  
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: '#ffffff', borderTopWidth: 1, borderTopColor: '#ffffff' },
  payBtn: { backgroundColor: '#3b82f6', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' }
});
