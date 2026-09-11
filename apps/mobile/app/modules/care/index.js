import React, { useState, useEffect, useCallback } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

import { apiGet, apiPost } from '../../../src/lib/api';

/**
 * Care Network.
 *
 * This screen used to render three hardcoded caregivers -- real-sounding names,
 * addresses, hourly rates and a "Background Checked" badge -- for people who do
 * not exist. Worse, "Pay Fee (₹150)" called nothing: it closed the modal and
 * announced "Match Fee Paid Successfully! The Match Fee of ₹150 has been
 * debited", so the app told a user money had left their account when no payment
 * had been attempted and no record was created anywhere.
 *
 * Both now come from the API: GET /care/providers for the list, POST
 * /care/request to register interest. Note that /care/request takes no payment
 * -- it inserts a care_requests row with status 'pending' -- so the fee copy is
 * gone entirely rather than reworded. Nothing in this flow charges anybody, and
 * the screen no longer claims otherwise.
 */
const ROLE_ICONS = {
  baby: '🍼', infant: '🍼', child: '🍼',
  senior: '👵', elder: '👵',
  pet: '🐕', dog: '🐕',
};

/** Rows come from care_providers, whose column names vary by dialect. */
function normalizeProvider(row) {
  const role = row.role || row.service_type || row.category || '';
  const iconKey = Object.keys(ROLE_ICONS).find((k) => role.toLowerCase().includes(k));
  let skills = row.skills;
  if (typeof skills === 'string') {
    try { skills = JSON.parse(skills); } catch { skills = skills.split(',').map((s) => s.trim()); }
  }
  return {
    id: row.id,
    name: row.name || row.full_name || 'Caregiver',
    role,
    rating: row.rating != null ? `${row.rating} ★` : null,
    experience: row.experience || row.experience_years || null,
    location: row.location || row.area || null,
    charge: row.charge || row.rate || null,
    verified: Boolean(row.is_verified ?? row.background_checked),
    skills: Array.isArray(skills) ? skills : [],
    icon: iconKey ? ROLE_ICONS[iconKey] : '❤️',
  };
}

function CareModule() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCare, setSelectedCare] = useState(null);
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/care/providers');
      const rows = Array.isArray(data) ? data : (data?.rows ?? data?.data ?? []);
      setCaregivers(rows.map(normalizeProvider));
    } catch (e) {
      // An empty list and a failed request must not look the same: one means
      // "no caregivers are listed yet", the other means "we could not ask".
      setError(e?.message || 'Could not load caregivers.');
      setCaregivers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProviders(); }, [loadProviders]);

  const handleMatch = (care) => {
    setSelectedCare(care);
    setAddress('');
    setShowModal(true);
  };

  const confirmMatch = async () => {
    if (!selectedCare || submitting) return;
    setSubmitting(true);
    try {
      await apiPost('/care/request', {
        provider_id: selectedCare.id,
        date: new Date().toISOString(),
        address,
      });
      setShowModal(false);
      Alert.alert(
        'Request sent',
        `Your request for ${selectedCare.name} has been recorded and is pending confirmation. You will be contacted once it is accepted.`
      );
    } catch (e) {
      // Stay on the modal so the request can be retried; closing it here would
      // look indistinguishable from success.
      Alert.alert(
        'Request not sent',
        `${e?.message || 'The request could not be submitted.'} Please try again.`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>❤️ Care Network</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Vetted Caregivers</Text>
          <Text style={styles.heroDesc}>Find verified local assistance for baby care, elder care, and pet care. Safe, society-vetted professionals.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 32 }} />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.role}>{error}</Text>
            <TouchableOpacity style={[styles.matchBtn, { marginTop: 12 }]} onPress={loadProviders}>
              <Text style={styles.matchBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : caregivers.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.role}>No caregivers are listed in your area yet.</Text>
          </View>
        ) : caregivers.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}><Text style={{fontSize: 32}}>{c.icon}</Text></View>
              <View style={styles.headerTextCol}>
                <Text style={styles.name}>{c.name}</Text>
                {/* Shown only when the provider record actually carries a
                    verification flag. It was previously printed unconditionally,
                    which vouched for people nobody had checked. */}
                {c.verified ? (
                  <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>✓ Background Checked</Text></View>
                ) : null}
              </View>
            </View>

            <Text style={styles.role}>
              {[c.role, c.experience ? `${c.experience} Exp` : null].filter(Boolean).join(' • ')}
            </Text>
            {(c.location || c.rating) ? (
              <Text style={styles.meta}>
                {[c.location ? `📍 ${c.location}` : null, c.rating].filter(Boolean).join(' • ')}
              </Text>
            ) : null}

            <View style={styles.skillsRow}>
              {c.skills.map(s => (
                <View key={s} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>
              ))}
            </View>

            <View style={styles.footer}>
              <View>
                {c.charge ? <Text style={styles.charge}>{c.charge}</Text> : null}
              </View>
              <TouchableOpacity style={styles.matchBtn} onPress={() => handleMatch(c)}>
                <Text style={styles.matchBtnText}>Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Match Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Request {selectedCare?.name || 'caregiver'}</Text>
            {/* No fee copy. POST /care/request creates a pending care_requests
                row and takes no payment, so promising that "a ₹150 match fee is
                processed securely" described something that never happened. */}
            <Text style={styles.modalDesc}>
              This sends a request to the caregiver. They will be in touch to confirm
              availability before anything is arranged.
            </Text>

            <Text style={styles.label}>Society Wing & flat</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. A-402, Pride Aashiyana"
              placeholderTextColor="#64748b"
              value={address}
              onChangeText={setAddress}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, {backgroundColor: '#e2e8f0'}]}
                onPress={() => setShowModal(false)}
                disabled={submitting}
              >
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, {backgroundColor: submitting ? '#93c5fd' : '#3b82f6'}]}
                onPress={confirmMatch}
                disabled={submitting}
              >
                <Text style={styles.modalBtnText}>{submitting ? 'Sending…' : 'Send request'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  
  heroSection: { alignItems: 'center', marginBottom: 24 },
  heroTitle: { color: '#0f172a', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  heroDesc: { color: '#64748b', textAlign: 'center', fontSize: 13, paddingHorizontal: 16 },

  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerTextCol: { flex: 1, alignItems: 'flex-start' },
  name: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  badgeSuccess: { backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeSuccessText: { color: '#10b981', fontSize: 10, fontWeight: 'bold' },
  
  role: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14, marginBottom: 4 },
  meta: { color: '#64748b', fontSize: 12, marginBottom: 12 },
  
  skillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  skillChip: { backgroundColor: '#ffffff', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  skillText: { color: '#475569', fontSize: 11 },
  
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#ffffff', paddingTop: 16 },
  charge: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  matchBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  matchBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#ffffff' },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalDesc: { color: '#64748b', fontSize: 13, marginBottom: 20 },
  label: { color: '#64748b', fontSize: 13, marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 12, marginBottom: 24 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
});

export default withRoleGuard(CareModule, 'care');
