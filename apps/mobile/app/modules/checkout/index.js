import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../../../src/store/cartStore';
import { postWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';
import { useAuth } from '../../../src/context/AuthContext';

export default function CheckoutScreen() {
  const { user, authToken } = useAuth();
  const { items: cartItems, getCartTotal, getItemCount, clearCart, currentShopName } = useCartStore();
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const cartTotal = getCartTotal();
  const deliveryFee = deliveryMode === 'delivery' ? 40 : 0;
  const platformFee = 5;
  const grandTotal = cartTotal + deliveryFee + platformFee;

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }

    setIsProcessing(true);

    const orderPayload = {
      items: cartItems.map(item => ({
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        options: item.options || {},
      })),
      shop_id: cartItems[0]?.shop_id,
      delivery_mode: deliveryMode,
      delivery_fee: deliveryFee,
      platform_fee: platformFee,
      total: grandTotal,
      payment_method: 'cod',
    };

    const mockResponse = {
      success: true,
      order: { id: `ORD-${Date.now()}`, status: 'confirmed', total: grandTotal },
      message: 'Order placed successfully!',
    };

    const { data, isDemo: demoUsed, error } = await postWithFallback('/checkout', orderPayload, mockResponse);

    setIsProcessing(false);

    if (data?.success || data?.order) {
      setIsDemo(demoUsed);
      clearCart();
      Alert.alert(
        '✅ Order Placed!', 
        `Order ${data.order?.id || ''} confirmed. Total: ₹${grandTotal}${demoUsed ? '\n\n🔧 (Demo Mode - Backend offline)' : ''}`,
        [{ text: 'Track Order', onPress: () => router.push('/modules/tracking') }]
      );
    } else {
      Alert.alert('Payment Failed', error || 'Something went wrong. Please try again.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Browse shops and add items to get started</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.push('/(tabs)/directory')}>
            <Text style={styles.browseBtnText}>Browse Shops</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <DemoBadge visible={isDemo} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Shop Name */}
        {currentShopName && (
          <View style={styles.shopBanner}>
            <Text style={styles.shopBannerIcon}>🏪</Text>
            <Text style={styles.shopBannerText}>Ordering from {currentShopName}</Text>
          </View>
        )}
        
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

        {/* Cart Items */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Your Items ({getItemCount()})</Text>
          {cartItems.map((item, idx) => (
            <View key={`${item.id}-${idx}`} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.cartItemQty}>Qty: {item.quantity}</Text>
              </View>
              <Text style={styles.cartItemPrice}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Summary</Text>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total</Text>
            <Text style={styles.billValue}>₹{cartTotal.toFixed(0)}</Text>
          </View>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <Text style={[styles.billValue, deliveryFee === 0 && { color: '#10b981' }]}>
              {deliveryFee === 0 ? 'FREE' : `₹${deliveryFee}`}
            </Text>
          </View>
          
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Platform Fee</Text>
            <Text style={styles.billValue}>₹{platformFee}</Text>
          </View>
          
          <View style={[styles.billRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Grand Total</Text>
            <Text style={styles.totalValue}>₹{grandTotal.toFixed(0)}</Text>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          <TouchableOpacity style={[styles.paymentOption, styles.paymentOptionActive]}>
            <Text style={styles.paymentIcon}>💵</Text>
            <View>
              <Text style={styles.paymentLabel}>Cash on Delivery</Text>
              <Text style={styles.paymentDesc}>Pay when you receive your order</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.paymentOption}>
            <Text style={styles.paymentIcon}>💳</Text>
            <View>
              <Text style={styles.paymentLabel}>Online Payment</Text>
              <Text style={styles.paymentDesc}>UPI, Cards, Wallets (Coming Soon)</Text>
            </View>
          </TouchableOpacity>
        </View>

      </ScrollView>

      {/* Bottom CTA */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomTotal}>₹{grandTotal.toFixed(0)}</Text>
          <Text style={styles.bottomItems}>{getItemCount()} items</Text>
        </View>
        <TouchableOpacity 
          style={[styles.placeOrderBtn, isProcessing && { opacity: 0.7 }]} 
          onPress={handlePayment}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order →</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  backBtn: { paddingRight: 16 },
  backText: { color: '#3b82f6', fontWeight: '700', fontSize: 14 },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, paddingBottom: 100 },
  
  // Empty state
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  browseBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  browseBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },

  // Shop banner
  shopBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', padding: 12, borderRadius: 12, marginBottom: 16, gap: 8 },
  shopBannerIcon: { fontSize: 18 },
  shopBannerText: { color: '#1e40af', fontWeight: '600', fontSize: 13 },

  // Card
  card: { backgroundColor: '#ffffff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { color: '#0f172a', fontWeight: 'bold', fontSize: 16, marginBottom: 12 },

  // Delivery modes
  modesGrid: { flexDirection: 'row', gap: 12 },
  modeBox: { flex: 1, alignItems: 'center', padding: 16, borderRadius: 12, backgroundColor: '#f8fafc', borderWidth: 1.5, borderColor: '#e2e8f0' },
  modeBoxActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  modeIcon: { fontSize: 24, marginBottom: 6 },
  modeText: { fontSize: 11, fontWeight: '700', color: '#64748b', textAlign: 'center' },
  modeTextActive: { color: '#1d4ed8' },

  // Cart items
  cartItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cartItemInfo: { flex: 1 },
  cartItemName: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  cartItemQty: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
  cartItemPrice: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },

  // Bill
  billRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  billLabel: { color: '#64748b', fontSize: 14 },
  billValue: { color: '#0f172a', fontSize: 14, fontWeight: '600' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', marginTop: 8, paddingTop: 12 },
  totalLabel: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  totalValue: { color: '#10b981', fontWeight: '900', fontSize: 18 },

  // Payment
  paymentOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, marginBottom: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' },
  paymentOptionActive: { borderColor: '#3b82f6', backgroundColor: '#eff6ff' },
  paymentIcon: { fontSize: 24 },
  paymentLabel: { color: '#0f172a', fontWeight: '600', fontSize: 14 },
  paymentDesc: { color: '#94a3b8', fontSize: 11, marginTop: 2 },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderTopWidth: 1, borderTopColor: '#e2e8f0', elevation: 10 },
  bottomTotal: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  bottomItems: { color: '#64748b', fontSize: 12 },
  placeOrderBtn: { backgroundColor: '#10b981', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12, minWidth: 150, alignItems: 'center' },
  placeOrderText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});
