import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingBag, MapPin, Wallet, ShieldCheck } from 'lucide-react-native';

export default function NativeCheckoutScreen() {
  const router = useRouter();
  const [items, setItems] = useState([
    { id: 'prod_1', name: 'Organic Fresh Whole Milk (1L)', price: 68, quantity: 2 },
    { id: 'prod_2', name: 'Fresh Aashirvaad Atta (5kg)', price: 245, quantity: 1 }
  ]);

  const subtotal = items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const deliveryFee = 25;
  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    Alert.alert(
      'Confirm Order',
      `Pay ₹${totalAmount} via LocalWallet for Instant Delivery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay & Place Order', 
          onPress: () => {
            Alert.alert('Order Confirmed!', `Order Ref: ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
            router.back();
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text style={s.s3}>Checkout Cart</Text>
        <View style={s.s4} />
      </View>

      <ScrollView style={s.s5}>
        {/* Address */}
        <View style={s.s6}>
          <View style={s.s7}>
            <MapPin color="#6366f1" size={16} />
            <Text style={s.s8}>Delivery Address</Text>
          </View>
          <Text style={s.s9}>Flat 402, Dhanori Greens</Text>
          <Text style={s.s10}>Porwal Road, Dhanori, Pune - 411015</Text>
        </View>

        {/* Cart Items */}
        <View style={s.s11}>
          <Text style={s.s12}>Order Items</Text>
          {items.map(i => (
            <View key={i.id} style={s.s13}>
              <View>
                <Text style={s.s14}>{i.name}</Text>
                <Text style={s.s15}>Qty: {i.quantity} × ₹{i.price}</Text>
              </View>
              <Text style={s.s16}>₹{i.price * i.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        <View style={s.s17}>
          <Text style={s.s18}>Bill Summary</Text>
          <View style={s.s19}>
            <Text style={s.s20}>Subtotal</Text>
            <Text style={s.s21}>₹{subtotal}</Text>
          </View>
          <View style={s.s22}>
            <Text style={s.s23}>Hyperlocal Delivery Fee</Text>
            <Text style={s.s24}>₹{deliveryFee}</Text>
          </View>
          <View style={s.s25}>
            <Text style={s.s26}>To Pay</Text>
            <Text style={s.s27}>₹{totalAmount}</Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity onPress={handlePlaceOrder} style={s.s28}>
          <Wallet color="#ffffff" size={18} />
          <Text style={s.s29}>Pay ₹{totalAmount} via LocalWallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  s2: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  s3: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s4: { width: 40 },
  s5: { flex: 1, padding: 16, gap: 16 },
  s6: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16 },
  s7: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  s8: { color: '#818cf8', fontWeight: '700', fontSize: 12 },
  s9: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  s10: { color: '#94a3b8', fontSize: 12 },
  s11: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16 },
  s12: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  s13: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderColor: 'rgba(30,41,59,0.6)', paddingVertical: 8 },
  s14: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  s15: { color: '#94a3b8', fontSize: 12 },
  s16: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  s17: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, gap: 8 },
  s18: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  s19: { flexDirection: 'row', justifyContent: 'space-between' },
  s20: { color: '#94a3b8', fontSize: 12 },
  s21: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  s22: { flexDirection: 'row', justifyContent: 'space-between' },
  s23: { color: '#94a3b8', fontSize: 12 },
  s24: { color: '#e2e8f0', fontSize: 12, fontWeight: '700' },
  s25: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 8, marginTop: 4 },
  s26: { color: '#ffffff', fontWeight: '800', fontSize: 14 },
  s27: { color: '#34d399', fontWeight: '800', fontSize: 16 },
  s28: { backgroundColor: '#4f46e5', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 },
  s29: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});
