import { Image } from 'expo-image';
import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, PlusCircle, Search, MapPin, Bed, Bath, Maximize2 } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MOCK_PROPERTIES = [
  { id: '1', title: '2 BHK in Ganga Aria', location: 'Dhanori, Pune', price: '₹18,000/mo', type: 'Rent', beds: 2, baths: 2, sqft: 950, image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&q=80&w=400' },
  { id: '2', title: '3 BHK Premium Flat', location: 'Pride Aashiyana, Lohegaon', price: '₹85 L', type: 'Buy', beds: 3, baths: 3, sqft: 1200, image: 'https://images.unsplash.com/photo-1502672260266-1c1de2d92004?auto=format&fit=crop&q=80&w=400' },
  { id: '3', title: '1 BHK Fully Furnished', location: 'Tingre Nagar', price: '₹14,000/mo', type: 'Rent', beds: 1, baths: 1, sqft: 600, image: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=400' }
];

export default function PropertySearchScreen() {
  const navigation = useNavigation();
  const [filter, setFilter] = useState('All'); // All, Rent, Buy
  const [search, setSearch] = useState('');

  const filteredProperties = MOCK_PROPERTIES.filter(p => {
    if (filter !== 'All' && p.type !== filter) return false;
    if (search && !p.location.toLowerCase().includes(search.toLowerCase()) && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const renderItem = ({ item }) => (
    <TouchableOpacity className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden mb-5 shadow-lg shadow-slate-950">
      <Image source={item.image} className="w-full h-44" contentFit="cover" transition={200} />
      <View className="absolute top-3 left-3 bg-slate-950/80 border border-slate-800 px-3 py-1 rounded-lg">
        <Text className="text-sky-400 font-bold text-xs">{item.type}</Text>
      </View>
      <View className="p-4">
        <Text className="text-2xl font-black text-emerald-400 mb-1">{item.price}</Text>
        <Text className="text-white font-bold text-base mb-1" numberOfLines={1}>{item.title}</Text>
        <View className="flex-row items-center mb-4">
          <MapPin size={14} color="#94a3b8" className="mr-1" />
          <Text className="text-slate-400 text-xs font-semibold">{item.location}</Text>
        </View>
        <View className="flex-row justify-between border-t border-slate-800 pt-3">
          <View className="flex-row items-center gap-1.5"><Bed size={16} color="#94a3b8" /><Text className="text-slate-300 text-xs font-bold">{item.beds} Bed</Text></View>
          <View className="flex-row items-center gap-1.5"><Bath size={16} color="#94a3b8" /><Text className="text-slate-300 text-xs font-bold">{item.baths} Bath</Text></View>
          <View className="flex-row items-center gap-1.5"><Maximize2 size={16} color="#94a3b8" /><Text className="text-slate-300 text-xs font-bold">{item.sqft} sqft</Text></View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-slate-900 rounded-full border border-slate-800">
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-black text-lg">Real Estate</Text>
        <TouchableOpacity onPress={() => navigation.navigate('screens/properties/PropertyListing')} className="p-2 bg-slate-900 rounded-full border border-slate-800">
          <PlusCircle size={20} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View className="p-4">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-2xl px-4 py-3 mb-4">
          <Search size={20} color="#64748b" className="mr-3" />
          <TextInput 
            className="flex-1 text-white font-medium text-sm"
            placeholder="Search localities, societies..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        
        <View className="flex-row gap-2">
          {['All', 'Rent', 'Buy'].map(tab => (
            <TouchableOpacity 
              key={tab} 
              className={`px-5 py-2.5 rounded-full border ${filter === tab ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
              onPress={() => setFilter(tab)}
            >
              <Text className={`font-bold text-xs ${filter === tab ? 'text-white' : 'text-slate-400'}`}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList 
        data={filteredProperties}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}
