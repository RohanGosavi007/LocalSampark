import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { apiGet, apiPost } from '../../src/lib/api';
import { useZone } from '../../src/context/ZoneContext';

export default function GroupBuyScreen() {
  const router = useRouter();
  const { activeZone } = useZone();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const zoneId = activeZone?.id || 1;
        const data = await apiGet(`/group-buy/active?zoneId=${zoneId}`);
        setDeals(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to fetch group deals', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, [activeZone]);

  const handleJoin = async (dealId) => {
    setJoiningId(dealId);
    try {
      await apiPost(`/group-buy/${dealId}/join`, {});
      // Optimistically update
      setDeals(deals.map(d => d.id === dealId ? { ...d, current_buyers: parseInt(d.current_buyers) + 1 } : d));
      alert("Successfully joined the group deal!");
    } catch (err) {
      alert("Failed to join deal.");
    }
    setJoiningId(null);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#c084fc" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Group Buying</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <Ionicons name="people" size={48} color="#f3e8ff" />
          <Text style={styles.heroTitle}>Unlock Wholesale Prices</Text>
          <Text style={styles.heroSubtitle}>Team up with your society or neighborhood to buy directly from local wholesalers.</Text>
        </View>

        {deals.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="sad-outline" size={48} color="#6b7280" />
            <Text style={styles.emptyText}>No active deals in your area right now.</Text>
          </View>
        ) : (
          deals.map(deal => (
            <View key={deal.id} style={styles.dealCard}>
              <View style={styles.dealHeader}>
                <Text style={styles.dealTitle}>{deal.title}</Text>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{deal.scope.toUpperCase()}</Text>
                </View>
              </View>
              
              <View style={styles.priceRow}>
                <Text style={styles.priceText}>₹{deal.wholesale_price}</Text>
                <Text style={styles.retailText}>Wholesale Price</Text>
              </View>

              <View style={styles.progressContainer}>
                <View style={styles.progressLabels}>
                  <Text style={styles.progressText}>{deal.current_buyers} joined</Text>
                  <Text style={styles.progressText}>Goal: {deal.min_buyers}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <View 
                    style={[styles.progressBarFill, { width: `${Math.min(100, (deal.current_buyers / deal.min_buyers) * 100)}%` }]} 
                  />
                </View>
              </View>

              <TouchableOpacity 
                style={styles.joinBtn} 
                onPress={() => handleJoin(deal.id)}
                disabled={joiningId === deal.id}
              >
                {joiningId === deal.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.joinBtnText}>Join Deal</Text>
                )}
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#7e22ce' },
  backBtn: { padding: 8, marginRight: 8 },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16 },
  heroBanner: { backgroundColor: '#9333ea', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  heroTitle: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  heroSubtitle: { color: '#e9d5ff', textAlign: 'center', marginTop: 8, fontSize: 14 },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#6b7280', marginTop: 12, fontSize: 16, textAlign: 'center' },
  dealCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  dealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  dealTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', flex: 1, marginRight: 12 },
  badge: { backgroundColor: '#f3e8ff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeText: { color: '#7e22ce', fontSize: 10, fontWeight: 'bold' },
  priceRow: { marginBottom: 16 },
  priceText: { fontSize: 24, fontWeight: 'bold', color: '#059669' },
  retailText: { fontSize: 12, color: '#6b7280' },
  progressContainer: { marginBottom: 16 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressText: { fontSize: 12, color: '#4b5563', fontWeight: 'bold' },
  progressBarBg: { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  progressBarFill: { height: 8, backgroundColor: '#9333ea', borderRadius: 4 },
  joinBtn: { backgroundColor: '#7e22ce', padding: 14, borderRadius: 8, alignItems: 'center' },
  joinBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});
