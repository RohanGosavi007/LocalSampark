import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Award, Star, Clock, ChevronRight, Gift } from 'lucide-react-native';
import { apiGet } from '../../src/lib/api';

/**
 * Coin tiers. The screen used to hardcode "Community Champion" progressing to
 * "Local Legend" with "250 pts left" and a progress bar pinned at 80% — three
 * numbers that had no relationship to each other or to the user. The thresholds
 * live here so the tier, the next tier, the gap and the bar are all derived from
 * the one balance the server reports.
 */
const TIERS = [
  { name: 'Neighbour', min: 0 },
  { name: 'Regular', min: 500 },
  { name: 'Community Champion', min: 1500 },
  { name: 'Local Legend', min: 5000 },
];

function tierFor(points) {
  let current = TIERS[0];
  for (const t of TIERS) if (points >= t.min) current = t;
  const next = TIERS[TIERS.indexOf(current) + 1] || null;
  const span = next ? next.min - current.min : 0;
  return {
    tier: current.name,
    nextTier: next ? next.name : null,
    pointsToNext: next ? next.min - points : 0,
    progress: next && span > 0 ? Math.min(100, Math.round(((points - current.min) / span) * 100)) : 100,
  };
}

export default function MobileLoyaltyDashboard() {
  const [loading, setLoading] = useState(true);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // A setTimeout used to hand back 1,250 points, a tier, two spins and an
    // earning history containing "Order from Sharma Grocery +50" — a reward
    // balance and a transaction log for purchases the user never made.
    // /loyalty/balance has existed the whole time.
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiGet('/loyalty/balance');
        const d = res?.data ?? res;
        const points = Number(d?.totalCoins) || 0;
        setLoyaltyData({
          points,
          ...tierFor(points),
          recentEarned: (d?.recentTransactions ?? []).map((t) => ({
            id: String(t.id),
            reason: t.source || t.type,
            points: `${t.type === 'burned' ? '-' : '+'}${Number(t.amount) || 0}`,
            date: t.date ? new Date(t.date).toLocaleDateString(undefined, {
              day: 'numeric', month: 'long', year: 'numeric',
            }) : '',
          })),
        });
      } catch (err) {
        setLoyaltyData(null);
        setError(err?.message || 'Could not load your rewards.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  if (!loyaltyData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>Rewards unavailable</Text>
          <Text style={styles.errorBody}>{error}</Text>
        </View>
      </SafeAreaView>
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
            {loyaltyData.nextTier ? (
              <View style={styles.progressContainer}>
                <View style={styles.progressTextRow}>
                  <Text style={styles.progressSubText}>Next: {loyaltyData.nextTier}</Text>
                  <Text style={styles.progressSubText}>{loyaltyData.pointsToNext} pts left</Text>
                </View>
                <View style={styles.progressBarBg}>
                  {/* The fill was hardcoded to 80% regardless of the balance. */}
                  <View style={[styles.progressBarFill, { width: `${loyaltyData.progress}%` }]} />
                </View>
              </View>
            ) : null}
          </View>
        </View>

        {/* Spin Wheel Promo */}
        <TouchableOpacity style={styles.spinCard}>
          <View style={styles.spinIconWrap}><Gift size={24} color="#ea580c" /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.spinTitle}>Spin the Wheel!</Text>
            {/* "You have 2 spins available" was invented; nothing counted
                spins. The wheel allows one a day, which is a statement the
                server can actually keep. */}
            <Text style={styles.spinDesc}>One free spin every day. Win cashback!</Text>
          </View>
          <ChevronRight size={20} color="#ea580c" />
        </TouchableOpacity>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.historyCard}>
            {loyaltyData.recentEarned.length === 0 ? (
              <View style={styles.historyItem}>
                <Text style={styles.historyDate}>No activity yet. Points you earn will appear here.</Text>
              </View>
            ) : loyaltyData.recentEarned.map((item, index) => (
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
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 8 },
  errorBody: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 20 },
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
