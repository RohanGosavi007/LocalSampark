import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { API_BASE } from '../lib/api';
import { trackClick } from '../lib/telemetry';

/**
 * Search box with live suggestions.
 *
 * Backed by /ml/search/suggest, which prefix-matches the full-text index and
 * fuses it with content vectors — so "groc" surfaces grocery shops before the
 * word is finished, and a category match surfaces a shop whose name never
 * contains the term. Deliberately mirrors the web component of the same name so
 * both surfaces behave identically and their telemetry is comparable.
 *
 * Suggestions navigate; the box itself filters. Choosing a row opens that shop,
 * typing on runs the full search through useShopSearch. Conflating the two is
 * the usual way an autocomplete becomes annoying — the list shifts under your
 * thumb as results narrow and the action depends on timing.
 */

const DEBOUNCE_MS = 180;
const MIN_QUERY = 2;

export default function PredictiveSearchBar({
  value,
  onChange,
  onSubmit,
  onSelectShop,
  placeholder = 'Search shops, services, categories…',
  style,
  inputStyle,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const q = String(value || '').trim();

    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    if (q.length < MIN_QUERY) {
      setSuggestions([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      try {
        const res = await fetch(
          `${API_BASE}/ml/search/suggest?q=${encodeURIComponent(q)}&limit=6`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
      } catch {
        // A failed lookup closes the list and nothing else. Suggestions are an
        // accelerator; the search box keeps working without them.
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [value]);

  const choose = useCallback((item) => {
    // Attributed to its own surface, so the console can tell how much traffic
    // autocomplete actually carries rather than crediting it to the feed.
    trackClick('search_suggest', 'shop', item.id);
    Keyboard.dismiss();
    setOpen(false);
    if (typeof onSelectShop === 'function') onSelectShop(item);
  }, [onSelectShop]);

  const showList = open && value && String(value).trim().length >= MIN_QUERY
    && (suggestions.length > 0 || loading);

  return (
    <View style={[styles.wrapper, style]}>
      <TextInput
        value={value}
        onChangeText={(text) => { onChange(text); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onSubmitEditing={() => {
          setOpen(false);
          if (typeof onSubmit === 'function') onSubmit(value);
        }}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
        style={[styles.input, inputStyle]}
      />

      {showList ? (
        <View style={styles.dropdown}>
          {loading && suggestions.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color="#4f46e5" />
              <Text style={styles.loadingText}>Searching…</Text>
            </View>
          ) : (
            <FlatList
              data={suggestions}
              keyExtractor={(item) => String(item.id)}
              keyboardShouldPersistTaps="handled"
              // The dropdown sits inside a scrolling screen; it must not scroll
              // independently or the two gestures fight.
              scrollEnabled={false}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.row} onPress={() => choose(item)} activeOpacity={0.7}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  {item.category ? (
                    <Text style={styles.category} numberOfLines={1}>{item.category}</Text>
                  ) : null}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { position: 'relative', zIndex: 50 },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 6,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
    // Android needs elevation for the dropdown to paint above sibling views;
    // iOS needs the shadow. Both are set so it layers correctly on each.
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  row: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f1f5f9',
  },
  name: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  category: { fontSize: 12, color: '#64748b', marginTop: 2 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14 },
  loadingText: { fontSize: 13, color: '#64748b' },
});
