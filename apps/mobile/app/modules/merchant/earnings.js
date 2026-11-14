import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { myShopId, loadEarnings } from '../../../src/services/sellerTools';

/**
 * S4 on Android: the shop's earnings and settlements. LocalSampark settles
 * each shop's earnings to its bank account; there is nothing to request.
 */
export default function MerchantEarnings() {
  const [view, setView] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const id = await myShopId();
      setView(await loadEarnings(id));
    } catch (e) {
      setError((e && e.message) || 'Your earnings could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}>
        <Text style={styles.title}>Earnings & settlements</Text>
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
        ) : view && (
          <>
            <View style={styles.grid}>
              {view.figures.map((f) => (
                <View key={f.id} style={styles.card} testID={`earnings-${f.id}`}>
                  <Text style={styles.label}>{f.label}</Text>
                  <Text style={styles.value}>{f.value}</Text>
                </View>
              ))}
            </View>

            <Text style={styles.section}>Settlements</Text>
            <Text style={styles.note}>
              LocalSampark settles your earnings to your registered bank account — there is nothing to request. {view.settledSoFar} settled so far.
            </Text>
            {view.payouts.length === 0 ? <Text style={styles.note}>No settlements yet.</Text> : view.payouts.map((p) => (
              <View key={p.id} style={styles.row}>
                <Text style={styles.rowText}>{p.period}</Text>
                <Text style={styles.rowText}>{p.amount}</Text>
                <Text style={styles.rowText}>{p.status}</Text>
              </View>
            ))}

            <Text style={styles.section}>Delivered orders</Text>
            {view.transactions.length === 0 ? <Text style={styles.note}>No delivered orders yet.</Text> : view.transactions.map((t) => (
              <View key={t.id} style={styles.row}>
                <Text style={styles.rowText}>#{t.id.slice(0, 8).toUpperCase()}</Text>
                <Text style={styles.rowText}>{t.gross}</Text>
                <Text style={[styles.rowText, { color: '#b91c1c' }]}>{t.commission}</Text>
                <Text style={[styles.rowText, { fontWeight: '800' }]}>{t.net}</Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  error: { color: '#b91c1c', marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  value: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginTop: 6 },
  section: { fontSize: 16, fontWeight: '800', color: '#0f172a', marginTop: 24, marginBottom: 6 },
  note: { fontSize: 13, color: '#64748b', marginBottom: 8, lineHeight: 19 },
  row: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e2e8f0' },
  rowText: { fontSize: 13, color: '#334155' },
});
