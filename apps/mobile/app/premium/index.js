import React, { useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, Platform, ActivityIndicator } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black">Premium</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        
        {/* Hero Section */}
        <View className="items-center px-4 py-8 relative">
          {/* Decorative Glow */}
          <View className="absolute top-10 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl" />
          
          <View className="w-20 h-20 bg-purple-600 rounded-3xl items-center justify-center mb-6 shadow-lg shadow-purple-900 border border-purple-500">
            <Crown size={40} color="#fff" />
          </View>
          
          <Text className="text-4xl font-black text-white mb-4 text-center">
            Sampark<Text className="text-purple-500">Plus</Text>
          </Text>
          
          <Text className="text-slate-400 text-center text-base px-6">
            Elevate your local experience. Zero convenience fees, free deliveries, and exclusive neighborhood deals.
          </Text>
        </View>

        <View className="px-4 mt-4 space-y-6 flex-col gap-6">
          
          {/* Basic Plan */}
          <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-sm">
            <Text className="text-xl font-bold text-slate-400 mb-2">Basic Member</Text>
            <View className="flex-row items-baseline mb-6">
              <Text className="text-4xl font-black text-white">₹0</Text>
              <Text className="text-slate-500 font-bold ml-2">/ forever</Text>
            </View>

            <View className="space-y-4 mb-8 flex-col gap-4">
              {['Access all local shops', 'Standard delivery fees (₹30-50)', 'Community forum access', 'Earn base SamparkCoins', 'Basic support'].map((feature, i) => (
                <View key={i} className="flex-row items-center">
                  <CheckCircle2 size={20} color="#10b981" style={{ marginRight: 12 }} />
                  <Text className="text-slate-300 font-medium text-sm flex-1">{feature}</Text>
                </View>
              ))}
            </View>

            <View className="py-4 rounded-2xl border border-slate-700 bg-slate-800/50 items-center">
              <Text className="text-slate-400 font-bold">Current Plan</Text>
            </View>
          </View>

          {/* Premium Plan */}
          <View className="bg-slate-900 border-2 border-purple-500 rounded-3xl p-6 shadow-2xl shadow-purple-900/40 relative">
            
            <View className="absolute -top-3.5 self-center bg-purple-600 px-4 py-1 rounded-full shadow-lg">
              <Text className="text-white text-xs font-bold uppercase tracking-widest">Recommended</Text>
            </View>

            <View className="flex-row items-center mb-2 mt-4">
              <Crown size={20} color="#a855f7" style={{ marginRight: 8 }} />
              <Text className="text-xl font-bold text-purple-500">SamparkPlus</Text>
            </View>

            <View className="flex-row items-baseline mb-6">
              <Text className="text-5xl font-black text-white">₹199</Text>
              <Text className="text-slate-400 font-bold ml-2">/ month</Text>
            </View>

            <View className="space-y-4 mb-8 flex-col gap-4">
              {[
                { text: 'Zero convenience fees on bills', icon: Percent },
                { text: 'Free delivery on orders ₹500+', icon: Truck },
                { text: 'Premium verified badge', icon: ShieldCheck },
                { text: 'Exclusive flash deals (Save up to 40%)', icon: Star },
                { text: '2x SamparkCoins earning rate', icon: Zap }
              ].map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <View key={i} className="flex-row items-center">
                    <View className="w-8 h-8 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                      <Icon size={16} color="#a855f7" />
                    </View>
                    <Text className="text-white font-bold text-sm flex-1">{feature.text}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity 
              onPress={handleUpgrade}
              disabled={loading}
              className="py-4 rounded-2xl bg-purple-600 items-center shadow-lg shadow-purple-900 flex-row justify-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-black text-lg">Upgrade to Plus</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>

        {/* Exclusive Deals */}
        <View className="mt-12 px-4">
          <Text className="text-2xl font-black text-white text-center mb-2">Exclusive Plus Deals</Text>
          <Text className="text-slate-400 text-center mb-8">Available only for SamparkPlus members in Dhanori.</Text>

          <View className="space-y-4 flex-col gap-4">
            {[
              { shop: 'FreshMart Supermarket', offer: 'Flat 15% OFF', desc: 'On all groceries above ₹1000' },
              { shop: 'Glow Salon & Spa', offer: 'Buy 1 Get 1', desc: 'On all premium haircuts and styling' },
              { shop: 'Dhanori Diagnostics', offer: 'Free Home Collection', desc: 'Plus 10% discount on total bill' },
            ].map((deal, i) => (
              <View key={i} className="bg-slate-900 border border-purple-500/30 rounded-2xl p-5 overflow-hidden relative">
                <View className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full" />
                <View className="bg-purple-500/20 px-3 py-1 rounded-full self-start mb-3 border border-purple-500/40">
                  <Text className="text-purple-400 text-[10px] font-bold uppercase tracking-wide">Plus Exclusive</Text>
                </View>
                <Text className="text-2xl font-black text-white mb-1">{deal.offer}</Text>
                <Text className="font-bold text-slate-300 text-sm mb-1">{deal.shop}</Text>
                <Text className="text-xs text-slate-500">{deal.desc}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}