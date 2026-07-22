import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Wrench, Zap, Home, Shield, Star, Clock } from 'lucide-react-native';
import { apiGet, apiPost } from '../../lib/api';

export default function NativeHomeServicesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    async function loadServices() {
      try {
        const dataCat = await apiGet('/home-services/categories');
        if (dataCat && dataCat.categories && dataCat.categories.length > 0) {
          setCategories(dataCat.categories);
        }

        const dataProv = await apiGet('/home-services/providers');
        if (dataProv && dataProv.providers && dataProv.providers.length > 0) {
          setProviders(dataProv.providers);
        }
      } catch (e) {
        // Fallback local dataset
        setCategories([
          { id: 'c1', name: 'Plumbing', icon: 'Wrench', base_inspection_fee: 199 },
          { id: 'c2', name: 'Electrical Repair', icon: 'Zap', base_inspection_fee: 149 },
          { id: 'c3', name: 'Home Deep Clean', icon: 'Home', base_inspection_fee: 299 }
        ]);
        setProviders([
          { id: 'p1', name: 'Ramesh Plumbers & Sanitation', rating: 4.8, experience_years: 6, phone: '+91 98220 11223' },
          { id: 'p2', name: 'Baner Electrical Solutions', rating: 4.9, experience_years: 8, phone: '+91 99341 88219' }
        ]);
      } finally {
        setLoading(false);
      }
    }
    loadServices();
  }, []);

  const handleBook = (provider) => {
    Alert.alert(
      'Book Inspection Slot',
      `Book inspection slot with ${provider.name}? Inspection deposit fee will be deducted from your LocalWallet.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Confirm Booking', 
          onPress: async () => {
            try {
              const res = await apiPost('/home-services/bookings', {
                providerId: provider.id || 'p1',
                categoryId: selectedCategory || 'c1',
                bookingDate: new Date().toISOString().split('T')[0],
                timeSlot: '10:00 AM - 12:00 PM',
                serviceAddress: 'Customer Saved Address',
                problemDescription: 'Technician Inspection Request'
              });
              Alert.alert('Success 🎉', res.message || 'Technician booked successfully!');
            } catch (err) {
              Alert.alert('Booking Notice', err.message || 'Booking placed locally.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Header */}
      <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full items-center justify-center">
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">On-Demand Home Services</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-4">
        {/* Banner */}
        <View className="bg-indigo-950 border border-indigo-800 p-4 rounded-2xl mb-6">
          <View className="flex-row items-center gap-2 mb-1">
            <Shield color="#818cf8" size={18} />
            <Text className="text-indigo-300 font-bold">LocalSampark Certified Technicians</Text>
          </View>
          <Text className="text-slate-400 text-xs">Standardized ₹149 - ₹299 inspection fee. Remaining repair charges settled post-work.</Text>
        </View>

        {/* Categories */}
        <Text className="text-slate-400 font-bold text-xs uppercase mb-3">Service Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 mb-6">
          {categories.map(c => (
            <TouchableOpacity 
              key={c.id}
              onPress={() => setSelectedCategory(c.id)}
              className={`p-4 rounded-2xl border ${selectedCategory === c.id ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-800'} items-center min-w-[110px]`}
            >
              <Wrench color="#f8fafc" size={24} />
              <Text className="text-white font-bold text-xs mt-2">{c.name}</Text>
              <Text className="text-slate-400 text-[10px] mt-0.5">₹{c.base_inspection_fee} Fee</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Providers */}
        <Text className="text-slate-400 font-bold text-xs uppercase mb-3">Verified Technicians Near You</Text>
        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : (
          providers.map(p => (
            <View key={p.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
              <View className="flex-1">
                <Text className="text-white font-bold text-base">{p.name}</Text>
                <View className="flex-row items-center gap-2 mt-1">
                  <View className="flex-row items-center bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                    <Star color="#4ade80" size={12} />
                    <Text className="text-emerald-400 text-xs font-bold ml-1">{p.rating || '4.8'}</Text>
                  </View>
                  <Text className="text-slate-400 text-xs">{p.experience_years || 5} yrs exp</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleBook(p)} className="bg-indigo-600 px-4 py-2 rounded-xl">
                <Text className="text-white font-bold text-xs">Book Slot</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
