import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Award, Star, Clock, ChevronRight, Gift } from 'lucide-react-native';

export default function MobileLoyaltyDashboard() {
  const [loading, setLoading] = useState(true);
  const [loyaltyData, setLoyaltyData] = useState(null);

  useEffect(() => {
    // Simulated fetch
    setTimeout(() => {
      setLoyaltyData({
        points: 1250,
        tier: 'Community Champion',
        nextTier: 'Local Legend',
        pointsToNext: 250,
        spinsAvailable: 2,
        recentEarned: [
          { id: '1', reason: 'Order from Sharma Grocery', points: '+50', date: 'July 5, 2026' },
          { id: '2', reason: 'Referral Bonus', points: '+500', date: 'July 1, 2026' }
        ]
      });
      setLoading(false);
    }, 800);
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Header Profile */}
        <View style={styles.header}>
          <Text style={styles.title}>Loyalty & Rewards</Text>
          <View style={styles.pointsCard}>
            <View style={styles.pointsRow}>
              <View>
                <Text style={styles.pointsLabel}>Total Points</Text>
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
                  <Star size={32} color="#fbbf24" fill="#fbbf24" />
                  <Text style={styles.pointsValue}>{loyaltyData.points}</Text>
                </View>
              </View>
              <View style={styles.tierBadge}>
                <Award size={16} color="#4f46e5" />
                <Text style={styles.tierText}>{loyaltyData.tier}</Text>
              </View>
            </View>
            
            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTextRow}>
                <Text style={styles.progressSubText}>Next: {loyaltyData.nextTier}</Text>
                <Text style={styles.progressSubText}>{loyaltyData.pointsToNext} pts left</Text>
              </View>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: '80%' }]} />
              </View>
            </View>
          </View>
        </View>

        {/* Spin Wheel Promo */}
        <TouchableOpacity style={styles.spinCard}>
          <View style={styles.spinIconWrap}><Gift size={24} color="#ea580c" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.spinTitle}>Spin the Wheel!</Text>
            <Text style={styles.spinDesc}>You have {loyaltyData.spinsAvailable} spins available. Win cashback!</Text>
          </View>
          <ChevronRight size={20} color="#ea580c" />
        </TouchableOpacity>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.historyCard}>
            {loyaltyData.recentEarned.map((item, index) => (
              <View key={item.id} style={[styles.historyItem, index !== loyaltyData.recentEarned.length -1 && styles.borderBottom]}>
                <View style={styles.historyIconWrap}><Clock size={16} color="#6b7280" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyReason}>{item.reason}</Text>
                  <Text style={styles.historyDate}>{item.date}</Text>
                </View>
                <Text style={styles.historyPoints}>{item.points}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 24, fontWeight: '900', color: '#111827', marginBottom: 16 },
  
  pointsCard: { backgroundColor: '#111827', borderRadius: 16, padding: 20 },
  pointsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  pointsLabel: { color: '#9ca3af', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
  pointsValue: { color: '#fff', fontSize: 36, fontWeight: '900' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, gap: 4 },
  tierText: { color: '#4f46e5', fontWeight: 'bold', fontSize: 12 },
  
  progressContainer: { marginTop: 24 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressSubText: { color: '#9ca3af', fontSize: 12, fontWeight: '600' },
  progressBarBg: { height: 8, backgroundColor: '#374151', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#4f46e5', borderRadius: 4 },

  spinCard: { margin: 16, backgroundColor: '#fff7ed', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#fed7aa' },
  spinIconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ffedd5', justifyContent: 'center', alignItems: 'center' },
  spinTitle: { fontSize: 16, fontWeight: 'bold', color: '#9a3412', marginBottom: 4 },
  spinDesc: { fontSize: 13, color: '#c2410c' },

  section: { paddingHorizontal: 16, paddingBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginBottom: 12 },
  historyCard: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: '#e5e7eb' },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  historyIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' },
  historyReason: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 2 },
  historyDate: { fontSize: 12, color: '#9ca3af' },
  historyPoints: { fontSize: 16, fontWeight: '900', color: '#10b981' }
});
