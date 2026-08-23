import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Modal } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { withRoleGuard } from '../../src/utils/permissions';

// 47 Services Ported from website
const SERVICES = [
  { id: 'laundry', category: 'Household & Cleaning', name: 'Premium Laundry & Dry Cleaning', desc: 'Doorstep pickup, wash, steam iron, and delivery within 24 hours.', icon: '🧼', rate: '₹79/kg', provider: 'Dhanori Cleaners & Dryers' },
  { id: 'logistics', category: 'Rentals & Logistics', name: 'Society Mini-Logistics (Tata Ace)', desc: 'Hire a mini-truck for shifting furniture, appliances, or bulky items.', icon: '🚛', rate: '₹450 base + ₹15/km', provider: 'Pune Local Tempo Association' },
  { id: 'maid', category: 'Household & Cleaning', name: 'Standby Cook / Maid Service', desc: 'Get a temporary, verified replacement helper when your regular maid is on leave.', icon: '🧹', rate: '₹350/day', provider: 'Sampark Domestic Helpline' },
  { id: 'carwash', category: 'Maintenance & Utility', name: 'Daily Morning Car Wash', desc: 'Monthly subscription for daily cleaning of your vehicle in society parking lot.', icon: '🚗', rate: '₹600/month', provider: 'Dhanori Auto Washers' },
  { id: 'parcel', category: 'Rentals & Logistics', name: 'Hyperlocal Courier & Runner Dispatch', desc: 'Send keys, documents, lunchboxes, or small parcels anywhere in Dhanori instantly.', icon: '📦', rate: '₹49 base', provider: 'LocalSampark Active Runners' },
  { id: 'water', category: 'Maintenance & Utility', name: 'Purified Water Can Delivery', desc: 'Get bulk 20-litre drinking water cans delivered straight to your kitchen door.', icon: '💧', rate: '₹60/can', provider: 'H2O Express Purity Services' },
  { id: 'wfh', category: 'Rentals & Logistics', name: 'WFH Tech & Power Backup Support', desc: 'Rent short-term high-speed router dongles, backup UPS batteries, or laptop setups.', icon: '🔌', rate: '₹250/day', provider: 'Dhanori IT Hub Rentals' },
  { id: 'catering', category: 'Events & Food', name: 'Home-Chef Mini Party Catering', desc: 'Order fresh home-cooked snacks, dynamic meals, or bakery platters for family gatherings.', icon: '🥘', rate: '₹180/plate', provider: 'Bhairav Nagar Home Cooks Guild' },
  { id: 'scrap', category: 'Maintenance & Utility', name: 'Verified Scrap Buyer (Kabadiwala)', desc: 'Schedule a verified local scrap buyer to visit your home to weigh and buy newspapers, plastics, or old electronics.', icon: '🗑️', rate: 'Market rates', provider: 'Dhanori Scrap Recycling Assoc.' },
  { id: 'gardening', category: 'Household & Cleaning', name: 'Balcony Gardening & Plant Nursery', desc: 'Book a professional gardener for soil replacement, pruning, plant setup, or balcony drip irrigation maintenance.', icon: '🪴', rate: '₹299/visit', provider: 'Green Leaf Nursery & Gardens' },
  { id: 'locksmith', category: 'Maintenance & Utility', name: 'Emergency Locksmith & Keymaker', desc: 'Get fast on-site support for lost keys, key duplication, digital lock installation, or jammed doors.', icon: '🔑', rate: '₹250 base fee', provider: 'Pune Digital Keys & Locksmiths' },
  { id: 'docs', category: 'Docs & Government', name: 'Local RTO & Document Assistance', desc: 'Get doorstep assistance for Aadhaar correction, passport scheduling, voter registration, or vehicle ownership transfer.', icon: '📄', rate: '₹150 consulting', provider: 'Dhanori Citizen Facilitation Center' },
  { id: 'bloodtest', category: 'Personal Care & Medical', name: 'Home Blood Sample Collection', desc: 'Book qualified path lab technicians to collect blood/urine samples from home for routine diagnostic profiles.', icon: '🩸', rate: '₹499', provider: 'Dhanori Lifeline Pathology Lab' },
  { id: 'medicines', category: 'Personal Care & Medical', name: 'Rapid Medicine Home Delivery', desc: 'Get prescription medicines delivered to your doorstep in 30 minutes from partner local pharmacies.', icon: '💊', rate: '₹30 delivery', provider: 'Pune Wellness Pharmacy' },
  { id: 'physio', category: 'Personal Care & Medical', name: 'Physiotherapist Home Visit', desc: 'Schedule verified local physiotherapists for elder recovery, orthopaedic rehabilitation, and pain management.', icon: '🧑‍⚕️', rate: '₹450/session', provider: 'Healing Touch Rehab Clinic' },
  { id: 'nurse', category: 'Personal Care & Medical', name: 'Home Nurse & Dressing Assistant', desc: 'On-call qualified nurses for insulin injections, surgical wound dressings, saline setups, or vital monitoring.', icon: '💉', rate: '₹200/visit', provider: 'Dhanori Care Nurses Group' },
  { id: 'deepclean', category: 'Household & Cleaning', name: 'Full Home Deep Cleaning & Sanitization', desc: 'Get your entire flat vacuumed, kitchen scrubbed, bathrooms sanitized, and balconies washed by professionals.', icon: '🏠', rate: '₹2,499 (2 BHK)', provider: 'Sparkle Home Cleaners' },
  { id: 'sofaspa', category: 'Household & Cleaning', name: 'Sofa & Carpet Vacuum/Dry Cleaning', desc: 'In-home wet extraction and shampooing for sofa sets, mattresses, curtains, and carpets.', icon: '🛋️', rate: '₹199/seat', provider: 'Dhanori Soft Clean Services' },
  { id: 'cctvtech', category: 'Maintenance & Utility', name: 'Smart Home & CCTV Installation', desc: 'Doorstep technician for router setups, CCTV security camera installations, or smart TV/lock setups.', icon: '💻', rate: '₹399/visit', provider: 'Dhanori Security & Tech Sol.' },
  { id: 'homesalon', category: 'Personal Care & Medical', name: 'Doorstep Salon & Grooming Spa', desc: 'Relax with hair styling, facials, waxing, manicures, or massage therapies delivered in your home.', icon: '💅', rate: '₹599 base package', provider: 'Elite Home Salon Stylists' },
  { id: 'tyreassist', category: 'Maintenance & Utility', name: 'Flat Tyre & Battery Jumpstart', desc: 'On-spot battery jumpstarts, tyre air top-up, puncture fixes, or spare wheel replacements.', icon: '🔧', rate: '₹190 base fee', provider: 'Dhanori Roadside Assist' },
  { id: 'toyrental', category: 'Rentals & Logistics', name: 'Kids Toy & Board Game Rental Library', desc: 'Get educational toys, puzzles, and family board games delivered to your doorstep. Exchange weekly.', icon: '🧸', rate: '₹399/month', provider: 'Dhanori Toyland Library' },
  { id: 'cutlery', category: 'Rentals & Logistics', name: 'Party Cutlery & Appliance Rental', desc: 'Rent premium dinner sets, buffet warmers, extra plastic chairs, or terrace barbecue setups.', icon: '🍽️', rate: '₹10/plate', provider: 'Goodwill Party Rentals' },
  { id: 'bookexchange', category: 'Rentals & Logistics', name: 'School Textbooks & Uniform Exchange', desc: 'Doorstep delivery and matching for second-hand textbooks, reference books, and local school uniforms.', icon: '🎒', rate: '₹99 match fee', provider: 'Local Book Exchange Forum' },
  { id: 'seniortech', category: 'Companions & Pet Care', name: 'Senior Citizen Tech & Companion Visit', desc: 'Friendly local companions to visit elder residents, assist with smartphone apps, or guide digital banking.', icon: '📱', rate: '₹200/hour', provider: 'Sampark Elder Helpers' },
  { id: 'gasbooking', category: 'Maintenance & Utility', name: 'Gas Cylinder Booking Assist', desc: 'Book HP, Indane, or Bharat gas cylinder refills delivered via local distributor.', icon: '🔥', rate: '₹30 booking fee', provider: 'Dhanori Gas Agency' },
  { id: 'newspaper', category: 'Docs & Government', name: 'Newspaper Subscription Setup', desc: 'Start, stop, or pause daily newspaper delivery (TOI, Sakal, Maharashtra Times) at your door.', icon: '📰', rate: 'Free setup', provider: 'Local Newspaper Distributors' },
  { id: 'evcharging', category: 'Maintenance & Utility', name: 'EV Charging Spot Locator', desc: 'Find, reserve, and pay for EV charging station sessions in local housing societies.', icon: '⚡', rate: '₹5 base + power', provider: 'Sampark EV Network' },
  { id: 'coworking', category: 'Rentals & Logistics', name: 'Local Coworking Desk Bookings', desc: 'Book premium high speed Wi-Fi workspaces or meeting desks hourly/daily in Dhanori.', icon: '🏢', rate: '₹99/day', provider: 'Dhanori Workspace Partners' },
  { id: 'rationcard', category: 'Docs & Government', name: 'Ration Card & Govt Portal Service', desc: 'Doorstep help for applying, updating, or transferring local ration card entries.', icon: '🏛️', rate: '₹200 service fee', provider: 'Citizen Facilitation Center' },
  { id: 'jyotish', category: 'Events & Food', name: 'Local Pandit & Jyotish Booking', desc: 'Hire verified local pandits for Satyanarayan puja, Griha Pravesh, or horoscope vastu readings.', icon: '🔮', rate: '₹500/session', provider: 'Dhanori Purohit Mandal' },
  { id: 'partyplanner', category: 'Events & Food', name: 'Birthday & Event Organizer', desc: 'Complete themed planning: balloon decor, custom cakes, sound setup, and party hosting.', icon: '🎂', rate: '₹3,999 base', provider: 'Dhanori Party Planners' },
  { id: 'passport', category: 'Docs & Government', name: 'Passport & Visa Documentation Support', desc: 'Doorstep application assistance, document verification, and appointment scheduling support.', icon: '🛂', rate: '₹300 consulting', provider: 'Citizen Facilitation Center' },
  { id: 'hallbooking', category: 'Events & Food', name: 'Marriage & Banquet Hall Finder', desc: 'Compare and book verified local mini-halls, banquet facilities, or community lawns.', icon: '💒', rate: 'Free quotes', provider: 'Pune Venue Association' },
  { id: 'courier', category: 'Rentals & Logistics', name: 'Local Courier Doorstep Pickups', desc: 'Schedule standard DTDC, Delhivery, or BlueDart parcel pickups straight from your home.', icon: '🏷️', rate: '₹20 fee', provider: 'Local Courier Partners' },
  { id: 'petgrooming', category: 'Companions & Pet Care', name: 'Pet Grooming & Vet Companion', desc: 'Home visits for pet washing, hair trim, nails, vaccinations, or vet clinic companion walks.', icon: '🐕', rate: '₹399/session', provider: 'Dhanori Pet Care Club' },
  { id: 'solarclean', category: 'Household & Cleaning', name: 'Solar Rooftop Panel Washing', desc: 'Routine cleaning of solar panel arrays to maintain solar energy capture efficiency.', icon: '☀️', rate: '₹299/visit', provider: 'Green Solar Cleansers' },
  { id: 'aquarium', category: 'Companions & Pet Care', name: 'Aquarium & Fish Tank Maintenance', desc: 'Water change, filter replacements, gravel washing, and fish health consultations.', icon: '🐠', rate: '₹250/visit', provider: 'Aquatic Life Dhanori' },
  { id: 'printing', category: 'Docs & Government', name: 'Document Printing & Stationery Delivery', desc: 'Upload documents and get high quality printouts, lamination, or spiral binding delivered.', icon: '🖨️', rate: '₹10 fee', provider: 'Pune Xerox & Prints' },
  { id: 'fumigation', category: 'Household & Cleaning', name: 'Home Fumigation & Pest Spraying', desc: 'Sanitizing misting and disinfection spray treatment for safety against seasonal illness.', icon: '🧴', rate: '₹999/session', provider: 'Dhanori Pest Control' },
  { id: 'borewell', category: 'Maintenance & Utility', name: 'Borewell & Water Tank Contractors', desc: 'Borewell drilling, tank leakage sealing, pump motor repairs, and deep well cleaning.', icon: '🚰', rate: '₹500 base', provider: 'Dhanori Pump & Pipe Techs' },
  { id: 'eldercompanion', category: 'Companions & Pet Care', name: 'Elderly Companion & Tech Guide', desc: 'Friendly visits to assist elder citizens with smart apps, bill payments, or walking guides.', icon: '👵', rate: '₹200/hour', provider: 'Sampark Care Companions' },
  { id: 'fireextinguisher', category: 'Maintenance & Utility', name: 'Fire Extinguisher Refill & AMC', desc: 'Refilling, hydrostatic pressure testing, and certification for home or society extinguishers.', icon: '🧯', rate: '₹350/unit', provider: 'Dhanori Fire & Safety' },
  { id: 'rainwater', category: 'Maintenance & Utility', name: 'Rainwater Harvesting Installation', desc: 'Turnkey rainwater collection pits, rooftop drainage connections, and filter setups.', icon: '🌧️', rate: '₹1,500 base', provider: 'Pune Eco Save' },
  { id: 'yoga', category: 'Personal Care & Medical', name: 'Personal Yoga & Fitness Trainer', desc: 'Book a certified personal trainer for morning yoga, Zumba, or fitness sessions in your building.', icon: '🧘‍♀️', rate: '₹500/session', provider: 'Fitness First Dhanori' },
  { id: 'makeup', category: 'Personal Care & Medical', name: 'Bridal & Event Makeup Artist', desc: 'Professional doorstep makeup and styling services for weddings, parties, and events.', icon: '💄', rate: '₹1,500 base', provider: 'Glamour House Studios' },
  { id: 'tiffin', category: 'Events & Food', name: 'Daily Tiffin & Meal Subscription', desc: 'Subscribe to healthy, home-cooked daily lunch and dinner tiffins delivered to your door.', icon: '🍱', rate: '₹80/meal', provider: 'Maa Ki Rasoi Dhanori' }
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
  const [requestSent, setRequestSent] = useState(false);

  const filteredServices = SERVICES.filter(s => {
    const matchesSearch = (s.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) || 
                          (s.desc || '').toLowerCase().includes((searchQuery || '').toLowerCase());
    const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBook = (service) => {
    setSelectedService(service);
    setRequestSent(false);
  };

  const confirmBooking = () => {
    setRequestSent(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Area */}
      <LinearGradient colors={['#e0e7ff', '#ffffff']} style={styles.hero}>
        <Text style={styles.heroTitle}>On-Demand Services</Text>
        <Text style={styles.heroSub}>Book 47 verified hyper-local services instantly</Text>
        
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
            
            <View style={styles.cardFooter}>
              <View>
                <Text style={styles.sRate}>{s.rate}</Text>
                <TouchableOpacity onPress={() => router.push(`/modules/service-detail?id=${s.id}`)}>
                  <Text style={styles.sProvider}>Provider: {s.provider} (⭐ 4.8) ›</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.bookBtn} onPress={() => handleBook(s)}>
                <Text style={styles.bookBtnText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* Booking Modal */}
      <Modal visible={!!selectedService} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {requestSent ? (
              <View style={styles.successState}>
                <Text style={{fontSize: 48, marginBottom: 16}}>🎉</Text>
                <Text style={styles.modalTitle}>Booking Request Sent!</Text>
                <Text style={styles.modalSub}>Our runner is connecting you with {selectedService?.provider}. You will be updated shortly.</Text>
                <TouchableOpacity style={styles.primaryBtn} onPress={() => setSelectedService(null)}>
                  <Text style={styles.primaryBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={styles.modalTitle}>Book {selectedService?.name}</Text>
                <Text style={styles.modalSub}>Rate: {selectedService?.rate}</Text>
                
                <Text style={styles.label}>Preferred Date & Time</Text>
                <TextInput style={styles.input} placeholder="e.g. Tomorrow 10:00 AM" placeholderTextColor="#94a3b8" />
                
                <Text style={styles.label}>Address / Landmark</Text>
                <TextInput style={styles.input} placeholder="e.g. Flat No, Society Name" placeholderTextColor="#94a3b8" />
                
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => setSelectedService(null)}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmBooking}>
                    <Text style={styles.primaryBtnText}>Confirm Request</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
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
  sRate: { fontSize: 16, fontWeight: '900', color: '#10b981', marginBottom: 4 },
  sProvider: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  
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
