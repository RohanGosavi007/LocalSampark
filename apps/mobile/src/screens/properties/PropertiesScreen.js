import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { ChevronLeft, Building, Lock, Phone, MapPin, CheckCircle, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiGet } from '../../lib/api';

const PropertyItem = memo(({ item, unlocked, onUnlock }) => (
  <View style={s.s0}>
    {item.is_featured && (
      <View style={s.s1}>
        <Sparkles color="#34d399" size={12} />
        <Text style={s.s2}>FEATURED DIRECT OWNER</Text>
      </View>
    )}

    <Text style={s.s3}>{item.title}</Text>
    
    <View style={s.s4}>
      <MapPin color="#94a3b8" size={14} />
      <Text style={s.s5}>{item.location}</Text>
    </View>

    <View style={s.s6}>
      <View>
        <Text style={s.s7}>Monthly Rent</Text>
        <Text style={s.s8}>{item.rent}</Text>
      </View>
      <View>
        <Text style={s.s9}>Deposit</Text>
        <Text style={s.s10}>{item.deposit}</Text>
      </View>
      <View>
        <Text style={s.s11}>Specs</Text>
        <Text style={s.s12}>{item.specs}</Text>
      </View>
    </View>

    {/* Contact Area */}
    {unlocked ? (
      <View style={s.s13}>
        <View>
          <Text style={s.s14}>{unlocked.name}</Text>
          <Text style={s.s15}>{unlocked.phone}</Text>
        </View>
        <View style={s.s16}>
          <CheckCircle color="#fff" size={18} />
        </View>
      </View>
    ) : (
      <TouchableOpacity
        onPress={() => onUnlock(item)}
        activeOpacity={0.8}
        style={s.s17}
      >
        <Lock color="#fff" size={16} />
        <Text style={s.s18}>Unlock Owner Phone (₹49)</Text>
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
    <View style={s.s19}>
      {/* Banner */}
      <View style={s.s20}>
        <View style={s.s21}>
          <Building color="#818cf8" size={24} />
          <Text style={s.s22}>Pay-Per-Lead Verified</Text>
        </View>
        <Text style={s.s23}>No brokers. No 1-month brokerage fees. Pay ₹49 to unlock direct owner contact numbers.</Text>
      </View>
      <Text style={s.s24}>Available Rental Properties ({filtered.length})</Text>
    </View>
  ), [filtered.length]);

  return (
    <SafeAreaView style={s.s25}>
      {/* Top Header */}
      <View style={s.s26}>
        <TouchableOpacity onPress={() => router.back()} style={s.s27}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={s.s28}>
          <Text style={s.s29}>Zero-Broker Real Estate</Text>
          <Text style={s.s30}>Direct Owner Rentals & Sales in Dhanori</Text>
        </View>
      </View>

      {/* Category Pills */}
      <View style={s.s31}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['All', '2 BHK', '3 BHK', 'PG', 'Commercial'].map(filter => (
            <TouchableOpacity
              key={filter}
              onPress={() => { setSelectedFilter(filter); Haptics.selectionAsync(); }}
              style={[s.s35, selectedFilter === filter ? s.s36 : s.s37]}
            >
              <Text style={[s.s38, selectedFilter === filter ? s.s39 : s.s40]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={s.s32}>
          <ActivityIndicator size="large" color="#6366f1" />
          <Text style={s.s33}>Loading Properties...</Text>
        </View>
      ) : (
        <View style={s.s34}>
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

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 16 },
  s1: { backgroundColor: '#022c22', borderWidth: 1, borderColor: '#065f46', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  s2: { color: '#34d399', fontWeight: '700', fontSize: 10 },
  s3: { color: '#ffffff', fontWeight: '900', fontSize: 18, marginBottom: 4 },
  s4: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  s5: { color: '#94a3b8', fontSize: 12 },
  s6: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#020617', padding: 12, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(30,41,59,0.8)' },
  s7: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
  s8: { color: '#818cf8', fontWeight: '900', fontSize: 16 },
  s9: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
  s10: { color: '#e2e8f0', fontWeight: '700', fontSize: 12 },
  s11: { color: '#94a3b8', fontSize: 10, textTransform: 'uppercase', fontWeight: '700' },
  s12: { color: '#cbd5e1', fontWeight: '500', fontSize: 12 },
  s13: { backgroundColor: 'rgba(30,27,75,0.8)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.5)', padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s14: { color: '#a5b4fc', fontWeight: '700', fontSize: 12 },
  s15: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  s16: { backgroundColor: '#059669', padding: 8, borderRadius: 9999 },
  s17: { backgroundColor: '#4f46e5', padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)' },
  s18: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s19: { marginBottom: 16 },
  s20: { padding: 20, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)' },
  s21: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  s22: { color: '#ffffff', fontSize: 18, fontWeight: '900' },
  s23: { color: '#c7d2fe', fontSize: 12, lineHeight: 5 },
  s24: { color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 },
  s25: { flex: 1, backgroundColor: '#020617' },
  s26: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  s27: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s28: { flex: 1 },
  s29: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  s30: { color: '#94a3b8', fontSize: 12 },
  s31: { paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s32: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  s33: { color: '#64748b', marginTop: 16, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  s34: { flex: 1, width: '100%' },
  s35: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, marginRight: 8, borderWidth: 1 },
  s36: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  s37: { backgroundColor: '#020617', borderColor: '#1e293b' },
  s38: { fontSize: 12, fontWeight: '700' },
  s39: { color: '#ffffff' },
  s40: { color: '#94a3b8' },
});
