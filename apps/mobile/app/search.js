import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { apiGet } from '../src/lib/api';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  // Searches shops through GET /shops/search (debounced). The screen used to answer any three
  // letters with three results it made up from them ("<text> Shop", "<text> Delivery Job").
  useEffect(() => {
    const text = query.trim();
    if (text.length < 3) { setResults([]); setError(null); setSearching(false); return undefined; }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const r = await apiGet(`/shops/search?q=${encodeURIComponent(text)}`);
        if (mine !== seq.current) return;
        const rows = Array.isArray(r) ? r : (r && (r.shops || r.data)) || [];
        setResults(rows.map((x) => ({
          id: String(x.id),
          title: x.name || x.shop_name || 'Shop',
          type: x.category || 'Shop',
          route: `/modules/shops/${x.id}`,
        })));
        setError(null);
      } catch (e) {
        if (mine === seq.current) { setResults([]); setError(e.message || 'Search is unavailable right now.'); }
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query]);

  const handleSearch = setQuery;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Search for shops…"
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>
      <FlashList estimatedItemSize={100}
        data={results}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.resultItem} onPress={() => router.push(item.route)}>
            <View>
              <Text style={styles.resultTitle}>{item.title}</Text>
              <Text style={styles.resultType}>{item.type}</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{error ? error : searching ? 'Searching…' : query.trim().length > 2 ? 'No shops found.' : 'Type at least 3 letters to search…'}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', gap: 12 },
  backBtn: { padding: 8 },
  input: { flex: 1, height: 40, backgroundColor: '#f1f5f9', borderRadius: 8, paddingHorizontal: 16, fontSize: 16 },
  resultItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#0f172a' },
  resultType: { fontSize: 12, color: '#64748b', marginTop: 4 },
  arrow: { fontSize: 18, color: '#cbd5e1' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 15 }
});
