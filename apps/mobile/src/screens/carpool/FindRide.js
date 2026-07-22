import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { Search, MapPin, Navigation, Clock, Users, ShieldCheck, Leaf, Star } from 'lucide-react-native';
import { apiGet } from '../../lib/api';

export default function FindRide() {
  const [search, setSearch] = useState('');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, women, green

  useEffect(() => {
    async function loadRides() {
      try {
        const data = await apiGet('/carpool/rides');
        if (data && data.rides && data.rides.length > 0) {
          setRides(data.rides.map(r => ({
            id: r.id,
            driver: r.driver_name || 'Verified Member',
            from: r.origin_address || r.from_location,
            to: r.destination_address || r.to_location,
            time: r.departure_time || '09:00 AM',
            price: r.seat_price || r.price,
            seats: r.available_seats || r.seats,
            rating: 4.9,
            isVerified: true,
            isEV: Boolean(r.is_ev),
            isWomenOnly: Boolean(r.is_women_only)
          })));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('Carpool API offline, falling back to mock dataset:', e.message);
      }

      setRides([
        { id: '1', driver: 'Rahul S.', from: 'Hinjewadi Phase 1', to: 'Pune Station', time: '09:00 AM', price: 60, seats: 2, rating: 4.8, isVerified: true, isEV: false, isWomenOnly: false },
        { id: '2', driver: 'Priya M.', from: 'Wakad', to: 'Viman Nagar', time: '10:30 AM', price: 120, seats: 3, rating: 4.9, isVerified: true, isEV: true, isWomenOnly: true },
        { id: '3', driver: 'Amit K.', from: 'Baner', to: 'Magarpatta', time: '08:45 AM', price: 90, seats: 1, rating: 5.0, isVerified: true, isEV: false, isWomenOnly: false },
        { id: '4', driver: 'Sneha P.', from: 'Kothrud', to: 'Kharadi', time: '11:00 AM', price: 150, seats: 2, rating: 4.7, isVerified: true, isEV: true, isWomenOnly: true },
      ]);
      setLoading(false);
    }
    loadRides();
  }, []);

  const filteredRides = rides.filter(r => {
    const matchesSearch = r.from.toLowerCase().includes(search.toLowerCase()) || r.to.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (filter === 'women') return r.isWomenOnly;
    if (filter === 'green') return r.isEV;
    return true;
  });

  const renderRide = ({ item }) => (
    <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
      {/* Header */}
      <View className="flex-row justify-between items-start mb-4">
        <View className="flex-row items-center flex-1">
          <View className="w-12 h-12 rounded-full bg-blue-900/50 items-center justify-center border border-blue-500/30">
            <Text className="text-blue-400 font-bold text-lg">{item.driver.charAt(0)}</Text>
          </View>
          <View className="ml-3 flex-1">
            <View className="flex-row items-center gap-1">
              <Text className="text-white font-bold text-base">{item.driver}</Text>
              {item.isVerified && <ShieldCheck size={14} color="#3b82f6" />}
            </View>
            <View className="flex-row items-center gap-1 mt-0.5">
              <Star size={12} color="#fbbf24" fill="#fbbf24" />
              <Text className="text-slate-400 text-xs">{item.rating}</Text>
            </View>
          </View>
        </View>
        <Text className="text-emerald-400 font-black text-xl">₹{item.price}</Text>
      </View>

      {/* Badges */}
      <View className="flex-row flex-wrap gap-2 mb-4">
        {item.isWomenOnly && (
          <View className="bg-pink-500/10 border border-pink-500/30 px-2 py-1 rounded-md flex-row items-center gap-1">
            <ShieldCheck size={12} color="#ec4899" />
            <Text className="text-pink-400 text-xs font-bold">Women Only</Text>
          </View>
        )}
        {item.isEV && (
          <View className="bg-emerald-500/10 border border-emerald-500/30 px-2 py-1 rounded-md flex-row items-center gap-1">
            <Leaf size={12} color="#10b981" />
            <Text className="text-emerald-400 text-xs font-bold">Green Ride (EV)</Text>
          </View>
        )}
      </View>

      {/* Route */}
      <View className="mb-4 bg-slate-950 p-3 rounded-xl border border-slate-800">
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-blue-500 mr-3" />
          <Text className="text-slate-200 font-semibold">{item.from}</Text>
        </View>
        <View className="w-0.5 h-6 bg-slate-700 ml-1.5 my-1" />
        <View className="flex-row items-center">
          <View className="w-3 h-3 rounded-full bg-rose-500 mr-3" />
          <Text className="text-slate-200 font-semibold">{item.to}</Text>
        </View>
      </View>

      {/* Footer */}
      <View className="flex-row items-center justify-between border-t border-slate-800 pt-4">
        <View className="flex-row items-center gap-4">
          <View className="flex-row items-center gap-1.5">
            <Clock size={16} color="#94a3b8" />
            <Text className="text-slate-400 text-sm font-semibold">{item.time}</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Users size={16} color="#94a3b8" />
            <Text className="text-slate-400 text-sm font-semibold">{item.seats} Left</Text>
          </View>
        </View>
        
        <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg">
          <Text className="text-white font-bold">Request</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View className="flex-1">
      {/* Search Bar */}
      <View className="p-4 border-b border-slate-900">
        <View className="flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-4 h-12">
          <Search size={20} color="#64748b" />
          <TextInput 
            className="flex-1 ml-3 text-white text-base"
            placeholder="Where are you going?"
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filters */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4 py-3 border-b border-slate-900" contentContainerStyle={{ paddingRight: 24, gap: 10 }}>
          <TouchableOpacity 
            onPress={() => setFilter('all')}
            className={`px-4 py-2 rounded-full border ${filter === 'all' ? 'bg-blue-600 border-blue-500' : 'bg-slate-900 border-slate-800'}`}
          >
            <Text className={`font-bold ${filter === 'all' ? 'text-white' : 'text-slate-400'}`}>All Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('women')}
            className={`px-4 py-2 rounded-full border flex-row items-center gap-2 ${filter === 'women' ? 'bg-pink-600 border-pink-500' : 'bg-slate-900 border-slate-800'}`}
          >
            <ShieldCheck size={14} color={filter === 'women' ? '#fff' : '#94a3b8'} />
            <Text className={`font-bold ${filter === 'women' ? 'text-white' : 'text-slate-400'}`}>Women Only</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('green')}
            className={`px-4 py-2 rounded-full border flex-row items-center gap-2 ${filter === 'green' ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-800'}`}
          >
            <Leaf size={14} color={filter === 'green' ? '#fff' : '#94a3b8'} />
            <Text className={`font-bold ${filter === 'green' ? 'text-white' : 'text-slate-400'}`}>Green (EV)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRides}
          keyExtractor={item => item.id}
          renderItem={renderRide}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="items-center justify-center py-20">
              <Users size={48} color="#334155" />
              <Text className="text-slate-500 text-base mt-4 font-semibold text-center">No rides found for your search.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
