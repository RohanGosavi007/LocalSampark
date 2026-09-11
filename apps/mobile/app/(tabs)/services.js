import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { withRoleGuard } from '../../src/utils/permissions';

// Service types offered through the app. Each entry previously also carried a
// `provider` — a named business such as "Dhanori Pest Control" or "Maa Ki Rasoi
// Dhanori" — and a `rate` like "₹999/session" or "₹80/meal". Those are facts
// about a particular provider, not about a service type, and no such business
// had agreed to either. The catalogue now describes what can be booked; who
// provides it and at what price comes from the shop directory.
const SERVICES = [
  { id: 'laundry', category: 'Household & Cleaning', name: 'Premium Laundry & Dry Cleaning', desc: 'Doorstep pickup, wash, steam iron, and delivery within 24 hours.', icon: '🧼' },
  { id: 'logistics', category: 'Rentals & Logistics', name: 'Society Mini-Logistics (Tata Ace)', desc: 'Hire a mini-truck for shifting furniture, appliances, or bulky items.', icon: '🚛' },
  { id: 'maid', category: 'Household & Cleaning', name: 'Standby Cook / Maid Service', desc: 'Get a temporary, verified replacement helper when your regular maid is on leave.', icon: '🧹' },
  { id: 'carwash', category: 'Maintenance & Utility', name: 'Daily Morning Car Wash', desc: 'Monthly subscription for daily cleaning of your vehicle in society parking lot.', icon: '🚗' },
  { id: 'parcel', category: 'Rentals & Logistics', name: 'Hyperlocal Courier & Runner Dispatch', desc: 'Send keys, documents, lunchboxes, or small parcels anywhere in Dhanori instantly.', icon: '📦' },
  { id: 'water', category: 'Maintenance & Utility', name: 'Purified Water Can Delivery', desc: 'Get bulk 20-litre drinking water cans delivered straight to your kitchen door.', icon: '💧' },
  { id: 'wfh', category: 'Rentals & Logistics', name: 'WFH Tech & Power Backup Support', desc: 'Rent short-term high-speed router dongles, backup UPS batteries, or laptop setups.', icon: '🔌' },
  { id: 'catering', category: 'Events & Food', name: 'Home-Chef Mini Party Catering', desc: 'Order fresh home-cooked snacks, dynamic meals, or bakery platters for family gatherings.', icon: '🥘' },
  { id: 'scrap', category: 'Maintenance & Utility', name: 'Verified Scrap Buyer (Kabadiwala)', desc: 'Schedule a verified local scrap buyer to visit your home to weigh and buy newspapers, plastics, or old electronics.', icon: '🗑️' },
  { id: 'gardening', category: 'Household & Cleaning', name: 'Balcony Gardening & Plant Nursery', desc: 'Book a professional gardener for soil replacement, pruning, plant setup, or balcony drip irrigation maintenance.', icon: '🪴' },
  { id: 'locksmith', category: 'Maintenance & Utility', name: 'Emergency Locksmith & Keymaker', desc: 'Get fast on-site support for lost keys, key duplication, digital lock installation, or jammed doors.', icon: '🔑' },
  { id: 'docs', category: 'Docs & Government', name: 'Local RTO & Document Assistance', desc: 'Get doorstep assistance for Aadhaar correction, passport scheduling, voter registration, or vehicle ownership transfer.', icon: '📄' },
  { id: 'bloodtest', category: 'Personal Care & Medical', name: 'Home Blood Sample Collection', desc: 'Book qualified path lab technicians to collect blood/urine samples from home for routine diagnostic profiles.', icon: '🩸' },
  { id: 'medicines', category: 'Personal Care & Medical', name: 'Rapid Medicine Home Delivery', desc: 'Get prescription medicines delivered to your doorstep in 30 minutes from partner local pharmacies.', icon: '💊' },
  { id: 'physio', category: 'Personal Care & Medical', name: 'Physiotherapist Home Visit', desc: 'Schedule verified local physiotherapists for elder recovery, orthopaedic rehabilitation, and pain management.', icon: '🧑‍⚕️' },
  { id: 'nurse', category: 'Personal Care & Medical', name: 'Home Nurse & Dressing Assistant', desc: 'On-call qualified nurses for insulin injections, surgical wound dressings, saline setups, or vital monitoring.', icon: '💉' },
  { id: 'deepclean', category: 'Household & Cleaning', name: 'Full Home Deep Cleaning & Sanitization', desc: 'Get your entire flat vacuumed, kitchen scrubbed, bathrooms sanitized, and balconies washed by professionals.', icon: '🏠' },
  { id: 'sofaspa', category: 'Household & Cleaning', name: 'Sofa & Carpet Vacuum/Dry Cleaning', desc: 'In-home wet extraction and shampooing for sofa sets, mattresses, curtains, and carpets.', icon: '🛋️' },
  { id: 'cctvtech', category: 'Maintenance & Utility', name: 'Smart Home & CCTV Installation', desc: 'Doorstep technician for router setups, CCTV security camera installations, or smart TV/lock setups.', icon: '💻' },
  { id: 'homesalon', category: 'Personal Care & Medical', name: 'Doorstep Salon & Grooming Spa', desc: 'Relax with hair styling, facials, waxing, manicures, or massage therapies delivered in your home.', icon: '💅' },
  { id: 'tyreassist', category: 'Maintenance & Utility', name: 'Flat Tyre & Battery Jumpstart', desc: 'On-spot battery jumpstarts, tyre air top-up, puncture fixes, or spare wheel replacements.', icon: '🔧' },
  { id: 'toyrental', category: 'Rentals & Logistics', name: 'Kids Toy & Board Game Rental Library', desc: 'Get educational toys, puzzles, and family board games delivered to your doorstep. Exchange weekly.', icon: '🧸' },
  { id: 'cutlery', category: 'Rentals & Logistics', name: 'Party Cutlery & Appliance Rental', desc: 'Rent premium dinner sets, buffet warmers, extra plastic chairs, or terrace barbecue setups.', icon: '🍽️' },
  { id: 'bookexchange', category: 'Rentals & Logistics', name: 'School Textbooks & Uniform Exchange', desc: 'Doorstep delivery and matching for second-hand textbooks, reference books, and local school uniforms.', icon: '🎒' },
  { id: 'seniortech', category: 'Companions & Pet Care', name: 'Senior Citizen Tech & Companion Visit', desc: 'Friendly local companions to visit elder residents, assist with smartphone apps, or guide digital banking.', icon: '📱' },
  { id: 'gasbooking', category: 'Maintenance & Utility', name: 'Gas Cylinder Booking Assist', desc: 'Book HP, Indane, or Bharat gas cylinder refills delivered via local distributor.', icon: '🔥' },
  { id: 'newspaper', category: 'Docs & Government', name: 'Newspaper Subscription Setup', desc: 'Start, stop, or pause daily newspaper delivery (TOI, Sakal, Maharashtra Times) at your door.', icon: '📰' },
  { id: 'evcharging', category: 'Maintenance & Utility', name: 'EV Charging Spot Locator', desc: 'Find, reserve, and pay for EV charging station sessions in local housing societies.', icon: '⚡' },
  { id: 'coworking', category: 'Rentals & Logistics', name: 'Local Coworking Desk Bookings', desc: 'Book premium high speed Wi-Fi workspaces or meeting desks hourly/daily in Dhanori.', icon: '🏢' },
  { id: 'rationcard', category: 'Docs & Government', name: 'Ration Card & Govt Portal Service', desc: 'Doorstep help for applying, updating, or transferring local ration card entries.', icon: '🏛️' },
  { id: 'jyotish', category: 'Events & Food', name: 'Local Pandit & Jyotish Booking', desc: 'Hire verified local pandits for Satyanarayan puja, Griha Pravesh, or horoscope vastu readings.', icon: '🔮' },
  { id: 'partyplanner', category: 'Events & Food', name: 'Birthday & Event Organizer', desc: 'Complete themed planning: balloon decor, custom cakes, sound setup, and party hosting.', icon: '🎂' },
  { id: 'passport', category: 'Docs & Government', name: 'Passport & Visa Documentation Support', desc: 'Doorstep application assistance, document verification, and appointment scheduling support.', icon: '🛂' },
  { id: 'hallbooking', category: 'Events & Food', name: 'Marriage & Banquet Hall Finder', desc: 'Compare and book verified local mini-halls, banquet facilities, or community lawns.', icon: '💒' },
  { id: 'courier', category: 'Rentals & Logistics', name: 'Local Courier Doorstep Pickups', desc: 'Schedule standard DTDC, Delhivery, or BlueDart parcel pickups straight from your home.', icon: '🏷️' },
  { id: 'petgrooming', category: 'Companions & Pet Care', name: 'Pet Grooming & Vet Companion', desc: 'Home visits for pet washing, hair trim, nails, vaccinations, or vet clinic companion walks.', icon: '🐕' },
  { id: 'solarclean', category: 'Household & Cleaning', name: 'Solar Rooftop Panel Washing', desc: 'Routine cleaning of solar panel arrays to maintain solar energy capture efficiency.', icon: '☀️' },
  { id: 'aquarium', category: 'Companions & Pet Care', name: 'Aquarium & Fish Tank Maintenance', desc: 'Water change, filter replacements, gravel washing, and fish health consultations.', icon: '🐠' },
  { id: 'printing', category: 'Docs & Government', name: 'Document Printing & Stationery Delivery', desc: 'Upload documents and get high quality printouts, lamination, or spiral binding delivered.', icon: '🖨️' },
  { id: 'fumigation', category: 'Household & Cleaning', name: 'Home Fumigation & Pest Spraying', desc: 'Sanitizing misting and disinfection spray treatment for safety against seasonal illness.', icon: '🧴' },
  { id: 'borewell', category: 'Maintenance & Utility', name: 'Borewell & Water Tank Contractors', desc: 'Borewell drilling, tank leakage sealing, pump motor repairs, and deep well cleaning.', icon: '🚰' },
  { id: 'eldercompanion', category: 'Companions & Pet Care', name: 'Elderly Companion & Tech Guide', desc: 'Friendly visits to assist elder citizens with smart apps, bill payments, or walking guides.', icon: '👵' },
  { id: 'fireextinguisher', category: 'Maintenance & Utility', name: 'Fire Extinguisher Refill & AMC', desc: 'Refilling, hydrostatic pressure testing, and certification for home or society extinguishers.', icon: '🧯' },
  { id: 'rainwater', category: 'Maintenance & Utility', name: 'Rainwater Harvesting Installation', desc: 'Turnkey rainwater collection pits, rooftop drainage connections, and filter setups.', icon: '🌧️' },
  { id: 'yoga', category: 'Personal Care & Medical', name: 'Personal Yoga & Fitness Trainer', desc: 'Book a certified personal trainer for morning yoga, Zumba, or fitness sessions in your building.', icon: '🧘‍♀️' },
  { id: 'makeup', category: 'Personal Care & Medical', name: 'Bridal & Event Makeup Artist', desc: 'Professional doorstep makeup and styling services for weddings, parties, and events.', icon: '💄' },
  { id: 'tiffin', category: 'Events & Food', name: 'Daily Tiffin & Meal Subscription', desc: 'Subscribe to healthy, home-cooked daily lunch and dinner tiffins delivered to your door.', icon: '🍱' }
];

const CATEGORIES = [
  'All',
  'Household & Cleaning',
  'Maintenance & Utility',
  'Personal Care & Medical',
  'Rentals & Logistics',
  'Events & Food',
  'Docs & Government',
  'Companions & Pet Care'
];

function ServicesModule() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [selectedService, setSelectedService] = useState(null);

  const filteredServices = SERVICES.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
                          (s.desc || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBook = (service) => {
    setSelectedService(service);
      };

  /**
   * Booking used to set a flag and show "Booking Request Sent! Our runner is
   * connecting you with <provider>" — naming an invented business, having sent
   * nothing anywhere. The date and address inputs were not bound to state
   * either, so even the details the customer typed went nowhere.
   *
   * There is no endpoint that books a service by category, so the flow now hands
   * off to the directory filtered to that category, where the customer picks a
   * real provider and books through the shop's own appointment flow.
   */
  const confirmBooking = () => {
    const category = selectedService?.category;
    setSelectedService(null);
    router.push(
      category
        ? `/(tabs)/directory?category=${encodeURIComponent(category)}`
        : '/(tabs)/directory'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <LinearGradient colors={['#e0e7ff', '#ffffff']} style={styles.hero}>
        <Text style={styles.heroTitle}>On-Demand Services</Text>
        {/* "47 verified" was a count of nothing — the catalogue length is what
            it is, and none of these are verified by anything. */}
        <Text style={styles.heroSub}>Find hyper-local services near you</Text>
        
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput 
            style={styles.searchInput} 
            placeholder="Search for plumber, laundry, doctor..." 
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </LinearGradient>

      {/* Categories Horizontal Scroll */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesScroll}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity 
              key={cat} 
              style={[styles.categoryTab, activeCategory === cat && styles.categoryTabActive]}
              onPress={() => setActiveCategory(cat)}
            >
              <Text style={[styles.categoryTabText, activeCategory === cat && styles.categoryTabTextActive]}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Services List */}
      <FlashList estimatedItemSize={100} 
        data={filteredServices}
        keyExtractor={s => s.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        getItemType={(item) => 'service_card'}
        ListEmptyComponent={<Text style={styles.noResults}>No services found matching your criteria</Text>}
        renderItem={({ item: s }) => (
          <View style={styles.serviceCard}>
            <View style={styles.cardHeader}>
              <View style={styles.iconWrapper}>
                <Text style={styles.icon}>{s.icon}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sName}>{s.name}</Text>
                <View style={styles.catBadge}>
                  <Text style={styles.catBadgeText}>{s.category}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.sDesc}>{s.desc}</Text>
            
            {/* Each card used to print a rate ("₹999/session") and a named
                provider with a fixed "⭐ 4.8" — a business, a price and a rating
                invented per service type. Providers and their prices come from
                the directory. */}
            <View style={styles.cardFooter}>
              <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(s)}>
                <Text style={styles.bookBtnText}>Find providers</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Booking Modal */}
      <Modal visible={!!selectedService} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <>
              <Text style={styles.modalTitle}>{selectedService?.name}</Text>
              <Text style={styles.modalSub}>{selectedService?.desc}</Text>

              {/* This modal used to collect a date and an address into inputs
                  bound to nothing, then report "Booking Request Sent! Our runner
                  is connecting you with <provider>" — naming an invented
                  business, having sent nothing anywhere. The customer is now
                  handed to the providers who can actually take the job. */}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedService(null)}>
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking}>
                  <Text style={styles.primaryBtnText}>See providers</Text>
                </TouchableOpacity>
              </View>
            </>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  hero: { padding: 24, paddingTop: 40, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', alignItems: 'center' },
  heroTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  heroSub: { fontSize: 14, color: '#64748b', marginBottom: 16 },
  
  searchContainer: { width: '100%', flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: '#e2e8f0', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 14, color: '#0f172a', fontSize: 15 },
  
  categoriesWrapper: { borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#ffffff' },
  categoriesScroll: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  categoryTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: 'transparent' },
  categoryTabActive: { backgroundColor: '#eff6ff', borderColor: '#3b82f6' },
  categoryTabText: { fontSize: 13, fontWeight: '600', color: '#64748b' },
  categoryTabTextActive: { color: '#3b82f6', fontWeight: 'bold' },

  scrollContent: { padding: 16 },
  serviceCard: { backgroundColor: '#ffffff', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconWrapper: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  icon: { fontSize: 24 },
  sName: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 6, paddingRight: 8 },
  
  catBadge: { alignSelf: 'flex-start', backgroundColor: '#f8fafc', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  catBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase' },
  
  sDesc: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  
  bookBtn: { backgroundColor: '#0f172a', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  bookBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  noResults: { textAlign: 'center', marginTop: 40, color: '#94a3b8', fontSize: 14 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  modalSub: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', padding: 14, borderRadius: 8, marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelBtnText: { fontWeight: 'bold', color: '#64748b' },
  confirmBtn: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  primaryBtn: { width: '100%', padding: 16, borderRadius: 12, backgroundColor: '#3b82f6', alignItems: 'center' },
  primaryBtnText: { fontWeight: 'bold', color: '#ffffff' },
  successState: { alignItems: 'center', paddingVertical: 20 }
});

export default withRoleGuard(ServicesModule, 'services');
