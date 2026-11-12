import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { SORTS, searchCatalog, suggest, routeFor, rupees } from '../src/services/catalogSearch';

/**
 * C5: search the catalogue: products and shops, typo-tolerant, with
 * suggestions while typing and category, price and sort filters
 * (src/services/catalogSearch.js). It used to search shops alone.
 */
export default function GlobalSearch() {
  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [category, setCategory] = useState(null);
  const [sort, setSort] = useState('relevance');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [result, setResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  // Suggestions while typing (debounced), until a search is run.
  useEffect(() => {
    const q = text.trim();
    if (q.length < 2 || q === submitted) { setSuggestions([]); return undefined; }
    const mine = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const list = await suggest(q);
        if (mine === seq.current) setSuggestions(list);
      } catch {
        if (mine === seq.current) setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [text, submitted]);

  // The results, whenever the search or a filter changes.
  useEffect(() => {
    if (!submitted) { setResult(null); return undefined; }
    let cancelled = false;
    setSearching(true);
    setError(null);
    searchCatalog({ q: submitted, category, sort, minPrice, maxPrice })
      .then((r) => { if (!cancelled) setResult(r); })
      .catch((e) => { if (!cancelled) { setResult(null); setError(e.message || 'Search is unavailable right now.'); } })
      .finally(() => { if (!cancelled) setSearching(false); });
    return () => { cancelled = true; };
    // Prices apply when submitted (applyPrice), not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitted, category, sort]);

  const run = () => {
    const q = text.trim();
    if (q.length < 2) { setError('Type at least two letters to search.'); return; }
    setSuggestions([]);
    setCategory(null);
    setSubmitted(q);
  };

  const applyPrice = () => {
    if (!submitted) return;
    setSearching(true);
    searchCatalog({ q: submitted, category, sort, minPrice, maxPrice })
      .then(setResult)
      .catch((e) => setError(e.message || 'Search is unavailable right now.'))
      .finally(() => setSearching(false));
  };

  const open = (item) => {
    const route = routeFor(item);
    if (route) router.push(route);
  };

  const showSuggestions = suggestions.length > 0 && text.trim() !== submitted;
  const facets = result && result.facets;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Back"><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <TextInput
          testID="search-input"
          style={styles.input}
          placeholder="Search atta, bread, medicines, a shop…"
          value={text}
          onChangeText={setText}
          onSubmitEditing={run}
          returnKeyType="search"
          autoFocus
        />
      </View>

      {showSuggestions ? (
        <ScrollView keyboardShouldPersistTaps="handled">
          {suggestions.map((s) => (
            <TouchableOpacity key={`${s.type}-${s.id}`} style={styles.resultItem} onPress={() => open(s)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{s.label}</Text>
                <Text style={styles.resultType}>{s.type === 'shop' ? 'Shop' : s.sub}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.searchAll} onPress={run}>
            <Text style={styles.searchAllText}>Search for “{text.trim()}”</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <FlashList
          estimatedItemSize={88}
          data={result ? result.products : []}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={result ? (
            <View>
              {result.shops.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                  {result.shops.map((s) => (
                    <TouchableOpacity key={s.id} style={styles.chip} onPress={() => open({ type: 'shop', id: s.id })}>
                      <Text style={styles.chipText}>🏪 {s.name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
              {facets && facets.categories.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} testID="category-facet">
                  {facets.categories.map((c) => {
                    const on = String(category || '').toLowerCase() === c.name.toLowerCase();
                    return (
                      <TouchableOpacity key={c.name} accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]} onPress={() => setCategory(on ? null : c.name)}>
                        <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name} ({c.count})</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <View style={styles.row}>
                {SORTS.map((s) => (
                  <TouchableOpacity key={s.id} accessibilityState={{ selected: sort === s.id }} style={[styles.chip, sort === s.id && styles.chipOn]} onPress={() => setSort(s.id)}>
                    <Text style={[styles.chipText, sort === s.id && styles.chipTextOn]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              {facets && facets.price && (
                <View style={styles.row}>
                  <TextInput style={styles.price} placeholder={`Min ${rupees(facets.price.min)}`} keyboardType="decimal-pad" value={minPrice} onChangeText={setMinPrice} />
                  <TextInput style={styles.price} placeholder={`Max ${rupees(facets.price.max)}`} keyboardType="decimal-pad" value={maxPrice} onChangeText={setMaxPrice} />
                  <TouchableOpacity style={styles.chip} onPress={applyPrice}><Text style={styles.chipText}>Apply</Text></TouchableOpacity>
                </View>
              )}
              <Text style={styles.count}>{result.total} product{result.total === 1 ? '' : 's'}</Text>
            </View>
          ) : null}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.resultItem} onPress={() => open(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.resultTitle}>{item.name}</Text>
                <Text style={styles.resultType}>{item.shop.name}{item.netQuantity ? ` · ${item.netQuantity}` : ''}</Text>
              </View>
              <Text style={styles.priceText}>{rupees(item.price)}</Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {error || (searching ? 'Searching…' : submitted ? `No products found for “${submitted}”.` : 'Search every shop near you for products by name, brand or category.')}
              </Text>
            </View>
          )}
        />
      )}
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
  priceText: { fontSize: 16, fontWeight: '800', color: '#0f172a' },
  arrow: { fontSize: 18, color: '#cbd5e1' },
  searchAll: { padding: 16 },
  searchAllText: { color: '#2563eb', fontWeight: '700' },
  chips: { paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingVertical: 4, gap: 8, alignItems: 'center' },
  chip: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  chipOn: { borderColor: '#2563eb', backgroundColor: '#eff6ff' },
  chipText: { color: '#0f172a', fontSize: 13 },
  chipTextOn: { color: '#2563eb', fontWeight: '700' },
  price: { width: 110, height: 34, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 8, backgroundColor: '#fff' },
  count: { paddingHorizontal: 16, paddingVertical: 8, color: '#64748b' },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { color: '#64748b', fontSize: 15, textAlign: 'center' },
});
