import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView , StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCartStore } from '../src/store/cartStore';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react-native';
import { describeChange } from '../src/lib/cartModel';

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getCartTotal, shopGroups, notices, dismissNotices } = useCartStore();
  const groups = shopGroups();

  const total = getCartTotal();


  if (items.length === 0) {
    return (
      <SafeAreaView style={s.s0}>
        <ShoppingBag color="#64748b" size={64} />
        <Text style={s.s1}>Your cart is empty</Text>
        <Text style={s.s2}>Add items from shops to start an order</Text>
        <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/wishlist')}>
          <Text style={{ color: '#93c5fd', fontWeight: '700', marginBottom: 16 }}>♡ Saved items and recently viewed</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={s.s3}
          onPress={() => router.push('/')}
        >
          <Text style={s.s4}>Start Shopping</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.s5}>
      <View style={s.s6}>
        <Text style={s.s7}>Review Cart</Text>
        <TouchableOpacity accessibilityRole="link" onPress={() => router.push('/wishlist')}>
          <Text style={{ color: '#93c5fd', fontWeight: '700', paddingVertical: 4 }}>♡ Saved items and recently viewed</Text>
        </TouchableOpacity>
        <Text style={s.s8}>
          {groups.length === 1 ? `From: ${groups[0].shopName}` : `${groups.length} shops: one checkout, an order for each shop`}
        </Text>
      </View>
      
      <ScrollView style={s.s9}>
        {notices && notices.length > 0 ? (
          <TouchableOpacity onPress={dismissNotices} accessibilityRole="button" style={s.notice}>
            {notices.map((n, i) => <Text key={i} style={s.noticeText}>{describeChange(n)}</Text>)}
          </TouchableOpacity>
        ) : null}
        {groups.map((group) => (
        <View key={String(group.shopId)} style={s.s10}>
          {groups.length > 1 ? <Text style={s.shopHeading}>{group.shopName} · ₹{group.subtotal.toFixed(0)}</Text> : null}
          {group.items.map((item, index) => (
            <View key={`${item.id}-${JSON.stringify(item.options || {})}`} style={[s.s35, index !== group.items.length - 1 && s.s36]}>
              <View style={s.s11}>
                <Text style={s.s12}>{item.name}</Text>
                <Text style={s.s13}>₹{item.price}</Text>
                {item.isOutOfStock ? (
                  <Text style={s.noticeText}>{item.availableStock > 0 ? `Only ${item.availableStock} left` : 'Out of stock'}</Text>
                ) : null}
              </View>
              
              <View style={s.s14}>
                <TouchableOpacity 
                  onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1, item.options || {}) : removeItem(item.id, item.options || {})}
                  style={s.s15}
                >
                  {item.quantity > 1 ? <Minus color="#fff" size={16} /> : <Trash2 color="#ef4444" size={16} />}
                </TouchableOpacity>
                <Text style={s.s16}>{item.quantity}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity + 1, item.options || {})}
                  style={s.s17}
                >
                  <Plus color="#fff" size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        ))}

        <View style={s.s18}>
          <Text style={s.s19}>Bill Details</Text>
          <View style={s.s20}>
            <Text style={s.s21}>Item Total</Text>
            <Text style={s.s22}>₹{total}</Text>
          </View>
          {/* Delivery and fees are the server's, worked out at checkout from where
              the order is going. This screen used to show a ₹10 platform fee
              of its own and add it to the total. */}
          <View style={s.s26}>
            <Text style={s.s27}>Delivery and fees</Text>
            <Text style={s.s28}>Worked out at checkout</Text>
          </View>
        </View>
      </ScrollView>

      <View style={s.s32}>
        <TouchableOpacity 
          style={s.s33}
          onPress={() => router.push('/checkout')}
        >
          <Text style={s.s34}>Proceed to Checkout</Text>
          <ArrowRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  notice: { marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 12, backgroundColor: '#fef3c7' },
  noticeText: { color: '#b45309', fontWeight: '700', fontSize: 13 },
  shopHeading: { fontWeight: '800', fontSize: 15, color: '#e2e8f0', marginBottom: 8 },
  s0: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  s1: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  s2: { color: '#94a3b8', marginBottom: 32 },
  s3: { backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  s4: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s5: { flex: 1, backgroundColor: '#020617' },
  s6: { padding: 16, borderBottomWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  s7: { color: '#ffffff', fontSize: 24, fontWeight: '700' },
  s8: { color: '#60a5fa', fontWeight: '700', fontSize: 14, marginTop: 4 },
  s9: { flex: 1, padding: 16 },
  s10: { backgroundColor: '#0f172a', borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', overflow: 'hidden', marginBottom: 24 },
  s11: { flex: 1, paddingRight: 16 },
  s12: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  s13: { color: '#60a5fa', fontWeight: '700' },
  s14: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#334155' },
  s15: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#334155', borderRadius: 8 },
  s16: { color: '#ffffff', fontWeight: '700', marginHorizontal: 12, width: 16, textAlign: 'center' },
  s17: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2563eb', borderRadius: 8 },
  s18: { backgroundColor: '#0f172a', padding: 24, borderRadius: 24, borderWidth: 1, borderColor: '#1e293b', marginBottom: 32 },
  s19: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s20: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  s21: { color: '#94a3b8' },
  s22: { color: '#cbd5e1' },
  s23: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  s24: { color: '#94a3b8' },
  s25: { color: '#cbd5e1' },
  s26: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  s27: { color: '#94a3b8' },
  s28: { color: '#34d399' },
  s29: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  s30: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s31: { color: '#ffffff', fontWeight: '900', fontSize: 24 },
  s32: { padding: 16, backgroundColor: '#0f172a', borderTopWidth: 1, borderColor: '#1e293b', paddingBottom: 32 },
  s33: { backgroundColor: '#2563eb', width: '100%', paddingVertical: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  s34: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginRight: 8 },
  s35: { padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s36: { borderBottomWidth: 1, borderColor: '#1e293b' },
});
