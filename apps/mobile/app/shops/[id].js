import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Store, MapPin, MessageCircle, Share2, Star, CheckCircle } from 'lucide-react-native';

import VisitorViewRouter from '../components/shops/VisitorViewRouter';
import { apiGet } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';

export default function ShopDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [shop, setShop] = useState(null);
  const [services, setServices] = useState([]);
  const [products, setProducts] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShopData();
  }, [id]);

  const fetchShopData = async () => {
    try {
      setLoading(true);
      // We assume standard API endpoints exist based on Web implementation
      const shopRes = await apiGet(`/shops/${id}`);
      setShop(shopRes.shop || shopRes);
      
      const bm = shopRes.shop?.category_details?.business_model || shopRes?.category_details?.business_model;
      
      if (bm === 'appointment' || bm === 'hybrid') {
          const srvRes = await apiGet(`/shops/${id}/services`);
          setServices(srvRes || []);
          const staffRes = await apiGet(`/shops/${id}/staff`);
          setStaff(staffRes || []);
      }
      if (bm === 'product' || bm === 'hybrid') {
          const prodRes = await apiGet(`/shops/${id}/products`);
          setProducts(prodRes || []);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load shop details.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (!shop) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Shop not found</Text>
      </View>
    );
  }

  const handleShare = () => {
    Alert.alert("Share", "Sharing shop link...");
  };

  const handleWhatsApp = () => {
    Alert.alert("WhatsApp", "Opening WhatsApp...");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header / Banner */}
        <View style={styles.headerCard}>
          {shop.is_premium === 1 && (
            <View style={styles.premiumBadge}>
              <Star size={12} color="#000" fill="#000" />
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}

          <View style={styles.headerTop}>
            <View style={styles.logoContainer}>
              {shop.photo_urls && JSON.parse(shop.photo_urls).length > 0 ? (
                <Image source={JSON.parse(shop.photo_urls)[0] } style={styles.logoImage}  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
              ) : (
                <Store size={40} color="#9ca3af" />
              )}
            </View>
            <View style={styles.headerInfo}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{shop.category_details?.name}</Text>
              </View>
              <Text style={styles.shopName} numberOfLines={2}>{shop.name}</Text>
              <View style={styles.addressRow}>
                <MapPin size={14} color="#6b7280" />
                <Text style={styles.addressText} numberOfLines={1}>{shop.address}</Text>
              </View>
            </View>
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={handleWhatsApp}>
              <MessageCircle size={16} color="#059669" />
              <Text style={styles.actionBtnText}>WhatsApp</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
              <Share2 size={16} color="#4f46e5" />
              <Text style={styles.actionBtnText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Category View Router */}
        <VisitorViewRouter 
          shop={shop} 
          services={services} 
          products={products} 
          staff={staff} 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: 16, color: '#6b7280' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  headerCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    position: 'relative'
  },
  premiumBadge: {
    position: 'absolute', top: 16, right: 16,
    backgroundColor: '#fbbf24',
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
    zIndex: 10
  },
  premiumText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  headerTop: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  logoContainer: {
    width: 80, height: 80, borderRadius: 16,
    backgroundColor: '#f9fafb', borderWidth: 1, borderColor: '#e5e7eb',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden'
  },
  logoImage: { width: '100%', height: '100%' },
  headerInfo: { flex: 1, justifyContent: 'center' },
  categoryBadge: {
    backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#ffedd5',
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8
  },
  categoryBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#ea580c' },
  shopName: { fontSize: 20, fontWeight: '900', color: '#111827', marginBottom: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addressText: { fontSize: 12, color: '#6b7280', flex: 1 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#fafafa'
  },
  actionBtnText: { fontSize: 13, fontWeight: 'bold', color: '#374151' }
});
