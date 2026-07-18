import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal, Alert, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SHADOWS } from '../../theme';
import { getServiceIcon } from '../../config/icons';
import { apiGet, apiPost } from '../../config/api';

export const STATIC_SERVICES = [
  { id: 'laundry', category: 'Cleaning', name: 'Premium Laundry & Dry Cleaning', desc: 'Doorstep pickup, wash, steam iron, and delivery within 24 hours.', rate: '₹79/kg', commission: '10% Platform Booking Commission', provider: 'Dhanori Cleaners & Dryers' },
  { id: 'logistics', category: 'Transport', name: 'Society Mini-Logistics (Tata Ace)', desc: 'Hire a mini-truck for shifting furniture, appliances, or bulky items.', rate: '₹450 base + ₹15/km', commission: '10% Platform Booking Commission', provider: 'Pune Local Tempo Association' },
  { id: 'maid', category: 'Help', name: 'Standby Cook / Maid Service', desc: 'Get a temporary, verified replacement helper when your regular maid is on leave.', rate: '₹350/day (4 hours)', commission: '₹50 Match Fee', provider: 'Sampark Domestic Helpline' },
  { id: 'carwash', category: 'Cleaning', name: 'Daily Morning Car Wash', desc: 'Monthly subscription for daily cleaning of your vehicle in society parking lot.', rate: '₹600/month', commission: '10% Platform Booking Commission', provider: 'Dhanori Auto Washers' },
  { id: 'parcel', category: 'Transport', name: 'Hyperlocal Courier Dispatch', desc: 'Send keys, documents, lunchboxes anywhere in Dhanori instantly.', rate: '₹49 base + ₹8/km', commission: '20% Platform Runner Cut', provider: 'LocalSampark Active Runners' },
  { id: 'water', category: 'Delivery', name: 'Purified Water Can Delivery', desc: 'Get bulk 20-litre drinking water cans delivered straight to your kitchen door.', rate: '₹60/can', commission: '₹5 Platform Fee/can', provider: 'H2O Express Purity Services' },
  { id: 'deepclean', category: 'Cleaning', name: 'Full Home Deep Cleaning', desc: 'Get your flat vacuumed, kitchen scrubbed, bathrooms sanitized by professionals.', rate: '₹2,499 (2 BHK)', commission: '10% Platform Commission', provider: 'Sparkle Home Cleaners' },
  { id: 'homesalon', category: 'Salon', name: 'Doorstep Salon & Grooming', desc: 'Hair styling, facials, waxing, manicures, or massage therapies at home.', rate: '₹599 base', commission: '12% Booking Share', provider: 'Elite Home Salon Stylists' },
  { id: 'petgrooming', category: 'Pets', name: 'Pet Grooming & Vet Visit', desc: 'Home visits for pet washing, hair trim, nails, vaccinations, or vet companion walks.', rate: '₹399/session', commission: '10% platform commission', provider: 'Dhanori Pet Care Club' },
  { id: 'medicines', category: 'Delivery', name: 'Rapid Medicine Delivery', desc: 'Get prescription medicines delivered in 30 minutes from local pharmacies.', rate: '₹30 delivery fee', commission: '10% Pharmacy Share', provider: 'Pune Wellness Pharmacy' },
];

const CATEGORIES = ['All', 'Cleaning', 'Transport', 'Help', 'Delivery', 'Salon', 'Pets', 'Repair'];
const TIME_SLOTS = ['09:00 AM', '11:00 AM', '01:00 PM', '03:00 PM', '05:00 PM', '07:00 PM'];

export default function ServicesScreen() {
  const [services, setServices] = useState(STATIC_SERVICES);
  const [selectedService, setSelectedService] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  
  // Enhanced Booking state
  const [bookingDate, setBookingDate] = useState(new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingAddress, setBookingAddress] = useState('');
  const [promoCode, setPromoCode] = useState('');

  // Generate next 7 days for horizontal picker
  const dates = Array.from({length: 7}).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const result = await apiGet('/services/nearby', token);
        if (result.success && Array.isArray(result.data) && result.data.length > 0) {
          const dbServices = result.data.map(s => ({
            id: s.id, category: s.category || 'Repair', name: s.service_name, desc: `${s.category} Service`,
            rate: `₹${s.hourly_rate}/hr`, commission: '10% Platform Commission', provider: 'Local Verified Pro'
          }));
          setServices([...dbServices, ...STATIC_SERVICES]);
        }
      } catch (e) { /* Graceful fallback to static data */ }
    };
    fetchServices();
  }, []);

  const handleBook = (service) => { 
    setSelectedService(service); 
    setRequestSent(false); 
    setSelectedTime('');
    setBookingDate(new Date());
  };

  const confirmBooking = async () => {
    if (!selectedTime || !bookingAddress) {
      Alert.alert('Error', 'Please select a time slot and enter your address.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('token');
      const scheduled_time = `${bookingDate.toISOString().split('T')[0]} ${selectedTime}`;
      await apiPost('/services/book', { service_id: selectedService.id, scheduled_time, address: bookingAddress, promo: promoCode }, token);
    } catch (e) { /* Fallback */ }
    setRequestSent(true);
  };

  const filteredServices = services.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                          (s.desc || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Services</Text>
        <TouchableOpacity style={styles.historyBtn} onPress={() => router.push('/modules/service-booking')}>
          <Ionicons name="time-outline" size={18} color={COLORS.primary} style={{marginRight: 4}} />
          <Text style={styles.historyBtnText}>My Bookings</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={COLORS.textMuted} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search e.g. Laundry, Maid..."
            placeholderTextColor={COLORS.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Services Grid */}
        {filteredServices.map(s => {
          const iconConfig = getServiceIcon(s.id);
          return (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.iconContainer, { backgroundColor: iconConfig.color + '15' }]}>
                  <Ionicons name={iconConfig.name} size={22} color={iconConfig.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{s.name}</Text>
                  <View style={styles.ratingRow}>
                    <Ionicons name="star" size={12} color="#f59e0b" />
                    <Text style={styles.ratingText}> 4.8 • 120 Reviews</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.cardDesc} numberOfLines={2}>{s.desc}</Text>
              <View style={styles.providerRow}>
                <Ionicons name="person-outline" size={12} color={COLORS.textMuted} />
                <Text style={styles.providerText}> {s.provider}</Text>
              </View>

              <View style={styles.cardFooter}>
                <Text style={styles.rateText}>{s.rate}</Text>
                <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(s)} activeOpacity={0.7}>
                  <Text style={styles.bookBtnText}>Book Now</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {filteredServices.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color={COLORS.border} />
            <Text style={styles.emptyTitle}>No services found</Text>
            <Text style={styles.emptyDesc}>Try adjusting your search.</Text>
          </View>
        )}
      </ScrollView>

      {/* Booking Modal */}
      <Modal visible={!!selectedService} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.dragHandle} />

            {requestSent ? (
              <View style={styles.successState}>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={COLORS.accent} />
                </View>
                <Text style={styles.successTitle}>Booking Request Sent!</Text>
                <Text style={styles.successDesc}>Our local runner is matching you with the provider. Check status in My Bookings.</Text>
                <TouchableOpacity style={styles.closeFullBtn} onPress={() => { setSelectedService(null); }} activeOpacity={0.7}>
                  <Text style={styles.closeFullBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Confirm Booking</Text>
                  <TouchableOpacity onPress={() => setSelectedService(null)} style={styles.closeBtnCircle}>
                    <Ionicons name="close" size={18} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>

                <View style={styles.servicePreview}>
                  <Ionicons name={getServiceIcon(selectedService?.id).name} size={18} color={COLORS.primary} />
                  <Text style={styles.servicePreviewText}>{selectedService?.name}</Text>
                </View>

                {/* Date Selection */}
                <Text style={styles.label}>Select Date</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateSelector}>
                  {dates.map((d, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.dateCard, bookingDate.getDate() === d.getDate() && styles.dateCardActive]}
                      onPress={() => setBookingDate(d)}
                    >
                      <Text style={[styles.dateDay, bookingDate.getDate() === d.getDate() && styles.dateTextActive]}>
                        {d.toLocaleDateString('en-US', { weekday: 'short' })}
                      </Text>
                      <Text style={[styles.dateNum, bookingDate.getDate() === d.getDate() && styles.dateTextActive]}>
                        {d.getDate()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Time Selection */}
                <Text style={styles.label}>Select Time</Text>
                <View style={styles.timeGrid}>
                  {TIME_SLOTS.map((time, idx) => (
                    <TouchableOpacity 
                      key={idx} 
                      style={[styles.timeCard, selectedTime === time && styles.timeCardActive]}
                      onPress={() => setSelectedTime(time)}
                    >
                      <Text style={[styles.timeText, selectedTime === time && styles.timeTextActive]}>{time}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Address */}
                <Text style={styles.label}>Address / Landmark</Text>
                <TextInput 
                  style={[styles.input, { height: 80, textAlignVertical: 'top' }]} 
                  multiline 
                  placeholder="Flat No, Wing, Society Name..." 
                  placeholderTextColor={COLORS.textLight} 
                  value={bookingAddress} 
                  onChangeText={setBookingAddress} 
                />

                {/* Promo Code */}
                <View style={styles.promoRow}>
                  <Ionicons name="ticket-outline" size={20} color={COLORS.primary} />
                  <TextInput 
                    style={styles.promoInput} 
                    placeholder="Apply Promo Code" 
                    value={promoCode} 
                    onChangeText={setPromoCode} 
                  />
                  {promoCode.length > 0 && <Text style={styles.promoApply}>APPLY</Text>}
                </View>

                <View style={styles.priceBreakdown}>
                  <View style={styles.priceRow}><Text style={styles.priceLabel}>Service Cost</Text><Text style={styles.priceValue}>{selectedService?.rate}</Text></View>
                  <View style={styles.priceRow}><Text style={styles.priceLabel}>Visiting Charge</Text><Text style={styles.priceValue}>₹49</Text></View>
                  <View style={[styles.priceRow, { borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 8, marginTop: 8 }]}><Text style={[styles.priceLabel, { fontWeight: '700' }]}>Estimated Total</Text><Text style={[styles.priceValue, { color: COLORS.primary, fontWeight: '700' }]}>{selectedService?.rate} + ₹49</Text></View>
                </View>

                <View style={styles.modalBtnRow}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedService(null)}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking} activeOpacity={0.7}><Text style={styles.confirmBtnText}>Confirm Booking</Text></TouchableOpacity>
                </View>
              </ScrollView>
            )}
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
  historyBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: BORDER_RADIUS.full },
  historyBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  searchContainer: { backgroundColor: COLORS.backgroundAlt, paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontSize: FONT_SIZES.base, color: COLORS.text },
  
  categoryContainer: { backgroundColor: COLORS.backgroundAlt, paddingBottom: SPACING.md },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  categoryTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryText: { color: COLORS.textMuted, fontWeight: '600' },
  categoryTextActive: { color: '#fff' },

  content: { padding: SPACING.lg, paddingBottom: 40, gap: SPACING.lg },

  card: { backgroundColor: COLORS.cardBg, padding: SPACING.lg, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.md },
  iconContainer: { width: 48, height: 48, borderRadius: BORDER_RADIUS.md, alignItems: 'center', justifyContent: 'center', marginRight: SPACING.md },
  cardTitle: { fontSize: FONT_SIZES.base, fontWeight: '800', color: COLORS.text, marginBottom: 2 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontWeight: '600' },

  cardDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, lineHeight: 18, marginBottom: SPACING.sm },
  providerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg },
  providerText: { fontSize: FONT_SIZES.xs, color: COLORS.textMuted, fontStyle: 'italic' },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: COLORS.borderLight, paddingTop: SPACING.lg },
  rateText: { fontSize: FONT_SIZES.md, fontWeight: '900', color: COLORS.primary },
  bookBtn: { backgroundColor: COLORS.primary, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, ...SHADOWS.glow },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.sm },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: FONT_SIZES.lg, fontWeight: '800', color: COLORS.text, marginTop: SPACING.lg },
  emptyDesc: { fontSize: FONT_SIZES.sm, color: COLORS.textMuted, marginTop: SPACING.xs },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.backgroundAlt, borderTopLeftRadius: BORDER_RADIUS['2xl'], borderTopRightRadius: BORDER_RADIUS['2xl'], padding: SPACING['2xl'], maxHeight: '90%' },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: SPACING.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xl },
  modalTitle: { fontSize: FONT_SIZES.xl, fontWeight: '800', color: COLORS.text },
  closeBtnCircle: { width: 32, height: 32, borderRadius: BORDER_RADIUS.full, backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },

  servicePreview: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xl },
  servicePreviewText: { fontSize: FONT_SIZES.base, fontWeight: '700', color: COLORS.text },

  label: { fontSize: FONT_SIZES.sm, fontWeight: '700', color: COLORS.textMuted, marginBottom: SPACING.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.lg, color: COLORS.text, fontSize: FONT_SIZES.base },
  
  dateSelector: { flexDirection: 'row', marginBottom: SPACING.lg },
  dateCard: { width: 60, height: 70, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  dateCardActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dateDay: { fontSize: 12, color: COLORS.textMuted, marginBottom: 4 },
  dateNum: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  dateTextActive: { color: '#fff' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.lg },
  timeCard: { width: '30%', paddingVertical: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, alignItems: 'center' },
  timeCardActive: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary },
  timeText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  timeTextActive: { color: COLORS.primary },

  promoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: BORDER_RADIUS.md, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  promoInput: { flex: 1, paddingVertical: SPACING.md, paddingHorizontal: SPACING.sm, fontSize: 14 },
  promoApply: { color: COLORS.primary, fontWeight: '800', fontSize: 12 },

  priceBreakdown: { backgroundColor: COLORS.background, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, marginBottom: SPACING.xl, borderWidth: 1, borderColor: COLORS.border },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  priceLabel: { fontSize: 14, color: COLORS.textMuted },
  priceValue: { fontSize: 14, color: COLORS.text, fontWeight: '500' },

  modalBtnRow: { flexDirection: 'row', gap: SPACING.md },
  cancelBtn: { flex: 1, paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.md, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', backgroundColor: COLORS.backgroundAlt },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: FONT_SIZES.base },
  confirmBtn: { flex: 2, backgroundColor: COLORS.primary, paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.md, alignItems: 'center', ...SHADOWS.glow },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: FONT_SIZES.base },

  successState: { alignItems: 'center', paddingVertical: 40 },
  successIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: COLORS.accentLight, alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  successTitle: { fontSize: FONT_SIZES['2xl'], fontWeight: '900', color: COLORS.accent, marginBottom: SPACING.md },
  successDesc: { fontSize: FONT_SIZES.base, color: COLORS.textMuted, textAlign: 'center', marginBottom: SPACING['2xl'], lineHeight: 22 },
  closeFullBtn: { backgroundColor: COLORS.accent, width: '100%', paddingVertical: SPACING.lg, borderRadius: BORDER_RADIUS.md, alignItems: 'center' },
  closeFullBtnText: { color: '#fff', fontWeight: '800', fontSize: FONT_SIZES.md },
});
