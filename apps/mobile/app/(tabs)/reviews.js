import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { apiGet } from '../../src/lib/api';

/**
 * Merchant-facing customer reviews.
 *
 * This screen was entirely invented. Three named customers — "Vikram Singh",
 * "Anita Deshmukh", "Rohan Patil" — with written testimonials nobody wrote
 * ("Fixed the AC in under 30 minutes"), above a summary card reading "4.8,
 * based on 42 reviews". Every merchant in the app, on their first day, opened
 * this tab to the same forty-two reviews and the same three quotes attributed to
 * people who had never been their customers.
 *
 * /shops/my-shop/reviews has existed the whole time; it now also returns a
 * computed average and count, so the summary card reflects the real ones.
 */
export default function ServiceReviews() {
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState({ average: null, count: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await apiGet('/shops/my-shop/reviews');
      const rows = res?.reviews ?? [];
      setReviews(
        rows.map((r) => ({
          id: String(r.id),
          // A review with no linked account shows as Customer rather than
          // borrowing a name from somewhere.
          customer: r.reviewer_name || 'Customer',
          rating: Number(r.rating) || 0,
          text: r.review_text || '',
          date: r.created_at
            ? new Date(r.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
            : '',
        }))
      );
      setSummary({
        average: res?.summary?.average ?? null,
        count: Number(res?.summary?.count) || rows.length,
      });
    } catch (err) {
      setReviews([]);
      setSummary({ average: null, count: 0 });
      setError(err?.message || 'Could not load your reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>⭐ Customer Reviews</Text>
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator color="#f59e0b" /></View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} tintColor="#f59e0b" />
          }
        >
          {/* The score card only appears once there is a score to show. */}
          {summary.average ? (
            <View style={styles.statsCard}>
              <Text style={styles.statsScore}>{summary.average.toFixed(1)}</Text>
              <View style={styles.starsRow}>
                <Text style={styles.starIcon}>
                  {'⭐'.repeat(Math.round(summary.average))}
                </Text>
              </View>
              <Text style={styles.statsTotal}>
                Based on {summary.count} review{summary.count === 1 ? '' : 's'}
              </Text>
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Recent Feedback</Text>

          {reviews.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {error ? 'Could not load your reviews' : 'No reviews yet'}
              </Text>
              <Text style={styles.stateBody}>
                {error || 'Reviews customers leave for your shop will appear here.'}
              </Text>
              {error ? (
                <TouchableOpacity style={styles.retryBtn} onPress={() => load({ isRefresh: true })}>
                  <Text style={styles.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : reviews.map(rev => (
            <View key={rev.id} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <Text style={styles.customerName}>{rev.customer}</Text>
                <Text style={styles.dateText}>{rev.date}</Text>
              </View>
              <View style={styles.starsRowSmall}>
                {Array(5).fill(0).map((_, i) => (
                  <Text key={i} style={{fontSize: 14}}>{i < rev.rating ? '⭐' : '☆'}</Text>
                ))}
              </View>
              {rev.text ? <Text style={styles.reviewText}>{rev.text}</Text> : null}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  content: { padding: 16 },
  statsCard: { backgroundColor: '#fff', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  statsScore: { fontSize: 44, fontWeight: '900', color: '#0f172a' },
  starsRow: { marginVertical: 6 },
  starIcon: { fontSize: 18, letterSpacing: 2 },
  statsTotal: { fontSize: 13, color: '#64748b', fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 12 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  customerName: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '600' },
  starsRowSmall: { flexDirection: 'row', marginBottom: 8 },
  reviewText: { fontSize: 14, color: '#475569', lineHeight: 20 },
  stateBox: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', margin: 16 },
  stateTitle: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  retryBtn: { marginTop: 20, backgroundColor: '#f59e0b', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, minHeight: 44, justifyContent: 'center' },
  retryBtnText: { color: '#fff', fontWeight: '900', fontSize: 13 },
});
