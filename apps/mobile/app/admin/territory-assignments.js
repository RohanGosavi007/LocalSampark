import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, SafeAreaView, Alert
} from 'react-native';
import { apiGet, apiPost, apiDelete } from '../../src/lib/api';

export default function TerritoryAssignmentsScreen() {
  const [territories, setTerritories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [terrRes, assignRes] = await Promise.all([
        apiGet('/zones/hierarchy/v2').catch(() => ({ data: { territories: [] } })),
        apiGet('/admin/territory-assignments').catch(() => ({ data: [] })),
      ]);
      setTerritories(terrRes?.data?.territories || []);
      setAssignments(assignRes?.data || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const assignmentMap = useMemo(() => {
    const map = {};
    (assignments || []).forEach(a => { map[a.territory_id] = a; });
    return map;
  }, [assignments]);

  const filtered = useMemo(() => {
    if (!search) return territories;
    const q = search.toLowerCase();
    return territories.filter(t => t.name?.toLowerCase().includes(q) || t.pincode?.includes(q));
  }, [territories, search]);

  const handleRemove = (assignmentId) => {
    Alert.alert('Remove Assignment', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        try {
          await apiDelete(`/admin/territory-assignments/${assignmentId}`);
          loadData();
        } catch (e) { Alert.alert('Error', e.message); }
      }}
    ]);
  };

  const renderItem = ({ item }) => {
    const assignment = assignmentMap[item.id];
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.statusDot}>{assignment ? '🟢' : '⚪'}</Text>
          <View>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.pincode}>{item.pincode} • {item.tier}</Text>
            {assignment && (
              <Text style={styles.assignee}>👤 {assignment.user_name || 'Assigned'}</Text>
            )}
          </View>
        </View>
        {assignment && (
          <TouchableOpacity style={styles.removeBtn} onPress={() => handleRemove(assignment.id)}>
            <Text style={styles.removeBtnText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#e94560" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>🗺️ Territory Assignments</Text>
      <Text style={styles.subtitle}>{assignments.length} assigned / {territories.length} total</Text>

      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search territory..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={search} onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0c29', padding: 20 },
  title: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12,
    paddingHorizontal: 14, height: 44, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  searchIcon: { fontSize: 14, marginRight: 10 },
  searchInput: { flex: 1, color: '#fff', fontSize: 14 },
  card: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    padding: 14, marginBottom: 8,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { fontSize: 12 },
  name: { color: '#fff', fontWeight: '600', fontSize: 14 },
  pincode: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 2 },
  assignee: { color: '#4fc3f7', fontSize: 12, marginTop: 2 },
  removeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(244,67,54,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { color: '#f44336', fontSize: 14 },
});
