import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FindRideScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Stub: Fetch active rides
    setTimeout(() => {
      setRides([
        { id: '1', driver: 'Rahul S.', from: 'Hinjewadi Phase 1', to: 'Pune Station', time: '09:00 AM', price: 60, seats: 2, rating: 4.8 },
        { id: '2', driver: 'Amit K.', from: 'Wakad', to: 'Viman Nagar', time: '10:30 AM', price: 120, seats: 3, rating: 4.9 },
        { id: '3', driver: 'Sneha P.', from: 'Baner', to: 'Magarpatta', time: '08:45 AM', price: 90, seats: 1, rating: 5.0 },
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredRides = rides.filter(r => 
    r.from.toLowerCase().includes(search.toLowerCase()) || 
    r.to.toLowerCase().includes(search.toLowerCase())
  );

  const renderRide = ({ item }) => (
    <View style={styles.rideCard}>
      <View style={styles.rideHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{item.driver.charAt(0)}</Text></View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.driverName}>{item.driver}</Text>
            <Text style={styles.rating}>⭐ {item.rating}</Text>
          </View>
        </View>
        <Text style={styles.price}>₹{item.price}</Text>
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routePoint}>
          <View style={styles.dotStart} />
          <Text style={styles.routeText}>{item.from}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routePoint}>
          <View style={styles.dotEnd} />
          <Text style={styles.routeText}>{item.to}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <View style={styles.infoBadge}>
          <Ionicons name="time-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.time}</Text>
        </View>
        <View style={styles.infoBadge}>
          <Ionicons name="people-outline" size={16} color="#666" />
          <Text style={styles.infoText}>{item.seats} Seats Left</Text>
        </View>
        
        <TouchableOpacity style={styles.requestBtn}>
          <Text style={styles.requestText}>Request Seat</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Find a Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" />
        <TextInput 
          style={styles.searchInput}
          placeholder="Where are you going?"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={filteredRides}
          keyExtractor={item => item.id}
          renderItem={renderRide}
          contentContainerStyle={{ padding: 20 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No rides found for your search.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: 'bold' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', margin: 20, paddingHorizontal: 15, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' },
  searchInput: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, fontSize: 16 },
  
  rideCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 20, marginBottom: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e2e8f0', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#475569' },
  driverName: { fontSize: 16, fontWeight: '600' },
  rating: { fontSize: 12, color: '#f59e0b', marginTop: 2 },
  price: { fontSize: 20, fontWeight: '900', color: '#10b981' },
  
  routeContainer: { marginLeft: 10, marginBottom: 20 },
  routePoint: { flexDirection: 'row', alignItems: 'center' },
  dotStart: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3b82f6', marginRight: 10 },
  dotEnd: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ef4444', marginRight: 10 },
  routeLine: { width: 2, height: 20, backgroundColor: '#475569', marginLeft: 5, marginVertical: 2 },
  routeText: { fontSize: 15, color: '#e2e8f0', fontWeight: '500' },
  
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 15 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  infoText: { fontSize: 12, color: '#64748b', marginLeft: 4, fontWeight: '600' },
  requestBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  requestText: { color: '#0f172a', fontWeight: 'bold' },
  
  emptyText: { textAlign: 'center', color: '#64748b', marginTop: 40, fontSize: 16 }
});
