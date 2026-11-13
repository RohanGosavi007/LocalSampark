import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { loadShopFigures } from '../../../src/services/sellerTools';

/**
 * S7 on Android: the shop's real totals from its orders
 * (GET /shops/my-shop/analytics-data). Store views are not tracked yet and
 * show as "—", never as a number.
 */
export default function MerchantAnalytics() {
  const [figures, setFigures] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShopFigures()
      .then(setFigures)
      .catch((e) => setError((e && e.message) || 'Your shop figures could not be loaded.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Shop figures</Text>
        <Text style={styles.sub}>From your shop's recorded orders.</Text>
        {loading ? <ActivityIndicator style={{ marginTop: 24 }} /> : error ? (
          <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>
        ) : (
          <View style={styles.grid}>
            {figures.map((f) => (
              <View key={f.id} style={styles.card} testID={`figure-${f.id}`}>
                <Text style={styles.label}>{f.label}</Text>
                <Text style={styles.value}>{f.value}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16 },
  title: { fontSize: 22, fontWeight: '900', color: '#0f172a' },
  sub: { fontSize: 13, color: '#64748b', marginTop: 4 },
  error: { color: '#b91c1c', marginTop: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  card: { width: '47%', backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#e2e8f0' },
  label: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  value: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginTop: 6 },
});
