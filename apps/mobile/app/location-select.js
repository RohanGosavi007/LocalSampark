import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, SafeAreaView, StatusBar, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useLocationServices } from '../src/hooks/useLocationServices';
import { API_URL } from '../src/lib/api';

let LinearGradient = View;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch (e) {}

export default function LocationSelectScreen() {
  const router = useRouter();
  const { resolveFromPincode, resolveFromGPS, isLoading } = useLocationServices();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/zones/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setResults(data.data || []);
      } catch (e) { console.warn('Search failed:', e); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = async (zone) => {
    const pincode = zone.pincode || zone.pin;
    if (pincode) {
      const territory = await resolveFromPincode(pincode);
      if (territory) {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }
    }
  };

  const handleGPS = async () => {
    setDetecting(true);
    const territory = await resolveFromGPS();
    setDetecting(false);
    if (territory) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  };

  const renderItem = ({ item, index }) => (
    <TouchableOpacity
      style={[styles.resultItem, { opacity: 1 - index * 0.02 }]}
      onPress={() => handleSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.pinBadge}>
        <Text style={styles.pinBadgeText}>📍</Text>
      </View>
      <View style={styles.resultTextContainer}>
        <Text style={styles.resultName}>{item.name}</Text>
        <Text style={styles.resultSub}>{item.district} • {item.pincode}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0c29" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerEmoji}>📦</Text>
        <Text style={styles.headerTitle}>Select Delivery Location</Text>
        <Text style={styles.headerSub}>Search by pincode or area name</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter pincode or area name..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={setQuery}
          keyboardType="default"
          autoFocus
        />
        {searching && <ActivityIndicator size="small" color="#e94560" />}
      </View>

      {/* GPS Button */}
      <TouchableOpacity style={styles.gpsButton} onPress={handleGPS} disabled={detecting}>
        {detecting ? (
          <ActivityIndicator size="small" color="#4fc3f7" />
        ) : (
          <Text style={styles.gpsIcon}>📡</Text>
        )}
        <Text style={styles.gpsText}>
          {detecting ? 'Detecting location...' : 'Use my current GPS location'}
        </Text>
      </TouchableOpacity>

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item, i) => item.id || String(i)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          query.length >= 2 && !searching ? (
            <Text style={styles.emptyText}>No locations found for "{query}"</Text>
          ) : null
        }
      />

      {/* Skip Button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
      >
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  header: {
    alignItems: 'center',
    paddingTop: 30,
    paddingBottom: 20,
  },
  headerEmoji: { fontSize: 40, marginBottom: 8 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14,
    height: 50,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
  },
  gpsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
    borderStyle: 'dashed',
  },
  gpsIcon: { fontSize: 18, marginRight: 10 },
  gpsText: { color: '#4fc3f7', fontSize: 14, fontWeight: '600' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 80 },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  pinBadge: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(233,69,96,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pinBadgeText: { fontSize: 16 },
  resultTextContainer: { flex: 1 },
  resultName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  resultSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  arrow: { color: 'rgba(255,255,255,0.3)', fontSize: 22, fontWeight: '300' },
  emptyText: { color: 'rgba(255,255,255,0.3)', textAlign: 'center', marginTop: 30, fontSize: 14 },
  skipButton: {
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
  },
  skipText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },
});
