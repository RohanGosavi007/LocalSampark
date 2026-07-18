import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function CheckoutScreen() {
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const cartTotal = 340; // Mocked for speed
  const total = deliveryMode === 'delivery' ? cartTotal + 40 : cartTotal;

  const handlePayment = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      router.push('/modules/tracking');
    }, 2000);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Delivery Modes */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Select Order Type</Text>
          
          <View style={styles.modesGrid}>
            <TouchableOpacity 
              style={[styles.modeBox, deliveryMode === 'delivery' && styles.modeBoxActive]}
              onPress={() => setDeliveryMode('delivery')}
            >
              <Text style={styles.modeIcon}>🛵</Text>
              <Text style={[styles.modeText, deliveryMode === 'delivery' && styles.modeTextActive]}>Home Delivery</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeBox, deliveryMode === 'pickup' && styles.modeBoxActive]}
              onPress={() => setDeliveryMode('pickup')}
            >
              <Text style={styles.modeIcon}>🚶</Text>
              <Text style={[styles.modeText, deliveryMode === 'pickup' && styles.modeTextActive]}>Self Pickup</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.modeBox, deliveryMode === 'dinein' && styles.modeBoxActive]}
              onPress={() => setDeliveryMode('dinein')}
            >
              <Text style={styles.modeIcon}>🍽️</Text>
              <Text style={[styles.modeText, deliveryMode === 'dinein' && styles.modeTextActive]}>Dine-in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Payment Settings */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <View style={styles.paymentBox}>
            
            {/* Batch Checkout Demo */}
            <View style={styles.featureRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>🛒 Multi-Shop Batch Order</Text>
                <Text style={styles.featureSub}>Combine delivery from Pharmacy + Grocery</Text>
              </View>
              <TouchableOpacity 
                style={[styles.featureBtn, deliveryMode === 'batch' && styles.featureBtnActive]}
                onPress={() => setDeliveryMode(deliveryMode === 'batch' ? 'delivery' : 'batch')}
              >
                <Text style={[styles.featureBtnText, deliveryMode === 'batch' && styles.featureBtnTextActive]}>
                  {deliveryMode === 'batch' ? 'Batch Enabled' : 'Enable Batch'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Loyalty Coins */}
            <View style={[styles.featureRow, { marginTop: 16 }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>🪙 LocalSampark Pass</Text>
                <Text style={styles.featureSubActive}>120 Coins available (₹120)</Text>
              </View>
              <TouchableOpacity style={styles.featureBtn}>
                <Text style={styles.featureBtnText}>Apply Coins</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />
            
            {/* Total Row */}
            <View style={styles.totalRow}>
              <View>
                <Text style={styles.totalLabel}>Total to Pay</Text>
                <Text style={styles.totalAmount}>₹{deliveryMode === 'batch' ? cartTotal + 25 : total}</Text>
                {deliveryMode === 'batch' && <Text style={styles.savingsText}>Saved ₹15 on Batch Delivery!</Text>}
              </View>
            </View>

          </View>

          <TouchableOpacity 
            style={[styles.payBtn, isProcessing && styles.payBtnDisabled]} 
            onPress={handlePayment}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.payBtnText}>Pay Now via UPI/Card</Text>
            )}
          </TouchableOpacity>

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  backText: { color: '#3b82f6', fontSize: 16, fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { padding: 16 },

  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },

  modesGrid: { flexDirection: 'row', gap: 12 },
  modeBox: { flex: 1, padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#e2e8f0', alignItems: 'center', backgroundColor: '#f8fafc' },
  modeBoxActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  modeIcon: { fontSize: 32, marginBottom: 8 },
  modeText: { fontSize: 13, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  modeTextActive: { color: '#3b82f6' },

  paymentBox: { backgroundColor: '#f1f5f9', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 20 },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  featureTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
  featureSub: { fontSize: 12, color: '#64748b', marginTop: 4 },
  featureSubActive: { fontSize: 12, color: '#f59e0b', marginTop: 4, fontWeight: '600' },
  featureBtn: { backgroundColor: '#f1f5f9', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  featureBtnActive: { backgroundColor: '#10b981', borderColor: '#10b981' },
  featureBtnText: { fontSize: 12, fontWeight: '700', color: '#475569' },
  featureBtnTextActive: { color: '#fff' },

  divider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 16 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  totalAmount: { fontSize: 32, fontWeight: '900', color: '#10b981', marginTop: 4 },
  savingsText: { fontSize: 12, color: '#10b981', fontWeight: '700', marginTop: 4 },

  payBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  payBtnDisabled: { opacity: 0.7 },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: '800' }
});
