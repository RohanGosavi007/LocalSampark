import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

// Stub configurations for 13+ categories
const MANAGER_CONFIGS = {
  'pharmacy': { icon: 'medical', title: 'Pharmacy Manager', features: ['Prescription Approvals', 'Inventory (Batch & Expiry)', 'Delivery Tracking'] },
  'restaurant': { icon: 'restaurant', title: 'Restaurant POS', features: ['Dine-in Table Management', 'Kitchen Display System (KDS)', 'Menu Pricing'] },
  'salon': { icon: 'cut', title: 'Salon & Spa', features: ['Stylist Schedules', 'Appointment Calendar', 'Service Catalog'] },
  'grocery': { icon: 'cart', title: 'Grocery Inventory', features: ['Bulk Stock Update', 'Fresh Produce Expiry', 'Supplier Orders'] },
  'laundry': { icon: 'water', title: 'Laundry Management', features: ['Order Tracking', 'Weight/Piece Pricing', 'Delivery Routing'] },
  'hardware': { icon: 'hammer', title: 'Hardware Store', features: ['Tool Rentals', 'Contractor Invoices', 'Bulk Inventory'] },
  'electronics': { icon: 'hardware-chip', title: 'Electronics Shop', features: ['Warranty Tracking', 'Repair Tickets', 'Serial No. Inventory'] },
  'boutique': { icon: 'shirt', title: 'Fashion Boutique', features: ['Size/Color Variants', 'Seasonal Sales', 'Fitting Room Queue'] },
  'pet-shop': { icon: 'paw', title: 'Pet Shop & Grooming', features: ['Grooming Appointments', 'Live Animal Inventory', 'Pet Food Stock'] },
  'florist': { icon: 'flower', title: 'Florist', features: ['Custom Bouquets', 'Event Bookings', 'Freshness Tracker'] },
  'bakery': { icon: 'cafe', title: 'Bakery', features: ['Pre-orders (Cakes)', 'Daily Bake Schedule', 'Wastage Tracking'] },
  'tailor': { icon: 'scan', title: 'Tailor Shop', features: ['Measurement Profiles', 'Fabric Inventory', 'Alteration Queue'] },
  'gym': { icon: 'barbell', title: 'Gym & Fitness', features: ['Member Subscriptions', 'Trainer Roster', 'Class Bookings'] },
};

export default function ManagerDashboard() {
  const { category } = useLocalSearchParams();
  const router = useRouter();
  
  // Match category or fallback to generic
  const config = MANAGER_CONFIGS[category] || { icon: 'storefront', title: 'General Store Manager', features: ['Inventory', 'Orders', 'Customers'] };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{config.title}</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.banner}>
          <Ionicons name={config.icon} size={48} color="#3b82f6" />
          <Text style={styles.bannerTitle}>{config.title} Pro</Text>
          <Text style={styles.bannerSub}>Specialized management tools for your business category.</Text>
        </View>

        <Text style={styles.sectionTitle}>Category-Specific Features</Text>
        
        <View style={styles.featuresGrid}>
          {config.features.map((feature, idx) => (
            <TouchableOpacity key={idx} style={styles.featureCard}>
              <View style={styles.featureIconBg}>
                <Ionicons name="star" size={20} color="#3b82f6" />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
              <Text style={styles.stubText}>Coming Soon</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color="#6b7280" />
          <Text style={styles.infoText}>These specialized modules are currently under development. You will be notified when they are ready for beta testing.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e5e7eb' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  backBtn: { padding: 4 },
  placeholder: { width: 32 },
  
  content: { padding: 16 },
  
  banner: { backgroundColor: '#eff6ff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#bfdbfe' },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#1e3a8a', marginTop: 12, marginBottom: 4 },
  bannerSub: { fontSize: 14, color: '#3b82f6', textAlign: 'center' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937', marginBottom: 16 },
  
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', marginBottom: 24 },
  featureCard: { width: '48%', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'flex-start' },
  featureIconBg: { backgroundColor: '#eff6ff', padding: 8, borderRadius: 8, marginBottom: 12 },
  featureText: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 8 },
  stubText: { fontSize: 10, color: '#f59e0b', backgroundColor: '#fef3c7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontWeight: 'bold' },
  
  infoBox: { flexDirection: 'row', backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, alignItems: 'flex-start', gap: 12 },
  infoText: { flex: 1, fontSize: 14, color: '#4b5563', lineHeight: 20 }
});
