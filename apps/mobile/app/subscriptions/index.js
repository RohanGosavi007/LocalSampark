import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator, TextInput, Modal, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
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
    <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 mx-4 shadow-lg shadow-black/20">
      <View className="flex-row justify-between items-start mb-3">
        <View className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
          <Text className="text-xl">{item.icon || '📦'}</Text>
        </View>
        <View className="bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
          <Text className="text-emerald-400 text-xs font-bold uppercase">{item.schedule || 'Daily'}</Text>
        </View>
      </View>

      <Text className="text-white text-xl font-bold mb-1">{item.name}</Text>
      <Text className="text-slate-400 text-sm mb-4">By {item.provider_name}</Text>

      <View className="space-y-2 mb-5 flex-col gap-2">
        <View className="flex-row items-center">
          <ShoppingBag size={14} color="#10b981" style={{ marginRight: 8 }} />
          <Text className="text-slate-300 text-sm flex-1" numberOfLines={1}>{item.description || 'Assorted Items'}</Text>
        </View>
        <View className="flex-row items-center">
          <Clock size={14} color="#3b82f6" style={{ marginRight: 8 }} />
          <Text className="text-slate-300 text-sm flex-1">Delivery: {item.delivery_time || 'Morning'}</Text>
        </View>
      </View>

      <View className="border-t border-slate-800 pt-4 flex-row justify-between items-end">
        <View>
          <Text className="text-slate-500 text-xs font-medium mb-0.5">Starting at</Text>
          <View className="flex-row items-baseline">
            <Text className="text-2xl font-black text-white">₹{item.price || 0}</Text>
            <Text className="text-slate-400 text-xs ml-1">/{item.schedule === 'Daily' ? 'day' : 'cycle'}</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={() => { setSelectedPlan(item); setShowModal(true); }}
          className="bg-emerald-600 px-6 py-2.5 rounded-xl shadow-lg shadow-emerald-900"
        >
          <Text className="text-white font-bold">Subscribe</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center p-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black flex-1">Marketplace</Text>
      </View>

      {/* Hero & Search */}
      <View className="px-4 pb-6 border-b border-slate-900 mb-2">
        <Text className="text-3xl font-black text-white mb-2">
          Daily <Text className="text-emerald-400">Essentials</Text>
        </Text>
        <Text className="text-slate-400 text-sm mb-6">Subscribe to milk, bread, groceries, and tiffins directly to your door.</Text>
        
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 shadow-sm">
          <Search size={20} color="#64748b" />
          <TextInput
            placeholder="Search for milk, tiffin, veggies..."
            placeholderTextColor="#64748b"
            value={searchTerm}
            onChangeText={setSearchTerm}
            className="flex-1 text-white ml-3 text-base"
          />
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#10b981" />
        </View>
      ) : filteredPlans.length === 0 ? (
        <View className="flex-1 justify-center items-center p-6">
          <Package size={64} color="#334155" className="mb-4" />
          <Text className="text-white text-xl font-bold mb-2">No Plans Found</Text>
          <Text className="text-slate-500 text-center">There are no subscription plans matching your search in this area.</Text>
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
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1 justify-end bg-black/60">
          <View className="bg-slate-950 border-t border-slate-800 rounded-t-3xl p-6 h-[80%]">
            {!subscribed && selectedPlan ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
                <View className="flex-row justify-between items-center mb-6">
                  <Text className="text-2xl font-black text-white">Checkout</Text>
                  <TouchableOpacity onPress={() => !submitting && setShowModal(false)} className="p-2 bg-slate-900 rounded-full">
                    <Text className="text-slate-400 font-bold text-lg">✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Plan Summary */}
                <View className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
                  <Text className="text-emerald-400 text-xs font-bold uppercase mb-1">Plan Summary</Text>
                  <Text className="text-white font-bold text-lg mb-1">{selectedPlan.name}</Text>
                  <Text className="text-slate-400 text-sm mb-4">By {selectedPlan.provider_name}</Text>
                  <View className="flex-row justify-between pt-4 border-t border-slate-800">
                    <Text className="text-slate-400">Total Price</Text>
                    <Text className="text-emerald-400 font-bold">₹{selectedPlan.price} / {selectedPlan.schedule || 'Daily'}</Text>
                  </View>
                </View>

                {/* Address Form */}
                <Text className="text-slate-400 text-sm font-bold uppercase tracking-wider mb-3">Delivery Address</Text>
                <TextInput
                  placeholder="Enter full flat, building, and street address..."
                  placeholderTextColor="#64748b"
                  value={deliveryAddress}
                  onChangeText={setDeliveryAddress}
                  multiline
                  textAlignVertical="top"
                  className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white min-h-[100px] mb-8"
                />

                <TouchableOpacity 
                  onPress={handleSubscribe} 
                  disabled={submitting}
                  className={`py-4 rounded-xl items-center shadow-lg ${submitting ? 'bg-emerald-800' : 'bg-emerald-600'}`}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-bold text-lg">Confirm & Subscribe</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View className="flex-1 items-center justify-center pb-20">
                <View className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-6 border border-emerald-500/30">
                  <CheckCircle2 size={48} color="#34d399" />
                </View>
                <Text className="text-3xl font-black text-white mb-3">Subscribed!</Text>
                <Text className="text-slate-400 text-center text-lg">Your recurring deliveries will begin shortly.</Text>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}