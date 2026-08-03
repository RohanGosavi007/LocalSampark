import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView , StyleSheet } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Search, MapPin, Navigation, Clock, Users, ShieldCheck, Leaf, Star } from 'lucide-react-native';
import { apiGet } from '../../lib/api';

const RideItem = memo(({ item }) => (
  <View style={s.s0}>
    {/* Header */}
    <View style={s.s1}>
      <View style={s.s2}>
        <View style={s.s3}>
          <Text style={s.s4}>{item.driver.charAt(0)}</Text>
        </View>
        <View style={s.s5}>
          <View style={s.s6}>
            <Text style={s.s7}>{item.driver}</Text>
            {item.isVerified && <ShieldCheck size={14} color="#3b82f6" />}
          </View>
          <View style={s.s8}>
            <Star size={12} color="#fbbf24" fill="#fbbf24" />
            <Text style={s.s9}>{item.rating}</Text>
          </View>
        </View>
      </View>
      <Text style={s.s10}>₹{item.price}</Text>
    </View>

    {/* Badges */}
    <View style={s.s11}>
      {item.isWomenOnly && (
        <View style={s.s12}>
          <ShieldCheck size={12} color="#ec4899" />
          <Text style={s.s13}>Women Only</Text>
        </View>
      )}
      {item.isEV && (
        <View style={s.s14}>
          <Leaf size={12} color="#10b981" />
          <Text style={s.s15}>Green Ride (EV)</Text>
        </View>
      )}
    </View>

    {/* Route */}
    <View style={s.s16}>
      <View style={s.s17}>
        <View style={s.s18} />
        <Text style={s.s19}>{item.from}</Text>
      </View>
      <View style={s.s20} />
      <View style={s.s21}>
        <View style={s.s22} />
        <Text style={s.s23}>{item.to}</Text>
      </View>
    </View>

    {/* Footer */}
    <View style={s.s24}>
      <View style={s.s25}>
        <View style={s.s26}>
          <Clock size={16} color="#94a3b8" />
          <Text style={s.s27}>{item.time}</Text>
        </View>
        <View style={s.s28}>
          <Users size={16} color="#94a3b8" />
          <Text style={s.s29}>{item.seats} Left</Text>
        </View>
      </View>
      
      <TouchableOpacity style={s.s30}>
        <Text style={s.s31}>Request</Text>
      </TouchableOpacity>
    </View>
  </View>
), (prevProps, nextProps) => prevProps.item.id === nextProps.item.id);

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

  const filteredRides = useMemo(() => {
    return rides.filter(r => {
      const matchesSearch = r.from.toLowerCase().includes(search.toLowerCase()) || r.to.toLowerCase().includes(search.toLowerCase());
      if (!matchesSearch) return false;
      if (filter === 'women') return r.isWomenOnly;
      if (filter === 'green') return r.isEV;
      return true;
    });
  }, [rides, search, filter]);

  const renderRide = useCallback(({ item }) => (
    <RideItem item={item} />
  ), []);

  return (
    <View style={s.s32}>
      {/* Search Bar */}
      <View style={s.s33}>
        <View style={s.s34}>
          <Search size={20} color="#64748b" />
          <TextInput 
            style={s.s35}
            placeholder="Where are you going?"
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filters */}
      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.s36} contentContainerStyle={{ paddingRight: 24, gap: 10 }}>
          <TouchableOpacity 
            onPress={() => setFilter('all')}
            style={[s.s40, filter === 'all' ? s.s41 : s.s42]}
          >
            <Text style={[s.s43, filter === 'all' ? s.s44 : s.s45]}>All Rides</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('women')}
            style={[s.s46, filter === 'women' ? s.s47 : s.s48]}
          >
            <ShieldCheck size={14} color={filter === 'women' ? '#fff' : '#94a3b8'} />
            <Text style={[s.s49, filter === 'women' ? s.s50 : s.s51]}>Women Only</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setFilter('green')}
            style={[s.s52, filter === 'green' ? s.s53 : s.s54]}
          >
            <Leaf size={14} color={filter === 'green' ? '#fff' : '#94a3b8'} />
            <Text style={[s.s55, filter === 'green' ? s.s56 : s.s57]}>Green (EV)</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <View style={s.s37}>
          <FlashList
            data={filteredRides}
            keyExtractor={item => item.id}
            renderItem={renderRide}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
            estimatedItemSize={216}
            ListEmptyComponent={
              <View style={s.s38}>
                <Users size={48} color="#334155" />
                <Text style={s.s39}>No rides found for your search.</Text>
              </View>
            }
          />
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  s0: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  s1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  s2: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  s3: { width: 48, height: 48, borderRadius: 9999, backgroundColor: 'rgba(30,58,95,0.5)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)' },
  s4: { color: '#60a5fa', fontWeight: '700', fontSize: 18 },
  s5: { marginLeft: 12, flex: 1 },
  s6: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  s7: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  s8: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  s9: { color: '#94a3b8', fontSize: 12 },
  s10: { color: '#34d399', fontWeight: '900', fontSize: 20 },
  s11: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  s12: { backgroundColor: 'rgba(236,72,153,0.1)', borderWidth: 1, borderColor: 'rgba(236,72,153,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  s13: { color: '#f472b6', fontSize: 12, fontWeight: '700' },
  s14: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, flexDirection: 'row', alignItems: 'center', gap: 4 },
  s15: { color: '#34d399', fontSize: 12, fontWeight: '700' },
  s16: { marginBottom: 16, backgroundColor: '#020617', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  s17: { flexDirection: 'row', alignItems: 'center' },
  s18: { width: 12, height: 12, borderRadius: 9999, backgroundColor: '#3b82f6', marginRight: 12 },
  s19: { color: '#e2e8f0', fontWeight: '600' },
  s20: { width: 2, height: 24, backgroundColor: '#334155', marginLeft: 6, marginVertical: 4 },
  s21: { flexDirection: 'row', alignItems: 'center' },
  s22: { width: 12, height: 12, borderRadius: 9999, backgroundColor: '#f43f5e', marginRight: 12 },
  s23: { color: '#e2e8f0', fontWeight: '600' },
  s24: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderColor: '#1e293b', paddingTop: 16 },
  s25: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  s26: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  s27: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  s28: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  s29: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  s30: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  s31: { color: '#ffffff', fontWeight: '700' },
  s32: { flex: 1 },
  s33: { padding: 16, borderBottomWidth: 1, borderColor: '#0f172a' },
  s34: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  s35: { flex: 1, marginLeft: 12, color: '#ffffff', fontSize: 16 },
  s36: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: '#0f172a' },
  s37: { flex: 1, width: '100%' },
  s38: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  s39: { color: '#64748b', fontSize: 16, marginTop: 16, fontWeight: '600', textAlign: 'center' },
  s40: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1 },
  s41: { backgroundColor: '#2563eb', borderColor: '#3b82f6' },
  s42: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s43: { fontWeight: '700' },
  s44: { color: '#ffffff' },
  s45: { color: '#94a3b8' },
  s46: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  s47: { backgroundColor: '#db2777', borderColor: '#ec4899' },
  s48: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s49: { fontWeight: '700' },
  s50: { color: '#ffffff' },
  s51: { color: '#94a3b8' },
  s52: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 9999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  s53: { backgroundColor: '#059669', borderColor: '#10b981' },
  s54: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s55: { fontWeight: '700' },
  s56: { color: '#ffffff' },
  s57: { color: '#94a3b8' },
});
