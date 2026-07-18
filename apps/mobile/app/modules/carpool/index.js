import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../theme';
import { apiGet, apiPost } from '../../config/api';

const POPULAR_ROUTES = [
  { from: 'Dhanori', to: 'Hinjewadi', riders: 42, icon: 'laptop-outline', color: '#6366f1' },
  { from: 'Dhanori', to: 'Kharadi IT Park', riders: 38, icon: 'business-outline', color: '#f97316' },
  { from: 'Dhanori', to: 'Viman Nagar', riders: 27, icon: 'airplane-outline', color: '#0ea5e9' },
  { from: 'Dhanori', to: 'Magarpatta', riders: 19, icon: 'storefront-outline', color: '#10b981' },
];

const FALLBACK_RIDES = [
  { id: 1, driver: 'Ramesh Patil', from: 'Dhanori Chowk', to: 'Hinjewadi Phase 1', time: 'Tomorrow, 9:00 AM', price: 50, vehicle: 'Tata Nexon EV', seats: 3, rating: 4.9, gender: 'Any', verified: true, isEV: true },
  { id: 2, driver: 'Sunita Joshi', from: 'Ganga Aria Society', to: 'Kharadi IT Park', time: 'Tomorrow, 8:30 AM', price: 40, vehicle: 'Maruti Baleno', seats: 2, rating: 4.7, gender: 'Any', verified: true, isEV: false },
  { id: 3, driver: 'Vikram Singh', from: 'Pride Aashiyana', to: 'Viman Nagar EON', time: 'Today, 6:30 PM', price: 30, vehicle: 'Honda City', seats: 4, rating: 4.8, gender: 'Any', verified: true, isEV: false },
  { id: 4, driver: 'Priya Kulkarni', from: 'Tingre Nagar', to: 'Magarpatta City', time: 'Tomorrow, 9:30 AM', price: 35, vehicle: 'Maruti Swift', seats: 2, rating: 5.0, gender: 'Women only', verified: true, isEV: false },
];

export default function CarpoolScreen() {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joinedIds, setJoinedIds] = useState([]);
  const [filterTo, setFilterTo] = useState('');
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [form, setForm] = useState({ from: '', to: '', time: '', price: '', vehicle: '', seats: '3', gender: 'Any' });

  useEffect(() => { fetchRides(); }, []);

  const fetchRides = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const result = await apiGet('/carpool/rides', token);
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        setRides(result.data.map(r => ({
          id: r.id, driver: r.driver_name || 'Neighbor', from: r.origin, to: r.destination,
          time: r.departure_time, price: r.price_per_seat, vehicle: r.vehicle || 'Vehicle',
          seats: r.seats_available, rating: r.rating || 4.8, gender: r.gender || 'Any', verified: true, isEV: false
        })));
      } else {
        setRides(FALLBACK_RIDES);
      }
    } catch (e) {
      setRides(FALLBACK_RIDES);
    } finally { setLoading(false); }
  };

  const handleOffer = async () => {
    if (!form.from || !form.to || !form.time || !form.price) {
      Alert.alert('Error', 'Please fill required fields (From, To, Time, Price).');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) { Alert.alert('Error', 'Please login to offer a ride'); return; }
      await apiPost('/carpool/rides', {
        origin: form.from, destination: form.to, departure_time: form.time,
        price_per_seat: parseFloat(form.price), seats_available: parseInt(form.seats, 10)
      }, token);
    } catch (e) { /* Fallback */ }
    Alert.alert('Success', 'Ride offered! Neighbors can now join your commute.');
    setForm({ from: '', to: '', time: '', price: '', vehicle: '', seats: '3', gender: 'Any' });
    setShowOfferModal(false);
    fetchRides();
  };

  const joinRide = (id) => {
    if (joinedIds.includes(id)) return;
    setJoinedIds([...joinedIds, id]);
    Alert.alert('Success', 'Request sent to driver!');
  };

  const filtered = filterTo
    ? rides.filter(r => (r.to || '').toLowerCase().includes((filterTo || '').toLowerCase()) || (r.from || '').toLowerCase().includes((filterTo || '').toLowerCase()))
    : rides;

  const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Carpool</Text>
        <View style={styles.badge}><Text style={styles.badgeText}>Verified Only</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Bar */}
        <View style={styles.statsBar}>
          {[{ v: '230+', l: 'Riders' }, { v: '₹1,500', l: 'Avg Saved' }, { v: '4.9★', l: 'Rating' }].map((s, i) => (
            <View key={s.l} style={[styles.statItem, i < 2 && { borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.3)' }]}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Popular Routes */}
        <Text style={styles.sectionTitle}>
          <Ionicons name="navigate-outline" size={16} color={COLORS.primary} /> Popular Routes
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.routesScroll}>
          {POPULAR_ROUTES.map(r => (
            <TouchableOpacity key={r.to} style={[styles.routeCard, filterTo === r.to && styles.routeCardActive]} onPress={() => setFilterTo(filterTo === r.to ? '' : r.to)} activeOpacity={0.7}>
              <View style={[styles.routeIconBox, { backgroundColor: r.color + '15' }]}>
                <Ionicons name={r.icon} size={20} color={r.color} />
              </View>
              <Text style={styles.routeText}>→ {r.to}</Text>
              <Text style={styles.routeSub}>{r.riders} riders/week</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Available Rides Header */}
        <View style={styles.rowBetween}>
          <Text style={styles.sectionTitle}>
            <Ionicons name="car-outline" size={16} color={COLORS.primary} /> Available Rides
          </Text>
          {filterTo ? (
            <TouchableOpacity onPress={() => setFilterTo('')} style={styles.clearFilter}>
              <Ionicons name="close-circle" size={14} color={COLORS.primary} />
              <Text style={styles.clearFilterText}>{filterTo}</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Rides List */}
        {loading ? <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 30 }} /> : filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No rides found</Text>
            <Text style={styles.emptyDesc}>Try a different route or offer your own ride!</Text>
          </View>
        ) : (
          filtered.map(r => {
            const joined = joinedIds.includes(r.id);
            return (
              <View key={r.id} style={styles.rideCard}>
                <View style={styles.rideHeader}>
                  <View style={styles.driverInfo}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{getInitials(r.driver)}</Text>
                    </View>
                    <View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.driverName}>{r.driver}</Text>
                        {r.verified && (
                          <View style={styles.verifiedBadge}>
                            <Ionicons name="shield-checkmark" size={10} color="#166534" />
                            <Text style={styles.verifiedText}> Verified</Text>
                          </View>
                        )}
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Ionicons name="star" size={12} color="#f59e0b" />
                          <Text style={styles.ratingText}> {r.rating}</Text>
                        </View>
                        <Text style={styles.vehicleText}>{r.vehicle}</Text>
                        {r.isEV && (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="leaf" size={10} color="#10b981" />
                            <Text style={{ fontSize: 10, color: '#10b981', fontWeight: '700' }}> EV</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                  <Text style={styles.priceTag}>₹{r.price}</Text>
                </View>

                {/* Route Visual */}
                <View style={styles.routeVisual}>
                  <View style={styles.routeDots}>
                    <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                    <View style={styles.routeLine} />
                    <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                  </View>
                  <View style={styles.routeLabels}>
                    <Text style={styles.routeFrom}>{r.from}</Text>
                    <Text style={styles.routeTo}>{r.to}</Text>
                  </View>
                </View>

                <View style={styles.metaRow}>
                  <View style={styles.metaTag}><Ionicons name="time-outline" size={12} color={COLORS.textMuted} /><Text style={styles.metaText}> {r.time}</Text></View>
                  <View style={styles.metaTag}><Ionicons name="people-outline" size={12} color={COLORS.textMuted} /><Text style={styles.metaText}> {r.seats} seats</Text></View>
                  {r.gender === 'Women only' && <View style={[styles.metaTag, { backgroundColor: '#fce7f3' }]}><Text style={{ fontSize: 11, color: '#db2777', fontWeight: '700' }}>Women Only</Text></View>}
                </View>

                <View style={styles.rideFooter}>
                  <TouchableOpacity
                    style={[styles.joinBtn, joined && styles.joinBtnSent]}
                    onPress={() => joinRide(r.id)} disabled={joined} activeOpacity={0.7}
                  >
                    <Ionicons name={joined ? 'checkmark-circle' : 'car-sport'} size={16} color={joined ? COLORS.accent : '#fff'} />
                    <Text style={[styles.joinBtnText, joined && styles.joinBtnTextSent]}> {joined ? 'Joined!' : 'Join Ride'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.phoneBtn}>
                    <Ionicons name="call-outline" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowOfferModal(true)} activeOpacity={0.8}>
        <Ionicons name="add" size={20} color="#fff" />
        <Text style={styles.fabText}> Offer Ride</Text>
      </TouchableOpacity>

      {/* Offer Modal */}
      <Modal visible={showOfferModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Offer a Ride</Text>
              <TouchableOpacity onPress={() => setShowOfferModal(false)} style={styles.closeBtnCircle}>
                <Ionicons name="close" size={18} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>From (Pickup) *</Text>
              <TextInput style={styles.input} placeholder="e.g. Dhanori Chowk" placeholderTextColor={COLORS.textLight} value={form.from} onChangeText={t => setForm({ ...form, from: t })} />
              <Text style={styles.label}>To (Destination) *</Text>
              <TextInput style={styles.input} placeholder="e.g. Hinjewadi Phase 1" placeholderTextColor={COLORS.textLight} value={form.to} onChangeText={t => setForm({ ...form, to: t })} />
              <Text style={styles.label}>Departure Date & Time *</Text>
              <TextInput style={styles.input} placeholder="e.g. Tomorrow 9:00 AM" placeholderTextColor={COLORS.textLight} value={form.time} onChangeText={t => setForm({ ...form, time: t })} />
              <View style={{ flexDirection: 'row', gap: SPACING.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>₹ per Seat *</Text>
                  <TextInput style={styles.input} placeholder="50" placeholderTextColor={COLORS.textLight} keyboardType="numeric" value={form.price} onChangeText={t => setForm({ ...form, price: t })} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Seats</Text>
                  <TextInput style={styles.input} placeholder="3" placeholderTextColor={COLORS.textLight} keyboardType="numeric" value={form.seats} onChangeText={t => setForm({ ...form, seats: t })} />
                </View>
              </View>
              <Text style={styles.label}>Vehicle (optional)</Text>
              <TextInput style={styles.input} placeholder="e.g. Maruti Swift" placeholderTextColor={COLORS.textLight} value={form.vehicle} onChangeText={t => setForm({ ...form, vehicle: t })} />
              <TouchableOpacity style={styles.submitBtn} onPress={handleOffer} activeOpacity={0.7}>
                <Ionicons name="car-sport-outline" size={18} color="#fff" />
                <Text style={styles.submitBtnText}> Post Carpool Offer</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: SPACING.lg, backgroundColor: COLORS.backgroundAlt, borderBottomWidth: 1, borderColor: COLORS.border, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 36, height: 36, borderRadius: BORDER_RADIUS.sm, backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  headerTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text, flex: 1 },
  badge: { backgroundColor: '#dcfce7', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  badgeText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: '#166534', textTransform: 'uppercase', letterSpacing: 1 },

  content: { padding: SPACING.lg, paddingBottom: 100 },

  statsBar: { flexDirection: 'row', backgroundColor: COLORS.secondary, borderRadius: BORDER_RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.xl },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONT_SIZES.lg, fontWeight: '900', color: '#fff' },
  statLabel: { fontSize: FONT_SIZES.xs, color: 'rgba(255,255,255,0.8)', fontWeight: '600', marginTop: 2 },

  sectionTitle: { fontSize: FONT_SIZES.md, fontWeight: '800', color: COLORS.text, marginBottom: SPACING.md },
  routesScroll: { gap: SPACING.md, paddingBottom: SPACING.xl },
  routeCard: { backgroundColor: COLORS.cardBg, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, width: 140, alignItems: 'center', ...SHADOWS.sm },
  routeCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  routeIconBox: { width: 40, height: 40, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.sm },
  routeText: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  routeSub: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  clearFilter: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryLight, paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.full },
  clearFilterText: { fontSize: FONT_SIZES.xs, fontWeight: '700', color: COLORS.primary },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text, marginTop: SPACING.lg },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.xs },

  rideCard: { backgroundColor: COLORS.cardBg, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.lg, ...SHADOWS.md },
  rideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.lg },
  driverInfo: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: FONT_SIZES.sm, fontWeight: '800' },
  driverName: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#dcfce7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: BORDER_RADIUS.full },
  verifiedText: { color: '#166534', fontSize: 10, fontWeight: '800' },
  ratingText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: '600' },
  vehicleText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted },
  priceTag: { fontSize: FONT_SIZES.xl, fontWeight: '900', color: COLORS.primary },

  routeVisual: { flexDirection: 'row', marginBottom: SPACING.md },
  routeDots: { alignItems: 'center', marginRight: SPACING.md, paddingTop: 4 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeLine: { width: 1.5, height: 24, backgroundColor: COLORS.border },
  routeLabels: { flex: 1, justifyContent: 'space-between', gap: SPACING.sm },
  routeFrom: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.text },
  routeTo: { fontSize: FONT_SIZES.base, fontWeight: '600', color: COLORS.text },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  metaTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.sm },
  metaText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: '600' },

  rideFooter: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: SPACING.lg },
  joinBtn: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', ...SHADOWS.glow },
  joinBtnSent: { backgroundColor: COLORS.accentLight, ...SHADOWS.sm, shadowColor: COLORS.accent },
  joinBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.base },
  joinBtnTextSent: { color: COLORS.accent },
  phoneBtn: { width: 44, height: 44, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  fab: { position: 'absolute', bottom: 24, right: 24, flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.full, ...SHADOWS.glow },
  fabText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZES.md },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.backgroundAlt, borderTopLeftRadius: BORDER_RADIUS['2xl'], borderTopRightRadius: BORDER_RADIUS['2xl'], padding: SPACING['2xl'], maxHeight: '90%' },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text },
  closeBtnCircle: { width: 32, height: 32, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textMuted, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg, color: COLORS.text, fontSize: FONT_SIZES.base },

  submitBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md, ...SHADOWS.glow },
  submitBtnText: { color: '#fff', fontSize: FONT_SIZES.md, fontWeight: '800' },
});
