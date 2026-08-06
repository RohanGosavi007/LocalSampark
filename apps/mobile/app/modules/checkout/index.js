import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../../../src/store/cartStore';
import { postWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../../../theme';
import { ShieldCheck, Clock, MapPin, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import BouncyButton from '../../../../src/components/BouncyButton';

export default function CheckoutScreen() {
  const { user } = useAuth();
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
      })),
      shop_id: cartItems[0]?.shop_id,
      delivery_mode: deliveryMode,
      total: grandTotal,
      payment_method: 'online',
    };

    const mockResponse = {
      success: true,
      order: { id: `ORD-${Date.now()}`, status: 'confirmed', total: grandTotal },
    };

    const { data, isDemo: demoUsed, error } = await postWithFallback('/checkout', orderPayload, mockResponse);
    setIsProcessing(false);

    if (data?.success || data?.order) {
      setIsDemo(demoUsed);
      clearCart();
      Alert.alert(
        '✅ Payment Successful', 
        `Order ${data.order?.id || ''} confirmed.`,
        [{ text: 'Track Order', onPress: () => router.push('/modules/tracking') }]
      );
    } else {
      Alert.alert('Payment Failed', error || 'Please try again.');
    }
  };

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <ChevronRight color={COLORS.text} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Checkout</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/11329/11329060.png' }} style={styles.emptyImage} />
          <Text style={styles.emptyTitle}>Your cart is empty</Text>
          <Text style={styles.emptySubtitle}>Let's add some fresh items!</Text>
          <TouchableOpacity style={styles.browseBtn} onPress={() => router.back()}>
            <Text style={styles.browseBtnText}>Browse Shop</Text>
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
          <ChevronRight color={COLORS.text} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Delivery Address / Time */}
        <View style={styles.deliveryCard}>
          <View style={styles.deliveryRow}>
            <MapPin color={COLORS.primary} size={24} />
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryTitle}>Delivering to Home</Text>
              <Text style={styles.deliveryAddress} numberOfLines={1}>Block A, Dhanori, Pune</Text>
            </View>
            <TouchableOpacity><Text style={styles.changeText}>CHANGE</Text></TouchableOpacity>
          </View>
          <View style={styles.divider} />
          <View style={styles.deliveryRow}>
            <Clock color={COLORS.success} size={20} />
            <Text style={styles.timeText}>Delivery in <Text style={{fontWeight: '800'}}>10 mins</Text></Text>
          </View>
        </View>

        {/* Cart Items List */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {cartItems.map((item, idx) => (
            <View key={`${item.id}-${idx}`} style={styles.cartItemRow}>
              <View style={styles.cartItemIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.cartItemName}>{item.name}</Text>
                <Text style={styles.cartItemPrice}>₹{item.price} x {item.quantity}</Text>
              </View>
              <Text style={styles.cartItemTotal}>₹{(item.price * item.quantity).toFixed(0)}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.addMoreBtn} onPress={() => router.back()}>
            <Text style={styles.addMoreText}>+ Add more items</Text>
          </TouchableOpacity>
        </View>

        {/* Bill Details */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Details</Text>
          <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>₹{cartTotal.toFixed(0)}</Text></View>
          <View style={styles.billRow}><Text style={styles.billLabel}>Delivery Fee</Text><Text style={[styles.billValue, deliveryFee===0 && {color: COLORS.success}]}>{deliveryFee===0 ? 'FREE' : `₹${deliveryFee}`}</Text></View>
          <View style={styles.billRow}><Text style={styles.billLabel}>Handling Fee</Text><Text style={styles.billValue}>₹{platformFee}</Text></View>
          <View style={styles.divider} />
          <View style={styles.billRow}><Text style={styles.totalLabel}>To Pay</Text><Text style={styles.totalValue}>₹{grandTotal.toFixed(0)}</Text></View>
        </View>

        {/* Trust Badges */}
        <View style={styles.trustBadgeRow}>
          <ShieldCheck color={COLORS.success} size={20} />
          <Text style={styles.trustText}>100% Secure Payments powered by Razorpay</Text>
        </View>
      </ScrollView>

      {/* Sticky Proceed to Pay */}
      <View style={styles.bottomBar}>
        <View style={styles.payInfoBox}>
          <Text style={styles.payMethodTitle}>Pay via UPI / Cards</Text>
          <Text style={styles.payAmount}>₹{grandTotal.toFixed(0)}</Text>
        </View>
        <BouncyButton style={[styles.proceedBtn, isProcessing && {opacity: 0.7}]} onPress={handlePayment} disabled={isProcessing}>
          {isProcessing ? <ActivityIndicator color="#FFF" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.proceedBtnText}>Proceed to Pay</Text>
              <ChevronRight color="#FFF" size={20} />
            </View>
          )}
        </BouncyButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, backgroundColor: COLORS.card, ...SHADOWS.sm, zIndex: 10 },
  backBtn: { marginRight: SPACING.sm },
  headerTitle: { fontSize: TYPOGRAPHY.sizes.h3, fontWeight: '800', color: COLORS.text },
  content: { padding: SPACING.md, paddingBottom: 120 },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.xl },
  emptyImage: { width: 120, height: 120, marginBottom: SPACING.lg, opacity: 0.8 },
  emptyTitle: { fontSize: TYPOGRAPHY.sizes.h2, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  emptySubtitle: { fontSize: TYPOGRAPHY.sizes.body, color: COLORS.textMuted, marginBottom: SPACING.xl },
  browseBtn: { backgroundColor: COLORS.primaryLight, paddingHorizontal: 32, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.primary },
  browseBtnText: { color: COLORS.primary, fontWeight: '800', fontSize: TYPOGRAPHY.sizes.body },

  deliveryCard: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  deliveryRow: { flexDirection: 'row', alignItems: 'center' },
  deliveryInfo: { flex: 1, marginLeft: SPACING.md },
  deliveryTitle: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: '800', color: COLORS.text },
  deliveryAddress: { fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.textMuted, marginTop: 2 },
  changeText: { color: COLORS.primary, fontWeight: '800', fontSize: TYPOGRAPHY.sizes.caption },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.sm },
  timeText: { marginLeft: SPACING.sm, color: COLORS.text, fontSize: TYPOGRAPHY.sizes.body },

  card: { backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.md, padding: SPACING.md, marginBottom: SPACING.md, ...SHADOWS.sm },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.h3, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  
  cartItemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  cartItemIcon: { width: 16, height: 16, borderRadius: 4, backgroundColor: COLORS.success, marginRight: SPACING.sm, opacity: 0.2 },
  cartItemName: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: '600', color: COLORS.text },
  cartItemPrice: { fontSize: TYPOGRAPHY.sizes.caption, color: COLORS.textMuted, marginTop: 2 },
  cartItemTotal: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: '800', color: COLORS.text },
  addMoreBtn: { alignSelf: 'center', paddingVertical: SPACING.sm, marginTop: SPACING.sm },
  addMoreText: { color: COLORS.primary, fontWeight: '800', fontSize: TYPOGRAPHY.sizes.body },

  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.sm },
  billLabel: { fontSize: TYPOGRAPHY.sizes.body, color: COLORS.textMuted },
  billValue: { fontSize: TYPOGRAPHY.sizes.body, fontWeight: '700', color: COLORS.text },
  totalLabel: { fontSize: TYPOGRAPHY.sizes.h3, fontWeight: '900', color: COLORS.text },
  totalValue: { fontSize: TYPOGRAPHY.sizes.h3, fontWeight: '900', color: COLORS.text },

  trustBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', padding: SPACING.sm, borderRadius: BORDER_RADIUS.sm, marginTop: SPACING.sm },
  trustText: { marginLeft: SPACING.sm, color: COLORS.success, fontSize: 11, fontWeight: '700' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, padding: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOWS.md, flexDirection: 'row', alignItems: 'center' },
  payInfoBox: { flex: 1 },
  payMethodTitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  payAmount: { fontSize: TYPOGRAPHY.sizes.h2, fontWeight: '900', color: COLORS.text },
  proceedBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, ...SHADOWS.sm },
  proceedBtnText: { color: '#FFF', fontWeight: '900', fontSize: TYPOGRAPHY.sizes.body, marginRight: 4 },
});
