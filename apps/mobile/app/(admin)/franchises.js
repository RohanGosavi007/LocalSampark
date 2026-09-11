import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { apiGet, apiPut } from '../../src/lib/api';

/**
 * Franchise mapping, in the admin app.
 *
 * Three partners were listed who do not exist — "Pune East Partners, Rahul
 * Desai, pincodes 411014/411006, 45 shops, 20% cut"; "Mumbai North Ops, Sneha
 * Patel, 112 shops, 18%"; "Delhi NCR Central, Amit Singh, 78 shops, 25%" — and
 * an operator reading this screen would have believed the platform had 235
 * shops running under three signed territory agreements.
 *
 * "Edit Revenue Split" was worse than decorative. It wrote the new percentage
 * into React state, fired a success haptic and announced "Franchise revenue
 * split updated successfully." No request was made. The operator was told a
 * commission rate had been changed — a number that decides what a partner is
 * paid — and reopening the screen showed the old rate.
 *
 * /franchise/all returns the real partners; the split now writes through
 * /franchise/:id/commission and the dialog reports failure when it fails.
 */
export default function FranchisesScreen() {
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async ({ isRefresh = false } = {}) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const res = await apiGet('/franchise/all');
      setFranchises(
        (res?.data ?? []).map((f) => ({
          id: String(f.id),
          name: f.territory_name || 'Territory',
          owner: f.partner_name || 'Unassigned',
          zones: f.territory_pincode || '',
          shops: Number(f.merchants_onboarded) || 0,
          split: Number(f.commission_rate) || 0,
          status: String(f.status || 'pending'),
        }))
      );
      setError(null);
    } catch (err) {
      setFranchises([]);
      // /franchise/all is admin-only; a non-admin operator gets 403 here.
      setError(err?.message || 'Could not load franchise partners.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSaveSplit = useCallback(async () => {
    if (!editModal) return;
    const rate = Number(editModal.split);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      Alert.alert('Invalid split', 'Enter a percentage between 0 and 100.');
      return;
    }

    setSaving(true);
    try {
      await apiPut(`/franchise/${editModal.id}/commission`, { commissionRate: rate });
      setFranchises((prev) => prev.map((f) => (f.id === editModal.id ? { ...f, split: rate } : f)));
      setEditModal(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', `${editModal.name} is now on a ${rate}% commission.`);
    } catch (err) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Not saved', err?.message || 'The commission rate was not changed.');
    } finally {
      setSaving(false);
    }
  }, [editModal]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{
        title: 'Franchise Mapping',
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#0f172a',
      }} />

      {loading ? (
        <View style={styles.centre}><ActivityIndicator size="large" color="#3b82f6" /></View>
      ) : (
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load({ isRefresh: true })} />}
      >
        <Text style={styles.headerTitle}>Franchise Partners</Text>
        <Text style={styles.headerDesc}>Manage territory partners and configure revenue splits.</Text>

        {error && (
          <View style={styles.errorCard}><Text style={styles.errorText}>{error}</Text></View>
        )}

        {franchises.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>
              No franchise partners have been registered yet.
            </Text>
          </View>
        )}

        {franchises.map((f) => (
          <View key={f.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.franchiseId}>{f.status.toUpperCase()}</Text>
              <Text style={styles.franchiseSplit}>{f.split}% Cut</Text>
            </View>

            <Text style={styles.franchiseName}>{f.name}</Text>
            <Text style={styles.franchiseOwner}>{f.owner}</Text>

            <View style={styles.statsRow}>
              <Text style={styles.statsText}>📍 {f.zones || 'No pincode set'}</Text>
              <Text style={styles.statsText}>🏪 {f.shops} Shops</Text>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setEditModal({ ...f });
              }}
            >
              <Text style={styles.editBtnText}>Edit Revenue Split</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
      )}

      {/* Edit Modal */}
      <Modal visible={!!editModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Split</Text>
            <Text style={styles.modalSubtitle}>Adjust commission for {editModal?.name}</Text>

            <Text style={styles.label}>Split Percentage (%)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editModal?.split === undefined || editModal?.split === null ? '' : String(editModal.split)}
              onChangeText={(t) => setEditModal({ ...editModal, split: t.replace(/[^0-9.]/g, '') })}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)} disabled={saving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSplit} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#ffffff" />
                  : <Text style={styles.saveBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  centre: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  headerDesc: { fontSize: 14, color: '#64748b', marginBottom: 24 },

  errorCard: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', padding: 12, borderRadius: 10, marginBottom: 16 },
  errorText: { color: '#b91c1c', fontSize: 13 },
  emptyCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  emptyText: { color: '#64748b', fontSize: 13, textAlign: 'center', lineHeight: 19 },

  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  franchiseId: { color: '#3b82f6', fontWeight: 'bold', fontSize: 12 },
  franchiseSplit: { backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 'bold', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, fontSize: 12 },

  franchiseName: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  franchiseOwner: { color: '#64748b', fontSize: 14, marginBottom: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  statsText: { color: '#f59e0b', fontWeight: '600', fontSize: 13 },

  editBtn: { backgroundColor: 'rgba(59, 130, 246, 0.15)', padding: 12, borderRadius: 8, alignItems: 'center' },
  editBtnText: { color: '#3b82f6', fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', width: '100%', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { color: '#64748b', fontSize: 14, marginBottom: 20 },

  label: { color: '#475569', fontSize: 14, marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', color: '#0f172a', padding: 12, borderRadius: 8, fontSize: 18, marginBottom: 24 },

  modalActions: { flexDirection: 'row', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#3b82f6', alignItems: 'center' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
});
