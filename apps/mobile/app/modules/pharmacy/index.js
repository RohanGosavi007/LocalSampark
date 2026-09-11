import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { apiGet } from '../../../src/lib/api';
import { fetchWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';

export default function PharmacyScreen() {
  const [activeTab, setActiveTab] = useState('medicines');
  const [searchQuery, setSearchQuery] = useState('');
  const [prescriptionImage, setPrescriptionImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { isDemo: demo } = await fetchWithFallback('/shops?category=Pharmacy', []);
      setIsDemo(demo);
    };
    load();
  }, []);

  const categories = [
    { id: '1', name: 'Fever & Pain', icon: 'thermometer-outline', color: '#ef4444' },
    { id: '2', name: 'Diabetes', icon: 'water-outline', color: '#3b82f6' },
    { id: '3', name: 'Vitamins', icon: 'leaf-outline', color: '#10b981' },
    { id: '4', name: 'First Aid', icon: 'medkit-outline', color: '#f59e0b' },
    { id: '5', name: 'Ayurvedic', icon: 'flower-outline', color: '#8b5cf6' }
  ];

  /**
   * "Popular medicines" listed four named drugs at fixed prices — Dolo 650 at
   * ₹30, Volini Spray at ₹120 — as though the platform stocked them at those
   * rates. Nothing does; medicine comes from whichever pharmacy fills the
   * prescription. Quoting a price for a specific drug the customer has not been
   * prescribed is not a listing the app can stand behind.
   *
   * "Nearby pharmacies" was three invented shops at invented distances, two of
   * them real national chains — "Apollo Pharmacy, 0.5 km, Main Road Dhanori,
   * OPEN NOW, 4.8" and "Wellness Forever". A customer could have set out for one.
   *
   * Real pharmacies come from the shop directory, which knows which ones exist
   * and where they are.
   */
  const [pharmacies, setPharmacies] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [storesError, setStoresError] = useState(null);

  useEffect(() => {
    const loadPharmacies = async () => {
      setStoresLoading(true);
      setStoresError(null);
      try {
        const res = await apiGet('/shops?category=pharmacy-healthcare');
        const rows = res?.shops ?? res?.data ?? (Array.isArray(res) ? res : []);
        setPharmacies(
          rows.map((sh) => ({
            id: String(sh.id),
            name: sh.name || 'Pharmacy',
            address: sh.address || null,
            // Distance is only shown when the API computed one against the
            // customer's location.
            distance: sh.distance ? `${sh.distance} km` : null,
            open: sh.is_active === 1 || sh.is_active === true,
            rating: Number(sh.rating) || null,
          }))
        );
      } catch (err) {
        setPharmacies([]);
        setStoresError(err?.message || 'Could not load nearby pharmacies.');
      } finally {
        setStoresLoading(false);
      }
    };
    loadPharmacies();
  }, []);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload prescriptions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPrescriptionImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error picking image:', error);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera permissions to take a picture of your prescription.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.8,
      });

      if (!result.canceled) {
        setPrescriptionImage(result.assets[0].uri);
      }
    } catch (error) {
      console.log('Error taking photo:', error);
    }
  };

  /**
   * This was a setTimeout. After two seconds it cleared the image and reported
   * "Upload Successful — Your prescription has been sent to our partner
   * pharmacists", having uploaded nothing anywhere. A patient waiting on
   * medicine would have been waiting on a request that did not exist.
   *
   * There is no prescription endpoint in the backend, so the flow now says what
   * is true and points the customer at the pharmacies they can contact.
   */
  const uploadPrescription = () => {
    if (!prescriptionImage) return;
    Alert.alert(
      'Prescription upload is not available yet',
      'We cannot send your prescription through the app yet. Pick a pharmacy from Nearby Stores and contact them directly.',
      [
        { text: 'Close', style: 'cancel' },
        { text: 'Nearby Stores', onPress: () => setActiveTab('pharmacies') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pharmacy & Medicine</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'medicines' && styles.tabBtnActive]} onPress={() => setActiveTab('medicines')}>
          <Text style={[styles.tabBtnText, activeTab === 'medicines' && styles.tabBtnTextActive]}>Medicines</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'prescription' && styles.tabBtnActive]} onPress={() => setActiveTab('prescription')}>
          <Text style={[styles.tabBtnText, activeTab === 'prescription' && styles.tabBtnTextActive]}>Prescription</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, activeTab === 'pharmacies' && styles.tabBtnActive]} onPress={() => setActiveTab('pharmacies')}>
          <Text style={[styles.tabBtnText, activeTab === 'pharmacies' && styles.tabBtnTextActive]}>Nearby Stores</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Medicines Tab */}
        {activeTab === 'medicines' && (
          <View>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color="#94a3b8" />
              <TextInput 
                style={styles.searchInput}
                placeholder="Search for medicines, health products..."
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            <Text style={styles.sectionTitle}>Shop by Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories.map(cat => (
                <TouchableOpacity key={cat.id} style={styles.categoryCard}>
                  <View style={[styles.categoryIcon, { backgroundColor: cat.color + '20' }]}>
                    <Ionicons name={cat.icon} size={28} color={cat.color} />
                  </View>
                  <Text style={styles.categoryName}>{cat.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* A "Popular Medicines" grid listed four named drugs at fixed
                prices with an ADD button that had no handler. Quoting ₹30 for
                Dolo 650 as though the platform sells it — and letting a customer
                tap ADD on a medicine nobody prescribed them — is not something
                this screen can honestly do. Prescriptions and the pharmacy
                directory below are the real paths. */}

            {/* Quick Prescription Upload Banner */}
            <TouchableOpacity style={styles.uploadBanner} onPress={() => setActiveTab('prescription')}>
              <View style={styles.uploadBannerContent}>
                <Text style={styles.uploadBannerTitle}>Have a Prescription?</Text>
                <Text style={styles.uploadBannerSub}>Upload it and we'll arrange your medicines.</Text>
              </View>
              <Ionicons name="document-text" size={40} color="#fff" style={{ opacity: 0.8 }} />
            </TouchableOpacity>
          </View>
        )}

        {/* Prescription Tab */}
        {activeTab === 'prescription' && (
          <View style={styles.prescriptionContainer}>
            <View style={styles.prescriptionHeader}>
              <View style={styles.iconCircle}>
                <Ionicons name="document-text-outline" size={32} color="#3b82f6" />
              </View>
              <Text style={styles.prescriptionTitle}>Upload Prescription</Text>
              <Text style={styles.prescriptionDesc}>
                Upload a valid prescription from your doctor. Our pharmacist will review it and add the correct medicines to your cart.
              </Text>
            </View>

            {prescriptionImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={prescriptionImage } style={styles.imagePreview}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
                <TouchableOpacity 
                  style={styles.removeImageBtn} 
                  onPress={() => setPrescriptionImage(null)}
                  disabled={isUploading}
                >
                  <Ionicons name="close-circle" size={32} color="#ef4444" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.primaryBtn, isUploading && styles.disabledBtn]} 
                  onPress={uploadPrescription}
                  disabled={isUploading}
                >
                  <Text style={styles.primaryBtnText}>
                    {isUploading ? 'Uploading...' : 'Submit to Pharmacist'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.uploadOptionsRow}>
                <TouchableOpacity style={styles.uploadOptionCard} onPress={takePhoto}>
                  <View style={[styles.optionIcon, { backgroundColor: '#eff6ff' }]}>
                    <Ionicons name="camera-outline" size={32} color="#3b82f6" />
                  </View>
                  <Text style={styles.optionText}>Take Photo</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.uploadOptionCard} onPress={pickImage}>
                  <View style={[styles.optionIcon, { backgroundColor: '#f0fdf4' }]}>
                    <Ionicons name="image-outline" size={32} color="#10b981" />
                  </View>
                  <Text style={styles.optionText}>Choose from Gallery</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.guidelinesBox}>
              <Text style={styles.guidelinesTitle}>Valid Prescription Guide</Text>
              <View style={styles.guideItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.guideText}>Must include doctor's signature or stamp</Text>
              </View>
              <View style={styles.guideItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.guideText}>Patient name and date should be visible</Text>
              </View>
              <View style={styles.guideItem}>
                <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                <Text style={styles.guideText}>Medicines and dosage must be clearly written</Text>
              </View>
            </View>
          </View>
        )}

        {/* Pharmacies Tab */}
        {activeTab === 'pharmacies' && (
          <View>
            <Text style={styles.sectionTitle}>Nearby Pharmacies</Text>

            {storesLoading ? (
              <View style={styles.stateBox}><ActivityIndicator color="#ef4444" /></View>
            ) : pharmacies.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={styles.stateTitle}>
                  {storesError ? 'Could not load pharmacies' : 'No pharmacies listed nearby'}
                </Text>
                <Text style={styles.stateBody}>
                  {storesError || 'Pharmacies in your area will appear here once they join.'}
                </Text>
              </View>
            ) : pharmacies.map(store => (
              <TouchableOpacity
                key={store.id}
                style={styles.storeCard}
                onPress={() => router.push(`/shops/${store.id}`)}
              >
                <View style={styles.storeIconContainer}>
                  <Ionicons name="medkit" size={24} color="#ef4444" />
                </View>
                <View style={styles.storeInfo}>
                  <Text style={styles.storeName}>{store.name}</Text>
                  {/* Address, distance and rating each render only when the shop
                      record carries them. */}
                  {(store.address || store.distance) ? (
                    <Text style={styles.storeAddress}>
                      {[store.address, store.distance].filter(Boolean).join(' • ')}
                    </Text>
                  ) : null}
                  <View style={styles.storeMetaRow}>
                    {store.rating ? (
                      <View style={styles.ratingBadge}>
                        <Ionicons name="star" size={12} color="#f59e0b" />
                        <Text style={styles.ratingText}>{store.rating}</Text>
                      </View>
                    ) : null}
                    <View style={[styles.statusBadge, store.open ? styles.openBadge : styles.closedBadge]}>
                      <Text style={[styles.statusText, store.open ? styles.openText : styles.closedText]}>
                        {store.open ? 'OPEN NOW' : 'CLOSED'}
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={24} color="#cbd5e1" />
              </TouchableOpacity>
            ))}
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  
  tabRow: { flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#e2e8f0' },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center', borderBottomWidth: 3, borderColor: 'transparent' },
  tabBtnActive: { borderColor: '#3b82f6' },
  tabBtnText: { fontWeight: '600', color: '#64748b' },
  tabBtnTextActive: { color: '#3b82f6', fontWeight: '700' },

  content: { padding: 16, paddingBottom: 40 },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, paddingHorizontal: 12, marginBottom: 24, height: 50 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#0f172a' },
  
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 16 },
  
  categoryScroll: { marginBottom: 24, marginHorizontal: -16, paddingHorizontal: 16 },
  categoryCard: { alignItems: 'center', marginRight: 20, width: 72 },
  categoryIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  categoryName: { fontSize: 12, fontWeight: '600', color: '#475569', textAlign: 'center' },
  
  
  uploadBanner: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  uploadBannerContent: { flex: 1, paddingRight: 16 },
  uploadBannerTitle: { color: '#fff', fontSize: 18, fontWeight: '800', marginBottom: 4 },
  uploadBannerSub: { color: '#bfdbfe', fontSize: 14, lineHeight: 20 },

  prescriptionContainer: { paddingVertical: 12 },
  prescriptionHeader: { alignItems: 'center', marginBottom: 32 },
  iconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  prescriptionTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a', marginBottom: 12 },
  prescriptionDesc: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  
  uploadOptionsRow: { flexDirection: 'row', gap: 16, marginBottom: 32 },
  uploadOptionCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderStyle: 'dashed' },
  optionIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  optionText: { fontSize: 15, fontWeight: '700', color: '#475569', textAlign: 'center' },
  
  imagePreviewContainer: { backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#e2e8f0', marginBottom: 32 },
  imagePreview: { width: '100%', height: 300, borderRadius: 12, resizeMode: 'cover' },
  removeImageBtn: { position: 'absolute', top: 24, right: 24, backgroundColor: '#fff', borderRadius: 16 },
  primaryBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  disabledBtn: { backgroundColor: '#94a3b8' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  guidelinesBox: { backgroundColor: '#f8fafc', borderRadius: 12, padding: 20, borderWidth: 1, borderColor: '#e2e8f0' },
  guidelinesTitle: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  guideItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  guideText: { fontSize: 14, color: '#475569', marginLeft: 12, flex: 1 },

  storeCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  storeIconContainer: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  storeInfo: { flex: 1 },
  storeName: { fontSize: 16, fontWeight: '700', color: '#0f172a', marginBottom: 4 },
  storeAddress: { fontSize: 13, color: '#64748b', marginBottom: 8 },
  storeMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ratingText: { fontSize: 12, fontWeight: '700', color: '#b45309', marginLeft: 4 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  openBadge: { backgroundColor: '#dcfce7' },
  closedBadge: { backgroundColor: '#f1f5f9' },
  statusText: { fontSize: 10, fontWeight: '800' },
  openText: { color: '#166534' },
  closedText: { color: '#64748b' }
});
