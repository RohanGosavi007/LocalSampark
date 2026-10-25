import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet } from '../../../src/lib/api';

export default function PromotionsScreen() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPromotions();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const res = await apiGet('/campaigns/geo-feed').catch(() => null);
      const list = Array.isArray(res?.data) ? res.data : (Array.isArray(res?.campaigns) ? res.campaigns : (Array.isArray(res) ? res : []));
      setPromotions(list);
    } catch (err) {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = (promoCode) => {
    Alert.alert(
      'Promo Code Applied! 🏷️',
      `Coupon "${promoCode}" is ready. Apply it at checkout for instant neighborhood savings!`,
      [
        { text: 'Done', style: 'default' },
        { text: 'Shop Now', onPress: () => router.push('/(tabs)/directory') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.title}>Promotions & Offers</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerBadge}>
            <Ionicons name="pricetag" size={16} color="#ffffff" style={{ marginRight: 4 }} />
            <Text style={styles.bannerBadgeText}>Neighborhood Deals</Text>
          </View>
          <Text style={styles.bannerTitle}>Verified Local Offers</Text>
          <Text style={styles.bannerSub}>Special savings sponsored directly by neighborhood shops in your territory.</Text>
        </View>

        <Text style={styles.sectionTitle}>Active Deals & Vouchers</Text>

        {loading ? (
          <ActivityIndicator color="#2563eb" size="large" style={{ marginTop: 24 }} />
        ) : promotions.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="gift-outline" size={48} color="#94a3b8" />
            <Text style={styles.emptyTitle}>No Active Vouchers Right Now</Text>
            <Text style={styles.emptySub}>Shops in your area post flash deals daily. Check back during festival and weekend sale hours!</Text>
            <TouchableOpacity style={styles.exploreBtn} onPress={() => router.push('/(tabs)/directory')}>
              <Text style={styles.exploreBtnText}>Browse Local Shops</Text>
            </TouchableOpacity>
          </View>
        ) : (
          promotions.map((p, idx) => (
            <View key={p.id || idx} style={styles.promoCard}>
              <View style={styles.promoTop}>
                <View style={styles.shopBadge}>
                  <Text style={styles.shopBadgeText}>{p.shop_name || 'Neighborhood Shop'}</Text>
                </View>
                <Text style={styles.discountText}>
                  {p.discount_percent ? `${p.discount_percent}% OFF` : (p.discount_amount ? `₹${p.discount_amount} OFF` : 'SPECIAL OFFER')}
                </Text>
              </View>

              <Text style={styles.promoTitle}>{p.title || p.campaign_title || 'Local Store Discount'}</Text>
              <Text style={styles.promoDesc}>{p.description || 'Valid on purchases above minimum bill amount.'}</Text>

              <View style={styles.promoFooter}>
                <View style={styles.codeContainer}>
                  <Text style={styles.codeText}>{p.promo_code || p.coupon_code || 'SAMPARKPROMO'}</Text>
                </View>
                <TouchableOpacity 
                  style={styles.claimBtn}
                  onPress={() => handleCopyCode(p.promo_code || p.coupon_code || 'SAMPARKPROMO')}
                >
                  <Text style={styles.claimBtnText}>Apply Deal</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Merchant Prompt */}
        <View style={styles.merchantCard}>
          <Text style={styles.merchantTitle}>Are you a local business owner?</Text>
          <Text style={styles.merchantSub}>Launch hyper-targeted promotions that reach 10,000+ residents in your postal zone.</Text>
          <TouchableOpacity 
            style={styles.merchantBtn}
            onPress={() => router.push('/shop-manager')}
          >
            <Text style={styles.merchantBtnText}>Promote Your Shop →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    padding: 16, 
    backgroundColor: '#ffffff', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderColor: '#e2e8f0'
  },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  scrollContent: { padding: 16 },
  
  banner: { 
    backgroundColor: '#1e40af', 
    borderRadius: 16, 
    padding: 20, 
    marginBottom: 20 
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 10
  },
  bannerBadgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  bannerTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 4 },
  bannerSub: { fontSize: 13, color: '#bfdbfe', lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 12 },

  emptyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 20
  },
  emptyTitle: { fontSize: 16, fontWeight: 'bold', color: '#334155', marginTop: 12, marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  exploreBtn: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  exploreBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },

  promoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#2563eb'
  },
  promoTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shopBadge: { backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  shopBadgeText: { fontSize: 11, fontWeight: '600', color: '#475569' },
  discountText: { fontSize: 14, fontWeight: '900', color: '#16a34a' },
  promoTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  promoDesc: { fontSize: 13, color: '#64748b', marginBottom: 12, lineHeight: 18 },
  promoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  codeContainer: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  codeText: { fontSize: 12, fontWeight: '700', color: '#1d4ed8', letterSpacing: 1 },
  claimBtn: { backgroundColor: '#0f172a', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 6 },
  claimBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' },

  merchantCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 8,
    marginBottom: 24
  },
  merchantTitle: { fontSize: 15, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  merchantSub: { fontSize: 12, color: '#64748b', lineHeight: 17, marginBottom: 12 },
  merchantBtn: { alignSelf: 'flex-start', backgroundColor: '#3b82f6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  merchantBtnText: { color: '#ffffff', fontSize: 12, fontWeight: 'bold' }
});
