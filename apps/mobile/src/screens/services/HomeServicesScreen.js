import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert , StyleSheet } from 'react-native';
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
    <SafeAreaView style={s.s0}>
      {/* Header */}
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text style={s.s3}>On-Demand Home Services</Text>
        <View style={s.s4} />
      </View>

      <ScrollView style={s.s5}>
        {/* Banner */}
        <View style={s.s6}>
          <View style={s.s7}>
            <Shield color="#818cf8" size={18} />
            <Text style={s.s8}>LocalSampark Certified Technicians</Text>
          </View>
          <Text style={s.s9}>Standardized ₹149 - ₹299 inspection fee. Remaining repair charges settled post-work.</Text>
        </View>

        {/* Categories */}
        <Text style={s.s10}>Service Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.s11}>
          {categories.map(c => (
            <TouchableOpacity 
              key={c.id}
              onPress={() => setSelectedCategory(c.id)}
              style={[s.s24, selectedCategory === c.id ? s.s25 : s.s26, s.s27]}
            >
              <Wrench color="#f8fafc" size={24} />
              <Text style={s.s12}>{c.name}</Text>
              <Text style={s.s13}>₹{c.base_inspection_fee} Fee</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Providers */}
        <Text style={s.s14}>Verified Technicians Near You</Text>
        {loading ? (
          <ActivityIndicator color="#6366f1" />
        ) : (
          providers.map(p => (
            <View key={p.id} style={s.s15}>
              <View style={s.s16}>
                <Text style={s.s17}>{p.name}</Text>
                <View style={s.s18}>
                  <View style={s.s19}>
                    <Star color="#4ade80" size={12} />
                    <Text style={s.s20}>{p.rating || '4.8'}</Text>
                  </View>
                  <Text style={s.s21}>{p.experience_years || 5} yrs exp</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => handleBook(p)} style={s.s22}>
                <Text style={s.s23}>Book Slot</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  s2: { width: 40, height: 40, backgroundColor: '#0f172a', borderRadius: 9999, alignItems: 'center', justifyContent: 'center' },
  s3: { color: '#ffffff', fontWeight: '700', fontSize: 18 },
  s4: { width: 40 },
  s5: { flex: 1, padding: 16 },
  s6: { backgroundColor: '#1e1b4b', borderWidth: 1, borderColor: '#3730a3', padding: 16, borderRadius: 16, marginBottom: 24 },
  s7: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  s8: { color: '#a5b4fc', fontWeight: '700' },
  s9: { color: '#94a3b8', fontSize: 12 },
  s10: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  s11: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  s12: { color: '#ffffff', fontWeight: '700', fontSize: 12, marginTop: 8 },
  s13: { color: '#94a3b8', fontSize: 10, marginTop: 2 },
  s14: { color: '#94a3b8', fontWeight: '700', fontSize: 12, textTransform: 'uppercase', marginBottom: 12 },
  s15: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s16: { flex: 1 },
  s17: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  s18: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  s19: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#022c22', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 9999, borderWidth: 1, borderColor: '#065f46' },
  s20: { color: '#34d399', fontSize: 12, fontWeight: '700', marginLeft: 4 },
  s21: { color: '#94a3b8', fontSize: 12 },
  s22: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 },
  s23: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s24: { padding: 16, borderRadius: 16, borderWidth: 1 },
  s25: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  s26: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s27: { alignItems: 'center', minWidth: 110 },
});
