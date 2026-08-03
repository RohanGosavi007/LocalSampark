import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, Search, Package, Clock, ShoppingBag, CheckCircle2 } from 'lucide-react-native';
import { apiGet, apiPost } from '../../src/lib/api';

export default function NativeSubscriptionsScreen() {
  const router = useRouter();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkout State
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet('/subscription/plans');
      const items = data.data || data.rows || (Array.isArray(data) ? data : []);
      setPlans(items);
    } catch (err) {
      console.warn('Failed to fetch subscriptions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleSubscribe = async () => {
    if (!deliveryAddress.trim()) {
      alert('Please enter a delivery address');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiPost('/subscription/subscribe', {
        planId: selectedPlan.id,
        deliveryAddress
      });

      if (data && (data.success || data.id)) {
        setSubscribed(true);
        setTimeout(() => {
          setShowModal(false);
          setSubscribed(false);
          setDeliveryAddress('');
          setSelectedPlan(null);
        }, 2000);
      } else {
        alert('Subscription failed. Please try again.');
      }
    } catch (err) {
      console.warn('Checkout error:', err);
      alert('Network error occurred during checkout.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPlans = useMemo(() => {
    if (!searchTerm) return plans;
    const q = searchTerm.toLowerCase();
    return plans.filter(p => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.provider_name || '').toLowerCase().includes(q)
    );
  }, [plans, searchTerm]);

  const renderPlanCard = ({ item }) => (
    <View style={s.s0}>
      <View style={s.s1}>
        <View style={s.s2}>
          <Text style={s.s3}>{item.icon || '📦'}</Text>
        </View>
        <View style={s.s4}>
          <Text style={s.s5}>{item.schedule || 'Daily'}</Text>
        </View>
      </View>

      <Text style={s.s6}>{item.name}</Text>
      <Text style={s.s7}>By {item.provider_name}</Text>

      <View style={s.s8}>
        <View style={s.s9}>
          <ShoppingBag size={14} color="#10b981" style={{ marginRight: 8 }} />
          <Text style={s.s10} numberOfLines={1}>{item.description || 'Assorted Items'}</Text>
        </View>
        <View style={s.s11}>
          <Clock size={14} color="#3b82f6" style={{ marginRight: 8 }} />
          <Text style={s.s12}>Delivery: {item.delivery_time || 'Morning'}</Text>
        </View>
      </View>

      <View style={s.s13}>
        <View>
          <Text style={s.s14}>Starting at</Text>
          <View style={s.s15}>
            <Text style={s.s16}>₹{item.price || 0}</Text>
            <Text style={s.s17}>/{item.schedule === 'Daily' ? 'day' : 'cycle'}</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => { setSelectedPlan(item); setShowModal(true); }}
          style={s.s18}
        >
          <Text style={s.s19}>Subscribe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={s.s20}>
      {/* Header */}
      <View style={s.s21}>
        <TouchableOpacity onPress={() => router.back()} style={s.s22}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s23}>Marketplace</Text>
      </View>

      {/* Hero & Search */}
      <View style={s.s24}>
        <Text style={s.s25}>
          Daily <Text style={s.s26}>Essentials</Text>
        </Text>
        <Text style={s.s27}>Subscribe to milk, bread, groceries, and tiffins directly to your door.</Text>
        
        <View style={s.s28}>
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Search for milk, tiffin, veggies..."
            placeholderTextColor="#64748b"
            value={searchTerm}
            onChangeText={setSearchTerm}
            style={s.s29}
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={s.s30}>
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : filteredPlans.length === 0 ? (
        <View style={s.s31}>
          <Package size={64} color="#334155" />
          <Text style={s.s32}>No Plans Found</Text>
          <Text style={s.s33}>There are no subscription plans matching your search in this area.</Text>
        </View>
      ) : (
        <FlashList estimatedItemSize={100}
          data={filteredPlans}
          keyExtractor={item => item.id?.toString() || Math.random().toString()}
          renderItem={renderPlanCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Checkout Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={s.s34}>
          <View style={s.s35}>
            {!subscribed && selectedPlan ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View style={s.s36}>
                  <Text style={s.s37}>Checkout</Text>
                  <TouchableOpacity onPress={() => !submitting && setShowModal(false)} style={s.s38}>
                    <Text style={s.s39}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Plan Summary */}
                <View style={s.s40}>
                  <Text style={s.s41}>Plan Summary</Text>
                  <Text style={s.s42}>{selectedPlan.name}</Text>
                  <Text style={s.s43}>By {selectedPlan.provider_name}</Text>
                  <View style={s.s44}>
                    <Text style={s.s45}>Total Price</Text>
                    <Text style={s.s46}>₹{selectedPlan.price} / {selectedPlan.schedule || 'Daily'}</Text>
                  </View>
                </View>

                {/* Address Form */}
                <Text style={s.s47}>Delivery Address</Text>
                <TextInput
                  placeholder="Enter full flat, building, and street address..."
                  placeholderTextColor="#64748b"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  multiline
                  textAlignVertical="top"
                  style={s.s48}
                />

                <TouchableOpacity 
                  onPress={handleSubscribe} 
                  disabled={submitting}
                  style={[s.s54, submitting ? s.s55 : s.s56]}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={s.s49}>Confirm & Subscribe</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={s.s50}>
                <View style={s.s51}>
                  <CheckCircle2 size={48} color="#34d399" />
                </View>
                <Text style={s.s52}>Subscribed!</Text>
                <Text style={s.s53}>Your recurring deliveries will begin shortly.</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 20, marginBottom: 16, marginHorizontal: 16 },
  s1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  s2: { width: 48, height: 48, backgroundColor: '#1e293b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
  s3: { fontSize: 20 },
  s4: { backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  s5: { color: '#34d399', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  s6: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 4 },
  s7: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  s8: { gap: 8, marginBottom: 20, flexDirection: 'column' },
  s9: { flexDirection: 'row', alignItems: 'center' },
  s10: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  s11: { flexDirection: 'row', alignItems: 'center' },
  s12: { color: '#cbd5e1', fontSize: 14, flex: 1 },
  s13: { borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  s14: { color: '#64748b', fontSize: 12, fontWeight: '500', marginBottom: 2 },
  s15: { flexDirection: 'row', alignItems: 'baseline' },
  s16: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  s17: { color: '#94a3b8', fontSize: 12, marginLeft: 4 },
  s18: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  s19: { color: '#ffffff', fontWeight: '700' },
  s20: { flex: 1, backgroundColor: '#020617' },
  s21: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  s22: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s23: { color: '#ffffff', fontSize: 20, fontWeight: '900', flex: 1 },
  s24: { paddingHorizontal: 16, paddingBottom: 24, borderBottomWidth: 1, borderColor: '#0f172a', marginBottom: 8 },
  s25: { fontSize: 30, fontWeight: '900', color: '#ffffff', marginBottom: 8 },
  s26: { color: '#34d399' },
  s27: { color: '#94a3b8', fontSize: 14, marginBottom: 24 },
  s28: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  s29: { flex: 1, color: '#ffffff', marginLeft: 12, fontSize: 16 },
  s30: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  s31: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  s32: { color: '#ffffff', fontSize: 20, fontWeight: '700', marginBottom: 8 },
  s33: { color: '#64748b', textAlign: 'center' },
  s34: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  s35: { backgroundColor: '#020617', borderTopWidth: 1, borderColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '80%' },
  s36: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  s37: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  s38: { padding: 8, backgroundColor: '#0f172a', borderRadius: 9999 },
  s39: { color: '#94a3b8', fontWeight: '700', fontSize: 18 },
  s40: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 20, marginBottom: 24 },
  s41: { color: '#34d399', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 4 },
  s42: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 4 },
  s43: { color: '#94a3b8', fontSize: 14, marginBottom: 16 },
  s44: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderColor: '#1e293b' },
  s45: { color: '#94a3b8' },
  s46: { color: '#34d399', fontWeight: '700' },
  s47: { color: '#94a3b8', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  s48: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 16, color: '#ffffff', minHeight: 100, marginBottom: 32 },
  s49: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s50: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  s51: { width: 96, height: 96, backgroundColor: 'rgba(16,185,129,0.2)', borderRadius: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
  s52: { fontSize: 30, fontWeight: '900', color: '#ffffff', marginBottom: 12 },
  s53: { color: '#94a3b8', textAlign: 'center', fontSize: 18 },
  s54: { paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  s55: { backgroundColor: '#065f46' },
  s56: { backgroundColor: '#059669' },
});
