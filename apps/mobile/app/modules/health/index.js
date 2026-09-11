import React, { useState, useEffect } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Animated, Linking, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { apiGet, apiPost } from '../../../src/lib/api';

/**
 * This screen listed three hospitals, three doctors and three pharmacies —
 * every one invented, each with a phone number and a "📞 Call" button wired to
 * Linking.openURL.
 *
 *   "Dhanori Lifeline Hospital, Multi-Specialty, 0.8 km, +91 98765 43212,
 *    24/7 Emergency"
 *   "Surya Mother & Child Care, Maternity, NICU Available"
 *   "Dr. Ajay Patil, General Physician, Goodwill Square Clinic,
 *    +91 98765 11110, Mon–Sat 9AM–1PM"
 *
 * Somebody with a sick child could have read "NICU Available, 1.5 km" and set
 * out, or dialled a number belonging to a stranger while looking for a
 * cardiologist. Distances, opening hours and specialities were all made up too.
 *
 * Doctors come from /medical/doctors and pharmacies from the shop directory.
 * Hospitals have no source in the backend at all, so that tab says so rather
 * than inventing three.
 */

// The national emergency numbers are facts about India, not records about this
// app's users, and they are the one thing on this screen that was always safe
// to dial.
const EMERGENCY_CONTACTS = [
  { label: 'Medical Ambulance', number: '108', color: '#ef4444' },
  { label: 'Police', number: '100', color: '#4f46e5' },
  { label: 'Fire Brigade', number: '101', color: '#f97316' },
  { label: 'Women Helpline', number: '1091', color: '#8b5cf6' },
];

function HealthModule() {
  const [sosActive, setSosActive] = useState(false);
  const [sosConfirmed, setSosConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [pharmacies, setPharmacies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      const [docRes, pharmRes] = await Promise.allSettled([
        apiGet('/medical/doctors'),
        apiGet('/shops?category=pharmacy-healthcare'),
      ]);

      if (docRes.status === 'fulfilled') {
        setDoctors(
          (docRes.value?.doctors ?? []).map((d) => ({
            name: d.name,
            spec: d.specialization || null,
            clinic: d.clinic_name || null,
            phone: d.phone || d.contact_number || null,
            timing: d.consulting_hours || null,
            icon: '🩺',
          }))
        );
      } else {
        setDoctors([]);
      }

      if (pharmRes.status === 'fulfilled') {
        const rows = pharmRes.value?.shops ?? pharmRes.value?.data ?? [];
        setPharmacies(
          (Array.isArray(rows) ? rows : []).map((p) => ({
            name: p.name,
            note: p.address || null,
            phone: p.phone_number || p.phone || null,
            icon: '💊',
          }))
        );
      } else {
        setPharmacies([]);
      }

      if (docRes.status === 'rejected' && pharmRes.status === 'rejected') {
        setLoadError('Could not load medical services. Check your connection.');
      }
      setLoading(false);
    };
    load();
  }, []);

  /**
   * This was a two-second setTimeout that then announced "SOS BROADCAST SENT —
   * All neighbors within 5km radius alerted. Local ambulance dispatched." No
   * neighbour was alerted and no ambulance was dispatched; nothing was called.
   */
  const handleSOS = () => {
    Alert.alert('🚨 Raise a medical emergency alert?', 'Your emergency contacts and local responders will be notified.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'RAISE ALERT',
        style: 'destructive',
        onPress: async () => {
          setSosActive(true);
          try {
            const res = await apiPost('/sos/trigger', { type: 'medical' });
            const notified = res?.data?.emergencyContacts?.length ?? 0;
            setSosConfirmed(true);
            setTimeout(() => setSosConfirmed(false), 6000);
            Alert.alert(
              'Alert raised',
              notified > 0
                ? `Recorded and sent to ${notified} emergency contact${notified === 1 ? '' : 's'}.\n\nFor an ambulance, call 108.`
                : 'Recorded. You have no emergency contacts saved.\n\nFor an ambulance, call 108.'
            );
          } catch (err) {
            Alert.alert(
              'Alert NOT sent',
              `${err?.message || 'Network error'}.\n\nCall 108 for an ambulance now.`,
              [
                { text: 'Close', style: 'cancel' },
                { text: 'Call 108', onPress: () => dialNumber('108') },
              ]
            );
          } finally {
            setSosActive(false);
          }
        },
      },
    ]);
  };

  const dialNumber = (phone) => {
    Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>⚕️ Health & SOS</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* SOS Button Section */}
        <View style={styles.sosSection}>
          <TouchableOpacity 
            style={[styles.sosBtn, sosActive && styles.sosBtnActive]} 
            onPress={handleSOS}
            activeOpacity={0.8}
          >
            <Text style={styles.sosIcon}>🚨</Text>
            <Text style={styles.sosText}>{sosActive ? 'SENDING...' : 'TRIGGER SOS'}</Text>
          </TouchableOpacity>
          <Text style={styles.sosWarning}>Caution: Broadcasts emergency alert to all verified neighbors and dispatches medical response.</Text>
        </View>

        {/* Emergency Contacts */}
        <View style={styles.emergencyGrid}>
          {EMERGENCY_CONTACTS.map(ec => (
            <TouchableOpacity key={ec.label} style={[styles.ecCard, {borderTopColor: ec.color}]} onPress={() => dialNumber(ec.number)}>
              <Text style={[styles.ecNumber, {color: ec.color}]}>{ec.number}</Text>
              <Text style={styles.ecLabel}>{ec.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {[
            { id: 'doctors', label: '🩺 Doctors' },
            { id: 'pharmacies', label: '💊 Pharmacies' },
          ].map(tab => (
            <TouchableOpacity 
              key={tab.id} 
              style={[styles.tabBtn, activeTab === tab.id && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={[styles.tabBtnText, activeTab === tab.id && styles.tabBtnTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.tabContent}>
          
          {loading ? (
            <View style={styles.stateBox}><ActivityIndicator color="#ef4444" /></View>
          ) : null}

          {!loading && activeTab === 'doctors' && doctors.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {loadError ? 'Could not load doctors' : 'No doctors listed yet'}
              </Text>
              <Text style={styles.stateBody}>
                {loadError || 'Doctors in your area will appear here once they are listed. For an emergency, use the numbers above.'}
              </Text>
            </View>
          ) : null}

          {!loading && activeTab === 'doctors' && doctors.map((d, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconBox}><Text style={styles.iconText}>{d.icon}</Text></View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{d.name}</Text>
                  {/* Speciality, clinic and hours print only when recorded. */}
                  {d.spec ? <Text style={styles.itemMeta}><Text style={{color: '#3b82f6'}}>{d.spec}</Text></Text> : null}
                  {d.clinic ? <Text style={styles.itemMeta}>{d.clinic}</Text> : null}
                  {d.timing ? <Text style={styles.itemMeta}>🕒 {d.timing}</Text> : null}
                </View>
              </View>
              {d.phone ? (
                <TouchableOpacity style={styles.actionBtn} onPress={() => dialNumber(d.phone)}>
                  <Text style={styles.actionBtnText}>📞 Call clinic</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ))}

          {!loading && activeTab === 'pharmacies' && pharmacies.length === 0 ? (
            <View style={styles.stateBox}>
              <Text style={styles.stateTitle}>
                {loadError ? 'Could not load pharmacies' : 'No pharmacies listed yet'}
              </Text>
              <Text style={styles.stateBody}>
                {loadError || 'Pharmacies in your area will appear here once they join.'}
              </Text>
            </View>
          ) : null}

          {!loading && activeTab === 'pharmacies' && pharmacies.map((p, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconBox}><Text style={styles.iconText}>{p.icon}</Text></View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{p.name}</Text>
                  {p.note ? <Text style={styles.itemMeta}>📍 {p.note}</Text> : null}
                </View>
              </View>
              <TouchableOpacity
                style={[styles.actionBtn, !p.phone && { opacity: 0.45 }]}
                disabled={!p.phone}
                onPress={() => dialNumber(p.phone)}
              >
                <Text style={styles.actionBtnText}>{p.phone ? '📞 Call Pharmacy' : 'No number listed'}</Text>
              </TouchableOpacity>
            </View>
          ))}

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stateBox: { backgroundColor: '#ffffff', borderRadius: 12, padding: 28, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  stateTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a', marginBottom: 8, textAlign: 'center' },
  stateBody: { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  
  sosSection: { alignItems: 'center', marginBottom: 24, marginTop: 16 },
  sosBtn: { 
    width: 180, height: 180, borderRadius: 90, 
    backgroundColor: '#ef4444', 
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 20,
    elevation: 10,
    marginBottom: 16
  },
  sosBtnActive: { backgroundColor: '#dc2626', transform: [{scale: 1.05}] },
  sosIcon: { fontSize: 40, marginBottom: 8 },
  sosText: { color: '#0f172a', fontSize: 16, fontWeight: 'bold' },
  sosWarning: { color: '#64748b', fontSize: 12, textAlign: 'center', paddingHorizontal: 20 },

  emergencyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 24 },
  ecCard: { width: '48%', backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', borderTopWidth: 3, marginBottom: 12, alignItems: 'center' },
  ecNumber: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  ecLabel: { color: '#475569', fontSize: 11 },

  tabContainer: { flexDirection: 'row', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: { borderBottomColor: '#3b82f6' },
  tabBtnText: { color: '#64748b', fontSize: 13, fontWeight: 'bold' },
  tabBtnTextActive: { color: '#0f172a' },

  tabContent: { flex: 1 },
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#ffffff', marginBottom: 12 },
  cardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: { width: 56, height: 56, borderRadius: 12, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconText: { fontSize: 24 },
  cardBody: { flex: 1 },
  itemName: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  itemMeta: { color: '#64748b', fontSize: 12, marginBottom: 2 },
  actionBtn: { backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 }
});

export default withRoleGuard(HealthModule, 'health');
