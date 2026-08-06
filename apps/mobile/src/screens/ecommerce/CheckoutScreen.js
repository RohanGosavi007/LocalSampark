import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingBag, MapPin, Wallet, ShieldCheck } from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import { useAuth } from '../../context/AuthContext';
import { theme } from '../../theme/theme';

export default function NativeCheckoutScreen() {
  const router = useRouter();
  const { items, currentShopId, getCartTotal, clearCart } = useCartStore();
  const { API_URL, authToken, user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);

  const subtotal = getCartTotal();
  const deliveryFee = subtotal > 0 ? 30 : 0;
  const platformFee = subtotal > 0 ? 5 : 0;
  const totalAmount = subtotal + deliveryFee + platformFee;

  const handlePlaceOrder = async () => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checking out.');
      return;
    }

    setIsProcessing(true);
    try {
      const payload = {
        userId: user?.id,
        shopId: currentShopId,
        paymentMethod: 'RAZORPAY',
        deliveryAddressId: 'mock-address-id', // In a real app, this comes from state
        items: items.map(i => ({
          productId: i.id,
          quantity: i.quantity
        }))
      };

      const headers = {
        'Content-Type': 'application/json'
      };
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

      const res = await fetch(`${API_URL}/checkout`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (data.success) {
        // Integrate Razorpay strictly here in the future
        Alert.alert('Order Confirmed!', `Order Ref: ${data.order?.orderNumber || data.orderId}\nPayment ID: ${data.paymentData?.id || 'N/A'}`);
        clearCart();
        router.back();
      } else {
        Alert.alert('Checkout Failed', data.error || 'Failed to place order.');
      }
    } catch (err) {
      console.warn('Checkout error:', err);
      Alert.alert('Error', 'Network error occurred during checkout.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color={theme.colors.textPrimary} size={20} />
        </TouchableOpacity>
        <Text style={s.s3}>Checkout Cart</Text>
        <View style={s.s4} />
      </View>

      <ScrollView style={s.s5} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Address */}
        <View style={s.s6}>
          <View style={s.s7}>
            <MapPin color={theme.colors.primary} size={16} />
            <Text style={s.s8}>Delivery Address</Text>
          </View>
          <Text style={s.s9}>Default Address</Text>
          <Text style={s.s10}>Set delivery address in profile settings</Text>
        </View>

        {/* Cart Items */}
        <View style={s.s11}>
          <Text style={s.s12}>Order Items</Text>
          {items.map(i => (
            <View key={i.id} style={s.s13}>
              <View style={{flex: 1}}>
                <Text style={s.s14} numberOfLines={1}>{i.name}</Text>
                <Text style={s.s15}>Qty: {i.quantity} × ₹{i.price}</Text>
              </View>
              <Text style={s.s16}>₹{i.price * i.quantity}</Text>
            </View>
          ))}
          {items.length === 0 && (
            <Text style={{color: theme.colors.textSecondary, textAlign: 'center', marginVertical: 10}}>Cart is empty</Text>
          )}
        </View>

        {/* Bill Summary */}
        <View style={s.s17}>
          <Text style={s.s18}>Bill Summary</Text>
          <View style={s.s19}>
            <Text style={s.s20}>Subtotal</Text>
            <Text style={s.s21}>₹{subtotal}</Text>
          </View>
          <View style={s.s22}>
            <Text style={s.s23}>Delivery Fee</Text>
            <Text style={s.s24}>₹{deliveryFee}</Text>
          </View>
          <View style={s.s22}>
            <Text style={s.s23}>Platform Fee</Text>
            <Text style={s.s24}>₹{platformFee}</Text>
          </View>
          <View style={s.s25}>
            <Text style={s.s26}>To Pay</Text>
            <Text style={s.s27}>₹{totalAmount}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Pay Button */}
      <View style={s.bottomContainer}>
        <TouchableOpacity onPress={handlePlaceOrder} style={[s.s28, (isProcessing || items.length === 0) && {opacity: 0.7}]} disabled={isProcessing || items.length === 0} activeOpacity={0.8}>
          {isProcessing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <ShieldCheck color="#ffffff" size={18} />
              <Text style={s.s29}>Pay ₹{totalAmount} via Razorpay</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: theme.colors.background },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.lg, backgroundColor: theme.colors.surface, ...theme.shadows.sm },
  s2: { width: 40, height: 40, backgroundColor: theme.colors.background, borderRadius: theme.borderRadius.round, alignItems: 'center', justifyContent: 'center' },
  s3: { color: theme.colors.textPrimary, ...theme.typography.h3 },
  s4: { width: 40 },
  s5: { flex: 1, padding: theme.spacing.lg, gap: theme.spacing.lg },
  s6: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, ...theme.shadows.sm },
  s7: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  s8: { color: theme.colors.primary, fontWeight: '700', fontSize: 12 },
  s9: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
  s10: { color: theme.colors.textSecondary, fontSize: 12 },
  s11: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, ...theme.shadows.sm },
  s12: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  s13: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 8 },
  s14: { color: theme.colors.textPrimary, fontWeight: '700', fontSize: 14 },
  s15: { color: theme.colors.textSecondary, fontSize: 12 },
  s16: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 14 },
  s17: { backgroundColor: theme.colors.surface, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, gap: 8, ...theme.shadows.sm },
  s18: { color: theme.colors.textSecondary, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  s19: { flexDirection: 'row', justifyContent: 'space-between' },
  s20: { color: theme.colors.textSecondary, fontSize: 12 },
  s21: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' },
  s22: { flexDirection: 'row', justifyContent: 'space-between' },
  s23: { color: theme.colors.textSecondary, fontSize: 12 },
  s24: { color: theme.colors.textPrimary, fontSize: 12, fontWeight: '700' },
  s25: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: theme.colors.border, paddingTop: 8, marginTop: 4 },
  s26: { color: theme.colors.textPrimary, fontWeight: '800', fontSize: 14 },
  s27: { color: theme.colors.success, fontWeight: '800', fontSize: 16 },
  bottomContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: theme.spacing.lg, backgroundColor: theme.colors.surface, ...theme.shadows.lg, borderTopWidth: 1, borderTopColor: theme.colors.border },
  s28: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: theme.borderRadius.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  s29: { color: theme.colors.textInverse, fontWeight: '700', fontSize: 16 },
});
