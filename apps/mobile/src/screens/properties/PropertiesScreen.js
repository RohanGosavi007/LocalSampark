import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building, Lock, Phone, MapPin, CheckCircle, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiGet } from '../../lib/api';

const PropertyItem = memo(({ item, unlocked, onUnlock }) => (
  <View className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-4">
    {item.is_featured && (
      <View className="bg-emerald-950 border border-emerald-800 self-start px-3 py-1 rounded-full mb-3 flex-row items-center">
        <Sparkles color="#34d399" size={12} className="mr-1" />
        <Text className="text-emerald-400 font-bold text-[10px]">FEATURED DIRECT OWNER</Text>
      </View>
    )}

    <Text className="text-white font-black text-lg mb-1">{item.title}</Text>
    
    <View className="flex-row items-center mb-3">
      <MapPin color="#94a3b8" size={14} className="mr-1" />
      <Text className="text-slate-400 text-xs">{item.location}</Text>
    </View>

    <View className="flex-row justify-between items-center bg-slate-950 p-3 rounded-xl mb-4 border border-slate-800/80">
      <View>
        <Text className="text-slate-400 text-[10px] uppercase font-bold">Monthly Rent</Text>
        <Text className="text-indigo-400 font-black text-base">{item.rent}</Text>
      </View>
      <View>
        <Text className="text-slate-400 text-[10px] uppercase font-bold">Deposit</Text>
        <Text className="text-slate-200 font-bold text-xs">{item.deposit}</Text>
      </View>
      <View>
        <Text className="text-slate-400 text-[10px] uppercase font-bold">Specs</Text>
        <Text className="text-slate-300 font-medium text-xs">{item.specs}</Text>
      </View>
    </View>

    {/* Contact Area */}
    {unlocked ? (
      <View className="bg-indigo-950/80 border border-indigo-500/50 p-3 rounded-xl flex-row items-center justify-between">
        <View>
          <Text className="text-indigo-300 font-bold text-xs">{unlocked.name}</Text>
          <Text className="text-white font-black text-sm">{unlocked.phone}</Text>
        </View>
        <View className="bg-emerald-600 p-2 rounded-full">
          <CheckCircle color="#fff" size={18} />
        </View>
      </View>
    ) : (
      <TouchableOpacity
        onPress={() => onUnlock(item)}
        activeOpacity={0.8}
        className="bg-indigo-600 p-3.5 rounded-xl flex-row items-center justify-center border border-indigo-400/30"
      >
        <Lock color="#fff" size={16} className="mr-2" />
        <Text className="text-white font-bold text-xs">Unlock Owner Phone (₹49)</Text>
      </TouchableOpacity>
    )}
  </View>
), (prevProps, nextProps) => prevProps.item.id === nextProps.item.id && prevProps.unlocked === nextProps.unlocked);

export default function NativepropertiesScreen() {
  const router = useRouter();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [unlockedLeads, setUnlockedLeads] = useState({});

  useEffect(() => {
    let isMounted = true;
    async function loadProperties() {
      try {
        const data = await apiGet('/properties');
        if (isMounted && data.properties && data.properties.length > 0) {
          setProperties(data.properties.map(p => ({
            id: p.id,
            title: p.title,
            rent: `₹${Number(p.price).toLocaleString()}/mo`,
            deposit: `₹${Number(p.deposit || 0).toLocaleString()}`,
            location: p.address,
            specs: `${p.property_type} • Available`,
            is_featured: p.is_verified === 1,
            type: p.property_type,
            owner_name: 'Verified Owner',
            phone_masked: '+91 98*** *****'
          })));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Properties API offline, using fallback data:', e.message);
      }

      if (isMounted) {
        setProperties([
          {
            id: 'prop_101',
            title: 'Spacious 2 BHK Apartment',
            rent: '₹18,500/mo',
            deposit: '₹50,000',
            location: 'Ganga New Town, Dhanori, Pune',
            specs: '2 Bed • 2 Bath • 1050 sqft',
            is_featured: true,
            type: '2 BHK',
            owner_name: 'Amit Deshmukh',
            phone_masked: '+91 98*** *****'
          }
        ]);
        setLoading(false);
      }
    }
    loadProperties();
    return () => { isMounted = false; };
  }, []);

  const handleUnlockLead = useCallback((property) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Unlock Lead Contact',
      `Unlock full contact info for ${property.owner_name} for ₹49? Fee will be deducted from your LocalSampark Wallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock (₹49)',
          onPress: () => {
            setUnlockedLeads(prev => ({
              ...prev,
              [property.id]: {
                name: property.owner_name,
                phone: '+91 98765 43210',
                email: 'owner@localsampark.com'
              }
            }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Success 🎉', `Lead Unlocked!\nOwner: ${property.owner_name}\nPhone: +91 98765 43210`);
          }
        }
      ]
    );
  }, []);

  const filtered = useMemo(() => {
    return properties.filter(p => selectedFilter === 'All' || p.type === selectedFilter);
  }, [properties, selectedFilter]);

  const renderItem = useCallback(({ item }) => (
    <PropertyItem 
      item={item} 
      unlocked={unlockedLeads[item.id]} 
      onUnlock={handleUnlockLead} 
    />
  ), [unlockedLeads, handleUnlockLead]);

  const ListHeader = useCallback(() => (
    <View className="mb-4">
      {/* Banner */}
      <View className="bg-gradient-to-r from-indigo-900 to-slate-900 p-5 rounded-3xl mb-6 border border-indigo-500/30">
        <View className="flex-row items-center mb-2">
          <Building color="#818cf8" size={24} className="mr-2" />
          <Text className="text-white text-lg font-black">Pay-Per-Lead Verified</Text>
        </View>
        <Text className="text-indigo-200 text-xs leading-5">No brokers. No 1-month brokerage fees. Pay ₹49 to unlock direct owner contact numbers.</Text>
      </View>
      <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs">Available Rental Properties ({filtered.length})</Text>
    </View>
  ), [filtered.length]);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Top Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-xl font-black">Zero-Broker Real Estate</Text>
          <Text className="text-slate-400 text-xs">Direct Owner Rentals & Sales in Dhanori</Text>
        </View>
      </View>

      {/* Category Pills */}
      <View className="py-3 px-4 bg-slate-900 border-b border-slate-800">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', '2 BHK', '3 BHK', 'PG', 'Commercial'].map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => { setSelectedFilter(filter); Haptics.selectionAsync(); }}
              className={`px-4 py-2 rounded-full mr-2 border ${selectedFilter === filter ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-950 border-slate-800'}`}
            >
              <Text className={`text-xs font-bold ${selectedFilter === filter ? 'text-white' : 'text-slate-400'}`}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
          <Text className="text-slate-500 mt-4 font-bold text-xs uppercase tracking-widest">Loading Properties...</Text>
        </View>
      ) : (
        <View className="flex-1 w-full">
          <FlashList
            data={filtered}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
            estimatedItemSize={206}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
