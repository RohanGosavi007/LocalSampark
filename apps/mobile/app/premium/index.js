import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Platform, ActivityIndicator , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Crown, CheckCircle2, Zap, Star, ShieldCheck, Percent, Truck } from 'lucide-react-native';
import { apiPost } from '../../src/lib/api';

export default function NativePremiumScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // In a real flow, this would open Stripe or Razorpay native SDKs
      // For now, we simulate hitting the backend to initialize checkout
      const res = await apiPost('/premium/subscribe');
      alert('Checkout initialized (Integration Pending)');
    } catch (err) {
      alert('Checkout is currently unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s3}>Premium</Text>
      </View>

      <ScrollView style={s.s4} contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View style={s.s5}>
          {/* Decorative Glow */}
          <View style={s.s6} />
          
          <View style={s.s7}>
            <Crown size={40} color="#fff" />
          </View>
          
          <Text style={s.s8}>
            Sampark<Text style={s.s9}>Plus</Text>
          </Text>
          
          <Text style={s.s10}>
            Elevate your local experience. Zero convenience fees, free deliveries, and exclusive neighborhood deals.
          </Text>
        </View>

        <View style={s.s11}>
          
          {/* Basic Plan */}
          <View style={s.s12}>
            <Text style={s.s13}>Basic Member</Text>
            <View style={s.s14}>
              <Text style={s.s15}>₹0</Text>
              <Text style={s.s16}>/ forever</Text>
            </View>

            <View style={s.s17}>
              {['Access all local shops', 'Standard delivery fees (₹30-50)', 'Community forum access', 'Earn base SamparkCoins', 'Basic support'].map((feature, i) => (
                <View key={i} style={s.s18}>
                  <CheckCircle2 size={20} color="#10b981" style={{ marginRight: 12 }} />
                  <Text style={s.s19}>{feature}</Text>
                </View>
              ))}
            </View>

            <View style={s.s20}>
              <Text style={s.s21}>Current Plan</Text>
            </View>
          </View>

          {/* Premium Plan */}
          <View style={s.s22}>
            
            <View style={s.s23}>
              <Text style={s.s24}>Recommended</Text>
            </View>

            <View style={s.s25}>
              <Crown size={20} color="#a855f7" style={{ marginRight: 8 }} />
              <Text style={s.s26}>SamparkPlus</Text>
            </View>

            <View style={s.s27}>
              <Text style={s.s28}>₹199</Text>
              <Text style={s.s29}>/ month</Text>
            </View>

            <View style={s.s30}>
              {[
                { text: 'Zero convenience fees on bills', icon: Percent },
                { text: 'Free delivery on orders ₹500+', icon: Truck },
                { text: 'Premium verified badge', icon: ShieldCheck },
                { text: 'Exclusive flash deals (Save up to 40%)', icon: Star },
                { text: '2x SamparkCoins earning rate', icon: Zap }
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <View key={i} style={s.s31}>
                    <View style={s.s32}>
                      <Icon size={16} color="#a855f7" />
                    </View>
                    <Text style={s.s33}>{feature.text}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity 
              onPress={handleUpgrade}
              disabled={loading}
              style={s.s34}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.s35}>Upgrade to Plus</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>

        {/* Exclusive Deals */}
        <View style={s.s36}>
          <Text style={s.s37}>Exclusive Plus Deals</Text>
          <Text style={s.s38}>Available only for SamparkPlus members in Dhanori.</Text>

          <View style={s.s39}>
            {[
              { shop: 'FreshMart Supermarket', offer: 'Flat 15% OFF', desc: 'On all groceries above ₹1000' },
              { shop: 'Glow Salon & Spa', offer: 'Buy 1 Get 1', desc: 'On all premium haircuts and styling' },
              { shop: 'Dhanori Diagnostics', offer: 'Free Home Collection', desc: 'Plus 10% discount on total bill' },
            ].map((deal, i) => (
              <View key={i} style={s.s40}>
                <View style={s.s41} />
                <View style={s.s42}>
                  <Text style={s.s43}>Plus Exclusive</Text>
                </View>
                <Text style={s.s44}>{deal.offer}</Text>
                <Text style={s.s45}>{deal.shop}</Text>
                <Text style={s.s46}>{deal.desc}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  s2: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s3: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  s4: { flex: 1 },
  s5: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 32, position: 'relative' },
  s6: { position: 'absolute', top: 40, width: 192, height: 192, backgroundColor: 'rgba(147,51,234,0.2)', borderRadius: 9999 },
  s7: { width: 80, height: 80, backgroundColor: '#9333ea', borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#a855f7' },
  s8: { fontSize: 36, fontWeight: '900', color: '#ffffff', marginBottom: 16, textAlign: 'center' },
  s9: { color: '#a855f7' },
  s10: { color: '#94a3b8', textAlign: 'center', fontSize: 16, paddingHorizontal: 24 },
  s11: { paddingHorizontal: 16, marginTop: 16, gap: 24, flexDirection: 'column' },
  s12: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 24 },
  s13: { fontSize: 20, fontWeight: '700', color: '#94a3b8', marginBottom: 8 },
  s14: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  s15: { fontSize: 36, fontWeight: '900', color: '#ffffff' },
  s16: { color: '#64748b', fontWeight: '700', marginLeft: 8 },
  s17: { gap: 16, marginBottom: 32, flexDirection: 'column' },
  s18: { flexDirection: 'row', alignItems: 'center' },
  s19: { color: '#cbd5e1', fontWeight: '500', fontSize: 14, flex: 1 },
  s20: { paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: '#334155', backgroundColor: 'rgba(30,41,59,0.5)', alignItems: 'center' },
  s21: { color: '#94a3b8', fontWeight: '700' },
  s22: { backgroundColor: '#0f172a', borderWidth: 2, borderColor: '#a855f7', borderRadius: 24, padding: 24, position: 'relative' },
  s23: { position: 'absolute', top: -14, alignSelf: 'center', backgroundColor: '#9333ea', paddingHorizontal: 16, paddingVertical: 4, borderRadius: 9999 },
  s24: { color: '#ffffff', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 2 },
  s25: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 16 },
  s26: { fontSize: 20, fontWeight: '700', color: '#a855f7' },
  s27: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 24 },
  s28: { fontSize: 48, fontWeight: '900', color: '#ffffff' },
  s29: { color: '#94a3b8', fontWeight: '700', marginLeft: 8 },
  s30: { gap: 16, marginBottom: 32, flexDirection: 'column' },
  s31: { flexDirection: 'row', alignItems: 'center' },
  s32: { width: 32, height: 32, borderRadius: 9999, backgroundColor: 'rgba(168,85,247,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  s33: { color: '#ffffff', fontWeight: '700', fontSize: 14, flex: 1 },
  s34: { paddingVertical: 16, borderRadius: 16, backgroundColor: '#9333ea', alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s35: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  s36: { marginTop: 48, paddingHorizontal: 16 },
  s37: { fontSize: 24, fontWeight: '900', color: '#ffffff', textAlign: 'center', marginBottom: 8 },
  s38: { color: '#94a3b8', textAlign: 'center', marginBottom: 32 },
  s39: { gap: 16, flexDirection: 'column' },
  s40: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', borderRadius: 16, padding: 20, overflow: 'hidden', position: 'relative' },
  s41: { position: 'absolute', top: -40, right: -40, width: 128, height: 128, backgroundColor: 'rgba(168,85,247,0.1)', borderRadius: 9999 },
  s42: { backgroundColor: 'rgba(168,85,247,0.2)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, alignSelf: 'flex-start', marginBottom: 12, borderWidth: 1, borderColor: 'rgba(168,85,247,0.4)' },
  s43: { color: '#c084fc', fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  s44: { fontSize: 24, fontWeight: '900', color: '#ffffff', marginBottom: 4 },
  s45: { fontWeight: '700', color: '#cbd5e1', fontSize: 14, marginBottom: 4 },
  s46: { fontSize: 12, color: '#64748b' },
});
