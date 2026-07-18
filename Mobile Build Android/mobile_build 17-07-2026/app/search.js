import React, { useState } from 'react';
import { View, TextInput, StyleSheet, FlatList, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);

  const handleSearch = (text) => {
    setQuery(text);
    if (text.length > 2) {
      // Mock search results
      setResults([
        { id: '1', title: `${text} Shop`, type: 'Shop', route: '/(tabs)' },
        { id: '2', title: `${text} Delivery Job`, type: 'Job', route: '/modules/delivery-dashboard' },
        { id: '3', title: `${text} Service Provider`, type: 'Service', route: '/(tabs)' }
      ]);
    } else {
      setResults([]);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={{ fontSize: 20 }}>←</Text></TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Search for shops, jobs, services..."
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
      </View>
      <FlatList
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
            <Text style={styles.emptyText}>{query.length > 2 ? 'No results found.' : 'Start typing to search...'}</Text>
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
