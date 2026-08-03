import { Image } from 'expo-image';
import React, { useState, memo, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, TextInput , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, PlusCircle, Search, MapPin, Bed, Bath, Maximize2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_PROPERTIES = [
  { id: '1', title: '2 BHK in Ganga Aria', location: 'Dhanori, Pune', price: '₹18,000/mo', type: 'Rent', beds: 2, baths: 2, sqft: 950, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400' },
  { id: '2', title: '3 BHK Premium Flat', location: 'Pride Aashiyana, Lohegaon', price: '₹85 L', type: 'Buy', beds: 3, baths: 3, sqft: 1200, image: 'https://images.unsplash.com/photo-1502672260266-1c1de2d92004?auto=format&fit=crop&q=80&w=400' },
  { id: '3', title: '1 BHK Fully Furnished', location: 'Tingre Nagar', price: '₹14,000/mo', type: 'Rent', beds: 1, baths: 1, sqft: 600, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=400' }
];

const PropertyItem = memo(({ item }) => (
  <TouchableOpacity style={s.s0}>
    <Image source={item.image} style={s.s1} contentFit="cover" transition={200} />
    <View style={s.s2}>
      <Text style={s.s3}>{item.type}</Text>
    </View>
    <View style={s.s4}>
      <Text style={s.s5}>{item.price}</Text>
      <Text style={s.s6} numberOfLines={1}>{item.title}</Text>
      <View style={s.s7}>
        <MapPin size={14} color="#94a3b8" />
        <Text style={s.s8}>{item.location}</Text>
      </View>
      <View style={s.s9}>
        <View style={s.s10}><Bed size={16} color="#94a3b8" /><Text style={s.s11}>{item.beds} Bed</Text></View>
        <View style={s.s12}><Bath size={16} color="#94a3b8" /><Text style={s.s13}>{item.baths} Bath</Text></View>
        <View style={s.s14}><Maximize2 size={16} color="#94a3b8" /><Text style={s.s15}>{item.sqft} sqft</Text></View>
      </View>
    </View>
  </TouchableOpacity>
), (prevProps, nextProps) => prevProps.item.id === nextProps.item.id);

export default function PropertySearchScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const filteredProperties = useMemo(() => {
    return MOCK_PROPERTIES.filter(p => {
      if (filter !== 'All' && p.type !== filter) return false;
      if (search && !p.location.toLowerCase().includes(search.toLowerCase()) && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [filter, search]);

  const renderItem = useCallback(({ item }) => (
    <PropertyItem item={item} />
  ), []);

  return (
    <SafeAreaView style={s.s16}>
      <View style={s.s17}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.s18}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.s19}>Real Estate</Text>
        <TouchableOpacity onPress={() => navigation.navigate('screens/properties/PropertyListing')} style={s.s20}>
          <PlusCircle size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={s.s21}>
        <View style={s.s22}>
          <Search size={20} color="#64748b" />
          <TextInput 
            style={s.s23}
            placeholder="Search localities, societies..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <View style={s.s24}>
          {['All', 'Rent', 'Buy'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              style={[s.s26, filter === tab ? s.s27 : s.s28]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[s.s29, filter === tab ? s.s30 : s.s31]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={s.s25}>
        <FlashList 
          data={filteredProperties}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          estimatedItemSize={285}
        />
      </View>

    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, overflow: 'hidden', marginBottom: 20 },
  s1: { width: '100%', height: 176 },
  s2: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(2,6,23,0.8)', borderWidth: 1, borderColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  s3: { color: '#38bdf8', fontWeight: '700', fontSize: 12 },
  s4: { padding: 16 },
  s5: { fontSize: 24, fontWeight: '900', color: '#34d399', marginBottom: 4 },
  s6: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  s7: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  s8: { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  s9: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 12 },
  s10: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  s11: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  s12: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  s13: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  s14: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  s15: { color: '#cbd5e1', fontSize: 12, fontWeight: '700' },
  s16: { flex: 1, backgroundColor: '#020617' },
  s17: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a' },
  s18: { padding: 8, backgroundColor: '#0f172a', borderRadius: 9999, borderWidth: 1, borderColor: '#1e293b' },
  s19: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  s20: { padding: 8, backgroundColor: '#0f172a', borderRadius: 9999, borderWidth: 1, borderColor: '#1e293b' },
  s21: { padding: 16, zIndex: 10 },
  s22: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 16 },
  s23: { flex: 1, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  s24: { flexDirection: 'row', gap: 8 },
  s25: { flex: 1, width: '100%', height: '100%' },
  s26: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 9999, borderWidth: 1 },
  s27: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  s28: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s29: { fontWeight: '700', fontSize: 12 },
  s30: { color: '#ffffff' },
  s31: { color: '#94a3b8' },
});
