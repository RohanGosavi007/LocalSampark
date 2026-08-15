import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, StyleSheet, TextInput, Modal, Alert, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, MapPin, Navigation, Clock, Users, Star, Shield, Car, Plus, Send, AlertTriangle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { apiGet, apiPost } from '../../src/lib/api';

const TABS = [{ key: 'find', label: '🔍 Find' }, { key: 'offer', label: '🚗 Offer' }, { key: 'my', label: '📋 My Rides' }];

export default function CarpoolScreen() {
  const router = useRouter();
  const [tab, setTab] = useState('find');
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchFrom, setSearchFrom] = useState('');
  const [searchTo, setSearchTo] = useState('');
  const [rideType, setRideType] = useState('');
  const [showBooking, setShowBooking] = useState(false);
  const [selectedRide, setSelectedRide] = useState(null);
  const [seats, setSeats] = useState(1);
  const [booked, setBooked] = useState(false);
  const [showBid, setShowBid] = useState(false);
  const [bidAmount, setBidAmount] = useState('');
  const [bidSubmitted, setBidSubmitted] = useState(false);
  const [myRides, setMyRides] = useState({ as_driver: [], as_passenger: [] });
  const [offerForm, setOfferForm] = useState({ from_location: '', to_location: '', departure_time: '', ride_date: '', seats_available: '3', price_per_seat: '0', ride_type: 'car', gender_preference: 'any' });

  const fetchRides = useCallback(async () => {
    setLoading(true);
    try {
      let url = '/carpool/rides?limit=30';
      if (rideType) url += `&ride_type=${rideType}`;
      const data = await apiGet(url);
      setRides(data?.rides || data?.data || []);
    } catch (e) { setRides([]); }
    setLoading(false);
  }, [rideType]);

  useEffect(() => { fetchRides(); }, [fetchRides]);

  useEffect(() => {
    if (tab === 'my') {
      apiGet('/carpool/my-rides').then(d => setMyRides(d || { as_driver: [], as_passenger: [] })).catch(() => {});
    }
  }, [tab]);

  const onRefresh = async () => { setRefreshing(true); await fetchRides(); setRefreshing(false); };

  const filtered = rides.filter(r => {
    const from = (r.from_location || r.origin || '').toLowerCase();
    const to = (r.to_location || r.destination || '').toLowerCase();
    if (searchFrom && !from.includes(searchFrom.toLowerCase())) return false;
    if (searchTo && !to.includes(searchTo.toLowerCase())) return false;
    return true;
  });

  const bookRide = async () => {
    try {
      const data = await apiPost(`/carpool/rides/${selectedRide.id}/book`, { seats_booked: seats });
      setBooked(true);
      setTimeout(() => { setShowBooking(false); setBooked(false); fetchRides(); }, 2000);
    } catch (e) { Alert.alert('Error', 'Failed to book ride'); }
  };

  const submitBid = async () => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) { Alert.alert('Error', 'Enter valid bid amount'); return; }
    try {
      await apiPost(`/carpool/rides/${selectedRide.id}/bid`, { bid_amount: parseFloat(bidAmount), seats_requested: seats });
      setBidSubmitted(true);
      setTimeout(() => { setShowBid(false); setBidSubmitted(false); setBidAmount(''); }, 2000);
    } catch (e) { Alert.alert('Error', 'Failed to submit bid'); }
  };

  const offerRide = async () => {
    if (!offerForm.from_location || !offerForm.to_location) { Alert.alert('Error', 'From and To are required'); return; }
    try {
      await apiPost('/carpool/rides', { ...offerForm, seats_available: parseInt(offerForm.seats_available), price_per_seat: parseInt(offerForm.price_per_seat) });
      Alert.alert('Success', 'Ride published!');
      setTab('find');
      fetchRides();
    } catch (e) { Alert.alert('Error', 'Failed to publish ride'); }
  };

  const triggerSOS = (rideId) => {
    Alert.alert('🚨 Emergency SOS', 'This will alert emergency contacts. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Send SOS', style: 'destructive', onPress: () => apiPost(`/carpool/rides/${rideId}/sos`, { message: 'Emergency SOS from mobile app' }).then(() => Alert.alert('SOS Sent', 'Emergency contacts notified.')).catch(() => {}) }
    ]);
  };

  const RideCard = ({ ride }) => {
    const from = ride.from_location || ride.origin || 'Start';
    const to = ride.to_location || ride.destination || 'End';
    const driverName = ride.driver?.full_name || 'Verified User';
    const rating = ride.driver_rating?.avg || '4.5';
    const remaining = ride.remaining_seats ?? ride.available_seats ?? ride.seats_available ?? 4;
    const isBike = ride.ride_type === 'bike';

    return (
      <TouchableOpacity style={s.rideCard} onPress={() => { setSelectedRide(ride); setShowBooking(true); }} activeOpacity={0.8}>
        <View style={s.rideHeader}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={s.avatar}><Text style={s.avatarText}>{driverName[0]}</Text></View>
            <View>
              <Text style={s.driverName}>{driverName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ color: '#eab308', fontSize: 11 }}>⭐ {rating}</Text>
                {ride.gender_preference === 'female' && <View style={[s.badge, { backgroundColor: '#ec489922' }]}><Text style={[s.badgeText, { color: '#ec4899' }]}>Women Only</Text></View>}
              </View>
            </View>
          </View>
          <View style={[s.badge, { backgroundColor: isBike ? '#f5950422' : '#06b6d422' }]}>
            <Text style={[s.badgeText, { color: isBike ? '#f59504' : '#06b6d4' }]}>{isBike ? '🏍️ Bike' : '🚗 Car'}</Text>
          </View>
        </View>

        <View style={s.routeContainer}>
          <View style={s.routeDots}>
            <View style={[s.dot, { backgroundColor: '#10b981' }]} />
            <View style={s.routeLine} />
            <View style={[s.dot, { backgroundColor: '#06b6d4' }]} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.routeText}>{from}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 4 }}>
              {ride.departure_time && <Text style={s.metaText}>{ride.departure_time}</Text>}
              {ride.estimated_distance_km && <Text style={s.metaText}>· {parseFloat(ride.estimated_distance_km).toFixed(0)} km</Text>}
            </View>
            <Text style={s.routeText}>{to}</Text>
          </View>
        </View>

        <View style={s.rideFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={s.priceText}>₹{ride.price_per_seat || 0}</Text>
            <Text style={s.metaText}>/seat</Text>
            {ride.fare_type === 'negotiable' && <View style={[s.badge, { backgroundColor: '#f5950422' }]}><Text style={[s.badgeText, { color: '#f59504' }]}>Negotiable</Text></View>}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Users color="#94a3b8" size={14} />
            <Text style={s.metaText}>{remaining} left</Text>
          </View>
        </View>

        {ride.is_intercity ? <View style={[s.badge, { backgroundColor: '#8b5cf622', marginTop: 6 }]}><Text style={[s.badgeText, { color: '#8b5cf6' }]}>🛣️ Intercity</Text></View> : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Header */}
      <LinearGradient colors={['#0891b2', '#0e7490']} style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ChevronLeft color="#fff" size={24} /></TouchableOpacity>
        <Text style={s.headerTitle}>🚗 Community Rides</Text>
        <View style={{ width: 32 }} />
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabBar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[s.tabItem, tab === t.key && s.tabItemActive]}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ═══ FIND TAB ═══ */}
      {tab === 'find' && (
        <>
          <View style={s.searchBox}>
            <View style={s.inputRow}>
              <MapPin color="#10b981" size={16} />
              <TextInput style={s.searchInput} placeholder="From..." placeholderTextColor="#94a3b8" value={searchFrom} onChangeText={setSearchFrom} />
            </View>
            <View style={s.inputRow}>
              <Navigation color="#06b6d4" size={16} />
              <TextInput style={s.searchInput} placeholder="To..." placeholderTextColor="#94a3b8" value={searchTo} onChangeText={setSearchTo} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              {[{ v: '', l: 'All' }, { v: 'car', l: '🚗 Car' }, { v: 'bike', l: '🏍️ Bike' }].map(t => (
                <TouchableOpacity key={t.v} onPress={() => setRideType(t.v)} style={[s.filterPill, rideType === t.v && s.filterPillActive]}>
                  <Text style={[s.filterPillText, rideType === t.v && { color: '#fff' }]}>{t.l}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {loading ? (
            <View style={s.centerView}><ActivityIndicator size="large" color="#06b6d4" /></View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item, i) => item.id || String(i)}
              renderItem={({ item }) => <RideCard ride={item} />}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#06b6d4" />}
              ListEmptyComponent={
                <View style={s.centerView}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>🚗</Text>
                  <Text style={s.emptyTitle}>No rides found</Text>
                  <Text style={s.metaText}>Be the first to offer a ride!</Text>
                  <TouchableOpacity onPress={() => setTab('offer')} style={[s.primaryBtn, { marginTop: 16 }]}>
                    <Text style={s.primaryBtnText}>Offer a Ride</Text>
                  </TouchableOpacity>
                </View>
              }
            />
          )}
        </>
      )}

      {/* ═══ OFFER TAB ═══ */}
      {tab === 'offer' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={s.sectionTitle}>Publish a Ride</Text>
          <View style={s.formCard}>
            <TextInput style={s.formInput} placeholder="🟢 Start Location" placeholderTextColor="#94a3b8" value={offerForm.from_location} onChangeText={v => setOfferForm({...offerForm, from_location: v})} />
            <TextInput style={s.formInput} placeholder="🔵 Destination" placeholderTextColor="#94a3b8" value={offerForm.to_location} onChangeText={v => setOfferForm({...offerForm, to_location: v})} />
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput style={[s.formInput, { flex: 1 }]} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#94a3b8" value={offerForm.ride_date} onChangeText={v => setOfferForm({...offerForm, ride_date: v})} />
              <TextInput style={[s.formInput, { flex: 1 }]} placeholder="Time (HH:MM)" placeholderTextColor="#94a3b8" value={offerForm.departure_time} onChangeText={v => setOfferForm({...offerForm, departure_time: v})} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TextInput style={[s.formInput, { flex: 1 }]} placeholder="Seats" placeholderTextColor="#94a3b8" keyboardType="numeric" value={offerForm.seats_available} onChangeText={v => setOfferForm({...offerForm, seats_available: v})} />
              <TextInput style={[s.formInput, { flex: 1 }]} placeholder="₹ Price/seat" placeholderTextColor="#94a3b8" keyboardType="numeric" value={offerForm.price_per_seat} onChangeText={v => setOfferForm({...offerForm, price_per_seat: v})} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
              {['car', 'bike'].map(t => (
                <TouchableOpacity key={t} onPress={() => setOfferForm({...offerForm, ride_type: t})} style={[s.filterPill, offerForm.ride_type === t && s.filterPillActive]}>
                  <Text style={[s.filterPillText, offerForm.ride_type === t && { color: '#fff' }]}>{t === 'car' ? '🚗 Car' : '🏍️ Bike'}</Text>
                </TouchableOpacity>
              ))}
              {['any', 'female', 'male'].map(g => (
                <TouchableOpacity key={g} onPress={() => setOfferForm({...offerForm, gender_preference: g})} style={[s.filterPill, offerForm.gender_preference === g && s.filterPillActive]}>
                  <Text style={[s.filterPillText, offerForm.gender_preference === g && { color: '#fff' }]}>{g === 'any' ? '👥 Anyone' : g === 'female' ? '🛡️ Women Only' : '👨 Men Only'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity onPress={offerRide} style={s.primaryBtn}>
              <Text style={s.primaryBtnText}>Publish Ride 🚀</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* ═══ MY RIDES TAB ═══ */}
      {tab === 'my' && (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <Text style={s.sectionTitle}>🚗 As Driver</Text>
          {(myRides.as_driver || []).length === 0 ? <Text style={s.metaText}>No rides offered yet</Text> : (myRides.as_driver || []).map((ride, i) => (
            <View key={ride.id || i} style={s.myRideCard}>
              <Text style={s.myRideTitle}>{ride.from_location || ride.origin} → {ride.to_location || ride.destination}</Text>
              <Text style={s.metaText}>{ride.ride_date} · {ride.departure_time} · {ride.status}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity onPress={() => triggerSOS(ride.id)} style={[s.filterPill, { backgroundColor: '#ef444422' }]}>
                  <Text style={[s.filterPillText, { color: '#ef4444' }]}>🚨 SOS</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <Text style={[s.sectionTitle, { marginTop: 24 }]}>🎫 As Passenger</Text>
          {(myRides.as_passenger || []).length === 0 ? <Text style={s.metaText}>No rides booked yet</Text> : (myRides.as_passenger || []).map((ride, i) => (
            <View key={ride.id || i} style={s.myRideCard}>
              <Text style={s.myRideTitle}>{ride.from_location || ride.origin} → {ride.to_location || ride.destination}</Text>
              <Text style={s.metaText}>{ride.ride_date} · ₹{ride.price_per_seat}/seat</Text>
              <TouchableOpacity onPress={() => triggerSOS(ride.id)} style={[s.filterPill, { backgroundColor: '#ef444422', marginTop: 8 }]}>
                <Text style={[s.filterPillText, { color: '#ef4444' }]}>🚨 SOS</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ═══ BOOKING MODAL ═══ */}
      <Modal visible={showBooking} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {booked ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
                <Text style={s.sectionTitle}>Booking Confirmed!</Text>
                <Text style={s.metaText}>The driver will confirm your seat.</Text>
              </View>
            ) : selectedRide ? (
              <>
                <Text style={s.sectionTitle}>Book This Ride</Text>
                <View style={s.detailRow}><Text style={s.metaText}>Driver</Text><Text style={s.detailValue}>{selectedRide.driver?.full_name || 'Verified User'}</Text></View>
                <View style={s.detailRow}><Text style={s.metaText}>Route</Text><Text style={s.detailValue} numberOfLines={1}>{(selectedRide.from_location||'').split(',')[0]} → {(selectedRide.to_location||'').split(',')[0]}</Text></View>
                <View style={s.detailRow}><Text style={s.metaText}>Type</Text><Text style={s.detailValue}>{selectedRide.ride_type === 'bike' ? '🏍️ Bike' : '🚗 Car'}</Text></View>

                <View style={[s.detailRow, { justifyContent: 'space-between' }]}>
                  <Text style={s.detailValue}>Seats:</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                    <TouchableOpacity onPress={() => setSeats(Math.max(1, seats-1))} style={s.seatBtn}><Text style={s.seatBtnText}>−</Text></TouchableOpacity>
                    <Text style={[s.detailValue, { fontSize: 20, fontWeight: '900' }]}>{seats}</Text>
                    <TouchableOpacity onPress={() => setSeats(Math.min(4, seats+1))} style={s.seatBtn}><Text style={s.seatBtnText}>+</Text></TouchableOpacity>
                  </View>
                </View>

                <View style={[s.detailRow, { justifyContent: 'space-between', marginTop: 12 }]}>
                  <Text style={s.metaText}>Total</Text>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>₹{(selectedRide.price_per_seat || 0) * seats}</Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <TouchableOpacity onPress={bookRide} style={[s.primaryBtn, { flex: 1 }]}>
                    <Text style={s.primaryBtnText}>Book Now</Text>
                  </TouchableOpacity>
                  {selectedRide.fare_type === 'negotiable' && (
                    <TouchableOpacity onPress={() => { setShowBooking(false); setBidAmount(String(Math.round((selectedRide.price_per_seat||100)*0.85))); setShowBid(true); }} style={[s.bidBtn]}>
                      <Text style={s.bidBtnText}>💬 Bid</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <TouchableOpacity onPress={() => setShowBooking(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={s.metaText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* ═══ BID MODAL ═══ */}
      <Modal visible={showBid} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalContent}>
            {bidSubmitted ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>✅</Text>
                <Text style={s.sectionTitle}>Bid Submitted!</Text>
              </View>
            ) : (
              <>
                <Text style={s.sectionTitle}>Name Your Price</Text>
                <Text style={s.metaText}>Driver asks: ₹{selectedRide?.price_per_seat || 0}/seat</Text>
                <TextInput style={[s.formInput, { fontSize: 28, fontWeight: '900', textAlign: 'center', marginVertical: 16 }]}
                  placeholder="₹ Your bid" placeholderTextColor="#94a3b8" keyboardType="numeric"
                  value={bidAmount} onChangeText={setBidAmount} />
                <TouchableOpacity onPress={submitBid} style={s.primaryBtn}>
                  <Text style={s.primaryBtnText}>Submit Bid 🤝</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setShowBid(false)} style={{ marginTop: 12, alignItems: 'center' }}>
                  <Text style={s.metaText}>Cancel</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, paddingTop: 8 },
  backBtn: { padding: 4 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  tabItem: { flex: 1, paddingVertical: 10, borderRadius: 12, alignItems: 'center', backgroundColor: '#1e293b' },
  tabItemActive: { backgroundColor: '#0891b2' },
  tabText: { color: '#94a3b8', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#fff' },
  searchBox: { marginHorizontal: 16, marginBottom: 8, backgroundColor: '#1e293b', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: '#334155' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0f172a', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginBottom: 8 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  filterPill: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterPillActive: { backgroundColor: '#0891b2', borderColor: '#0891b2' },
  filterPillText: { color: '#94a3b8', fontSize: 12, fontWeight: '700' },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  emptyTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },

  rideCard: { backgroundColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#06b6d422', justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#06b6d4', fontWeight: '800', fontSize: 16 },
  driverName: { color: '#fff', fontWeight: '700', fontSize: 14 },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  routeContainer: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  routeDots: { alignItems: 'center', paddingTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 2, height: 24, backgroundColor: '#334155', marginVertical: 4 },
  routeText: { color: '#e2e8f0', fontSize: 13, fontWeight: '600' },
  metaText: { color: '#94a3b8', fontSize: 11 },
  rideFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#334155' },
  priceText: { color: '#fff', fontSize: 18, fontWeight: '900' },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 12 },
  formCard: { backgroundColor: '#1e293b', borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#334155' },
  formInput: { backgroundColor: '#0f172a', color: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#334155', fontSize: 14, marginBottom: 12 },
  primaryBtn: { backgroundColor: '#0891b2', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  bidBtn: { backgroundColor: '#f5950422', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  bidBtnText: { color: '#f59504', fontWeight: '800', fontSize: 14 },

  myRideCard: { backgroundColor: '#1e293b', borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#334155' },
  myRideTitle: { color: '#e2e8f0', fontWeight: '700', fontSize: 14, marginBottom: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#334155' },
  detailValue: { color: '#e2e8f0', fontWeight: '600', fontSize: 14 },
  seatBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  seatBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
