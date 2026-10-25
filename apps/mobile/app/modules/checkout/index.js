import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert, Image, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useCartStore } from '../../../src/store/cartStore';
import { apiGet, apiPost } from '../../../src/lib/api';
import { getPaymentConfig, openCheckout, payFor } from '../../../src/lib/payments';
import { useAuth } from '../../../src/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDER_RADIUS, SHADOWS } from '../../theme';
import { ShieldCheck, MapPin, ChevronRight } from 'lucide-react-native';
import BouncyButton from '../../../src/components/BouncyButton';

// Loaded the way ZoneContext loads it: a build without the native module can
// still check out with a saved address.
let Location = null;
try {
  Location = require('expo-location');
} catch (e) {
  Location = null;
}

const METHODS = [
  { key: 'cod', label: 'Cash on delivery', pickupLabel: 'Pay at the shop' },
  { key: 'wallet', label: 'LocalSampark Wallet' },
  { key: 'online', label: 'UPI / Cards / Netbanking' },
];

/**
 * The cart checkout.
 *
 * This screen used to send the order with field names the API does not read
 * (shop_id, product_id, payment_method), so every request was refused — and
 * then, through a mock-fallback helper, showed "Payment Successful" with an order
 * number made from the clock. Nothing was ordered and nothing was paid. The
 * total on screen (₹40 delivery, ₹5 handling) was the app's own arithmetic,
 * and one hard-coded address was every customer's delivery address.
 *
  * Delivery is charged by distance from the shop, so the server is told where
 * the order is going: the saved address's location, or the phone's.
 *
 * Now the bill is the server's (POST /checkout/quote), the order is placed
 * with POST /checkout, and it is reported as placed only when the server says
 * so:
 *   cash      placed; paid on delivery or at the shop.
 *   wallet    the server debits the wallet as it places the order.
 *   online    Razorpay Checkout opens for the payment the server opened; the
 *             order is confirmed paid once the server has verified it. Backing
 *             out leaves the order unpaid and the button retries the payment.
 */
export default function CheckoutScreen() {
  const { user, refreshWallet } = useAuth();
  const { items: cartItems, clearCart, currentShopId, currentShopName } = useCartStore();
  const [deliveryMode, setDeliveryMode] = useState('delivery');
  const [address, setAddress] = useState('');
  const [method, setMethod] = useState('cod');
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quote, setQuote] = useState(null);
    const [quoteError, setQuoteError] = useState('');
  // Where a delivery is going: a saved address (the server knows its location)
  // and/or a point from the phone.
  const [savedAddressId, setSavedAddressId] = useState(null);
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  // An order placed for online payment that has not been paid yet.
  const [pendingOrder, setPendingOrder] = useState(null);

  const shopId = currentShopId || cartItems[0]?.shop_id;
  const lines = cartItems.map(item => ({ productId: item.id, quantity: item.quantity }));
  const cartKey = cartItems.map(item => `${item.id}:${item.quantity}`).join(',');

  useEffect(() => {
    let cancelled = false;
    getPaymentConfig().then(config => { if (!cancelled) setOnlineAvailable(config.enabled); });
    // The customer's saved default address, if they have one.
    apiGet('/users/addresses')
      .then(data => {
        const list = Array.isArray(data?.data) ? data.data : [];
        const preferred = list.find(a => a.is_default === 1 || a.is_default === true) || list[0];
                if (!cancelled && preferred) {
          setAddress(prev => prev || [preferred.street_address, preferred.city, preferred.postal_code].filter(Boolean).join(', '));
          setSavedAddressId(preferred.id);
        }
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
        if (!shopId || cartItems.length === 0 || pendingOrder) return undefined;
    const delivering = deliveryMode === 'delivery';
    if (delivering && !location && !savedAddressId) {
      setQuote(null);
      setQuoteError('Share your delivery location — the delivery charge depends on the distance.');
      return undefined;
    }
    let cancelled = false;
    apiPost('/checkout/quote', {
      shopId,
      deliveryMode,
      items: lines,
      ...(delivering ? { addressId: savedAddressId || undefined, deliveryCoordinate: location || undefined } : {}),
    })
      .then(data => {
        if (cancelled) return;
        setQuote(data);
        setQuoteError('');
      })
      .catch(error => {
        if (cancelled) return;
        setQuote(null);
        setQuoteError(error?.message || 'This cart cannot be priced right now.');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shopId, cartKey, deliveryMode, pendingOrder, savedAddressId, location ? `${location.lat},${location.lng}` : '']);

  const codAvailable = !quote || quote.paymentMethods?.cod !== false;
  useEffect(() => {
    if (method === 'cod' && !codAvailable && !pendingOrder) setMethod(onlineAvailable ? 'online' : 'wallet');
  }, [method, codAvailable, onlineAvailable, pendingOrder]);

  const useMyLocation = async () => {
    if (!Location) {
      Alert.alert('Location unavailable', 'This build cannot read your location. Choose a saved address instead.');
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission', 'Allow location access to have the delivery charge worked out, or use a saved address.');
      } else {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy?.Balanced });
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
      }
    } catch (error) {
      Alert.alert('Location', 'Your location could not be found. Please try again.');
    }
    setLocating(false);
  };

  useEffect(() => {
    if (method === 'online' && !onlineAvailable && !pendingOrder) setMethod('cod');
  }, [method, onlineAvailable, pendingOrder]);

  const bill = pendingOrder ? pendingOrder.bill : quote?.bill || null;
  const rupees = (value) => (value === null || value === undefined ? '—' : `₹${Number(value).toFixed(0)}`);

  const finish = (order, paid) => {
    setPendingOrder(null);
    clearCart();
    if (paid && refreshWallet) refreshWallet();
    Alert.alert(
      paid ? 'Order placed and paid' : 'Order placed',
      paid
        ? `Order ${String(order.id).slice(0, 8)} is confirmed.`
        : `Order ${String(order.id).slice(0, 8)} is placed. ${deliveryMode === 'pickup' ? 'Pay at the shop.' : 'Pay on delivery.'}`,
      [{ text: 'Track Order', onPress: () => router.push({ pathname: '/modules/tracking', params: { orderId: String(order.id) } }) }]
    );
  };

  const payOnline = async (order, payment) => {
    const display = {
      name: currentShopName || 'LocalSampark',
      description: `Order ${String(order.id).slice(0, 8)}`,
      prefill: { contact: user?.phone_number || user?.phone || '', name: user?.full_name || user?.name || '' },
    };
    try {
      if (payment) await openCheckout(payment, display);
      else await payFor({ purpose: 'order', referenceId: order.id }, display);
      finish(order, true);
    } catch (error) {
      const dismissed = error.code === 'DISMISSED';
      Alert.alert(
        dismissed ? 'Payment not completed' : 'Payment failed',
        `${dismissed ? '' : `${error.message} `}Your order is saved. Tap Pay to try again.`
      );
    }
  };

  const handlePayment = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Empty Cart', 'Please add items to your cart before checkout.');
      return;
    }

    if (pendingOrder) {
      setIsProcessing(true);
      await payOnline(pendingOrder.order, null);
      setIsProcessing(false);
      return;
    }

    if (deliveryMode === 'delivery' && !address.trim()) {
      Alert.alert('Delivery address', 'Please enter the address to deliver to.');
      return;
    }

    setIsProcessing(true);
    try {
      const data = await apiPost('/checkout', {
        shopId,
        deliveryMode,
        paymentMethod: method,
                deliveryAddress: deliveryMode === 'delivery' ? address.trim() : null,
        addressId: deliveryMode === 'delivery' && savedAddressId ? savedAddressId : undefined,
        deliveryCoordinate: deliveryMode === 'delivery' && location ? location : undefined,
        items: lines,
      });

      if (method === 'online') {
        setPendingOrder({ order: data.order, bill: data.bill });
        if (data.paymentData) {
          await payOnline(data.order, data.paymentData);
        } else {
          Alert.alert('Payment not started', `${data.paymentError || 'Online payment could not be started.'} Your order is saved. Tap Pay to try again.`);
        }
      } else {
        finish(data.order, method === 'wallet');
      }
    } catch (error) {
      Alert.alert('Order not placed', error?.message || 'Please try again.');
    }
    setIsProcessing(false);
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronRight color={COLORS.text} size={24} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Delivery or pickup */}
        <View style={styles.deliveryCard}>
          <View style={styles.modeRow}>
            {[{ key: 'delivery', label: 'Delivery' }, { key: 'pickup', label: 'Pickup' }].map(mode => (
              <TouchableOpacity
                key={mode.key}
                disabled={Boolean(pendingOrder)}
                onPress={() => setDeliveryMode(mode.key)}
                style={[styles.modeChip, deliveryMode === mode.key && styles.modeChipActive]}
              >
                <Text style={[styles.modeChipText, deliveryMode === mode.key && styles.modeChipTextActive]}>{mode.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          {deliveryMode === 'delivery' ? (
            <View style={styles.deliveryRow}>
              <MapPin color={COLORS.primary} size={24} />
              <TextInput
                style={styles.addressInput}
                value={address}
                onChangeText={setAddress}
                editable={!pendingOrder}
                                placeholder="Flat / building, street, area, pincode"
                placeholderTextColor={COLORS.textMuted}
                multiline
              />
            </View>
          ) : null}
          {deliveryMode === 'delivery' ? (
            <TouchableOpacity style={styles.locateBtn} onPress={useMyLocation} disabled={locating || Boolean(pendingOrder)}>
              <Text style={styles.locateText}>
                {locating ? 'Finding your location…' : location ? 'Location shared — update it' : 'Use my current location'}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.timeText}>Collect from {currentShopName || 'the shop'} once it is ready.</Text>
          )}
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
          <View style={styles.billRow}><Text style={styles.billLabel}>Item Total</Text><Text style={styles.billValue}>{rupees(bill?.subtotal)}</Text></View>
                    {deliveryMode === 'delivery' ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>
                Delivery Fee{bill?.distanceKm !== null && bill?.distanceKm !== undefined ? ` · ${bill.distanceKm} km` : ''}{bill?.surgeMultiplier > 1 ? ` · busy ×${bill.surgeMultiplier}` : ''}
              </Text>
              <Text style={[styles.billValue, bill?.deliveryFee === 0 && {color: COLORS.success}]}>{bill?.deliveryFee === 0 ? 'FREE' : rupees(bill?.deliveryFee)}</Text>
            </View>
          ) : (
            <View style={styles.billRow}><Text style={styles.billLabel}>Delivery</Text><Text style={styles.billValue}>Pickup</Text></View>
          )}
          {bill?.smallOrderFee > 0 && (
            <View style={styles.billRow}><Text style={styles.billLabel}>Small Order Fee</Text><Text style={styles.billValue}>{rupees(bill.smallOrderFee)}</Text></View>
          )}
          <View style={styles.billRow}><Text style={styles.billLabel}>Platform Fee</Text><Text style={styles.billValue}>{rupees(bill?.platformFee)}</Text></View>
          <View style={styles.divider} />
          <View style={styles.billRow}><Text style={styles.totalLabel}>To Pay</Text><Text style={styles.totalValue}>{rupees(bill?.total)}</Text></View>
                    {!!bill?.etaMinutes && (
            <Text style={styles.etaText}>
              {deliveryMode === 'pickup' ? `Ready in about ${bill.etaMinutes} min` : `Arrives in about ${bill.etaMinutes} min`}
            </Text>
          )}
          {!!quoteError && !pendingOrder && <Text style={styles.errorText}>{quoteError}</Text>}
        </View>

        {/* Payment method */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pay With</Text>
          {METHODS.map(option => {
                        const unavailable = (option.key === 'online' && !onlineAvailable) || (option.key === 'cod' && !codAvailable);
            const selected = method === option.key;
            return (
              <TouchableOpacity
                key={option.key}
                disabled={unavailable || Boolean(pendingOrder)}
                onPress={() => setMethod(option.key)}
                style={[styles.methodRow, selected && styles.methodRowActive, unavailable && { opacity: 0.5 }]}
              >
                <View style={[styles.radio, selected && styles.radioActive]} />
                <Text style={styles.methodText}>
                  {deliveryMode === 'pickup' && option.pickupLabel ? option.pickupLabel : option.label}
                                    {unavailable
                    ? option.key === 'cod' && quote?.cod?.maxOrderValue
                      ? ` (up to ₹${quote.cod.maxOrderValue})`
                      : ' (not available right now)'
                    : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {onlineAvailable && (
          <View style={styles.trustBadgeRow}>
            <ShieldCheck color={COLORS.success} size={20} />
            <Text style={styles.trustText}>Online payments are processed by Razorpay</Text>
          </View>
        )}
      </ScrollView>

      {/* Sticky Proceed to Pay */}
      <View style={styles.bottomBar}>
        <View style={styles.payInfoBox}>
          <Text style={styles.payMethodTitle}>{METHODS.find(m => m.key === method)?.label}</Text>
          <Text style={styles.payAmount}>{rupees(bill?.total)}</Text>
        </View>
        <BouncyButton style={[styles.proceedBtn, (isProcessing || !bill) && {opacity: 0.7}]} onPress={handlePayment} disabled={isProcessing || !bill}>
          {isProcessing ? <ActivityIndicator color="#FFF" /> : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.proceedBtnText}>{pendingOrder ? 'Pay' : method === 'cod' ? 'Place Order' : 'Proceed to Pay'}</Text>
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

  modeRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.md },
  modeChip: { flex: 1, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  modeChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  modeChipText: { color: COLORS.textMuted, fontWeight: '700', fontSize: TYPOGRAPHY.sizes.body },
  modeChipTextActive: { color: COLORS.primary },
  addressInput: { flex: 1, marginLeft: SPACING.md, color: COLORS.text, fontSize: TYPOGRAPHY.sizes.body, minHeight: 44, paddingVertical: 4 },
  methodRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: SPACING.sm, borderRadius: BORDER_RADIUS.sm, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.sm },
  methodRowActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  methodText: { flex: 1, color: COLORS.text, fontSize: TYPOGRAPHY.sizes.body, fontWeight: '600' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: COLORS.border, marginRight: SPACING.sm },
  radioActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
    errorText: { color: COLORS.error || '#DC2626', fontSize: TYPOGRAPHY.sizes.caption, marginTop: SPACING.sm },
  etaText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.caption, marginTop: SPACING.sm },
  locateBtn: { marginTop: SPACING.md, paddingVertical: 10, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.primary, alignItems: 'center' },
  locateText: { color: COLORS.primary, fontWeight: '700', fontSize: TYPOGRAPHY.sizes.body },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: COLORS.card, padding: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border, ...SHADOWS.md, flexDirection: 'row', alignItems: 'center' },
  payInfoBox: { flex: 1 },
  payMethodTitle: { fontSize: 11, color: COLORS.textMuted, fontWeight: '600', marginBottom: 2 },
  payAmount: { fontSize: TYPOGRAPHY.sizes.h2, fontWeight: '900', color: COLORS.text },
  proceedBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: 14, borderRadius: BORDER_RADIUS.md, ...SHADOWS.sm },
  proceedBtnText: { color: '#FFF', fontWeight: '900', fontSize: TYPOGRAPHY.sizes.body, marginRight: 4 },
});
