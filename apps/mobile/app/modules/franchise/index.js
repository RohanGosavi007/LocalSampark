import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';
import { apiPost } from '../../../src/lib/api';

/**
 * Franchise portal — this page solicits money.
 *
 * TERRITORIES claimed live performance for six zones, two of them with named
 * partners: "Dhanori, 47 shops, 2,840 users, ₹2.1L/mo, partner Rajesh Sharma"
 * and "Viman Nagar, 62 shops, 4,120 users, ₹3.4L/mo, Priya Kulkarni". None of
 * those figures came from anywhere and neither person exists.
 *
 * TIER_BENEFITS then paired an investment with a monthly return — ₹10,000 for
 * "₹8,000–25,000/month", ₹50,000 for "₹40,000–1.2L", ₹2,00,000 for "₹1.5L–5L+"
 * — next to territory numbers that appeared to corroborate them. A prospective
 * partner could have put two lakh rupees in on the strength of it.
 *
 * And the application form reported "Application Submitted! Our onboarding team
 * will contact you within 24 hours" having called no API at all, so nobody was
 * ever going to call.
 *
 * The zone list and the earnings projections are removed: nothing computes
 * either, and an income claim attached to an investment ask is the last thing
 * this app should be guessing at. The tier table keeps only what the business
 * actually sets — the investment and the commission rate. The form now posts to
 * /franchise/register, which records a real pending application.
 */
const TIER_BENEFITS = [
  { tier: 'Sub-Agent', icon: '🧑', invest: '₹10,000', commission: '10%', support: 'WhatsApp support', manage: 'Up to 20 shops', color: '#64748b' },
  { tier: 'Zone Franchise', icon: '🏢', invest: '₹50,000', commission: '25%', support: 'Dedicated BDE', manage: 'Full zone control', color: '#3b82f6', popular: true },
  { tier: 'City Master', icon: '🌆', invest: '₹2,00,000', commission: '40% + override', support: 'C-Level access', manage: 'All zones in city', color: '#f97316' },
];

export default function FranchiseScreen() {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedTier, setSelectedTier] = useState('Zone Franchise');
  const [form, setForm] = useState({ name: '', phone: '', pincode: '', zone: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleApply = async () => {
    if (!form.name || !form.phone || !form.pincode || !form.zone) {
      return Alert.alert('Error', 'Please fill all fields');
    }

    setSubmitting(true);
    try {
      await apiPost('/franchise/register', {
        region_pincode: form.pincode,
        territory_name: form.zone,
        tier: selectedTier,
        contact_name: form.name,
        contact_phone: form.phone,
      });
      setShowApplyModal(false);
      setForm({ name: '', phone: '', pincode: '', zone: '' });
      Alert.alert(
        'Application received',
        // No promise about a 24-hour callback: nothing schedules one.
        `Your application to run a ${selectedTier} in ${form.zone} has been recorded and is pending review.`
      );
    } catch (err) {
      // The old handler closed the modal and congratulated the applicant
      // regardless. A failed application has to look like one.
      Alert.alert(
        'Application not submitted',
        err?.message || 'We could not submit your application. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
        <Text style={styles.title}>🤝 Franchise Portal</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heroTitle}>Own a Piece of India's Hyperlocal Future</Text>
        <Text style={styles.heroSubtitle}>Run a LocalSampark franchise in your pincode. Zero tech setup. 100% operational focus.</Text>
        
        {/* Tier Benefits */}
        <Text style={styles.sectionTitle}>Partnership Levels</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tiersScroll}>
          {TIER_BENEFITS.map((t, idx) => (
            <View key={idx} style={[styles.tierCard, t.popular && styles.tierCardPopular]}>
              {t.popular && <View style={styles.popularLabel}><Text style={styles.popularLabelText}>POPULAR</Text></View>}
              <Text style={styles.tierIcon}>{t.icon}</Text>
              <Text style={[styles.tierName, { color: t.color }]}>{t.tier}</Text>
              <Text style={styles.tierPrice}>{t.invest}</Text>
              <Text style={styles.tierSub}>One-time fee</Text>

              <View style={styles.divider} />
              
              <View style={styles.metaRow}><Text style={styles.metaKey}>Commission</Text><Text style={styles.metaVal}>{t.commission}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Manage</Text><Text style={styles.metaVal}>{t.manage}</Text></View>
              <View style={styles.metaRow}><Text style={styles.metaKey}>Support</Text><Text style={styles.metaVal}>{t.support}</Text></View>
              {/* An "Earnings" row promised a monthly income band against each
                  investment tier — up to "₹1.5L–5L+" for ₹2,00,000. Nothing
                  computes that, no partner's actual earnings back it, and it sat
                  directly beside an Apply Now button. */}

              <TouchableOpacity 
                style={[styles.tierSelectBtn, { backgroundColor: t.color }]} 
                onPress={() => {
                  setSelectedTier(t.tier);
                  setShowApplyModal(true);
                }}
              >
                <Text style={styles.tierSelectBtnText}>Apply Now</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        {/* A "Territory Map (Pune)" listed six zones with shop counts, user
            counts and monthly revenue, two of them naming the partner running
            them. Every number was invented, and together with the earnings
            bands above they read as evidence that the model works. Nothing in
            the backend reports per-territory performance to a prospective
            partner, so the section is gone rather than filled with numbers
            somebody might invest against. */}

        <TouchableOpacity style={styles.applyBtn} onPress={() => setShowApplyModal(true)}>
          <Text style={styles.applyBtnText}>Apply for Open Pincode</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Apply Modal */}
      <Modal visible={showApplyModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Franchise Application</Text>
              {/* Promised a scheduled video interview that nothing books. */}
              <Text style={styles.modalDesc}>
                Fill in your details below. Your application will be recorded for
                review.
              </Text>
              
              <Text style={styles.label}>Full Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Rajesh Kumar" placeholderTextColor="#64748b" value={form.name} onChangeText={(val) => setForm({...form, name: val})} />
              
              <Text style={styles.label}>Phone Number</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. +91 9999988888" placeholderTextColor="#64748b" keyboardType="phone-pad" value={form.phone} onChangeText={(val) => setForm({...form, phone: val})} />
              
              <Text style={styles.label}>Pincode</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. 411015" placeholderTextColor="#64748b" keyboardType="numeric" value={form.pincode} onChangeText={(val) => setForm({...form, pincode: val})} />
              
              <Text style={styles.label}>Target Pincode Area Name</Text>
              <TextInput style={styles.modalInput} placeholder="e.g. Dhanori / Kharadi" placeholderTextColor="#64748b" value={form.zone} onChangeText={(val) => setForm({...form, zone: val})} />
              
              <Text style={styles.label}>Selected Partnership Level</Text>
              <View style={styles.tabsRow}>
                {['Sub-Agent', 'Zone Franchise', 'City Master'].map(tierName => (
                  <TouchableOpacity 
                    key={tierName}
                    style={[styles.tierSelChip, selectedTier === tierName && styles.tierSelChipActive]}
                    onPress={() => setSelectedTier(tierName)}
                  >
                    <Text style={[styles.tierSelText, selectedTier === tierName && styles.tierSelTextActive]}>{tierName}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#e2e8f0'}]} onPress={() => setShowApplyModal(false)}>
                  <Text style={styles.modalBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalBtn, { backgroundColor: '#3b82f6' }, submitting && { opacity: 0.6 }]}
                  disabled={submitting}
                  onPress={handleApply}
                >
                  <Text style={styles.modalBtnText}>Submit Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
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
  
  content: { padding: 20, paddingBottom: 60 },
  heroTitle: { color: '#0f172a', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  heroSubtitle: { color: '#64748b', fontSize: 14, lineHeight: 22, marginBottom: 24 },
  
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  
  tiersScroll: { flexDirection: 'row', marginBottom: 24, paddingVertical: 10 },
  tierCard: { backgroundColor: '#ffffff', width: 220, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', marginRight: 16, position: 'relative' },
  tierCardPopular: { borderColor: '#3b82f6', borderWidth: 2 },
  popularLabel: { position: 'absolute', top: -10, left: '50%', transform: [{translateX: -40}], backgroundColor: '#3b82f6', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10 },
  popularLabelText: { color: '#0f172a', fontSize: 9, fontWeight: '900' },
  tierIcon: { fontSize: 32, marginBottom: 8, textAlign: 'center' },
  tierName: { fontSize: 16, fontWeight: 'bold', marginBottom: 4, textAlign: 'center' },
  tierPrice: { color: '#0f172a', fontSize: 22, fontWeight: '900', textAlign: 'center' },
  tierSub: { color: '#64748b', fontSize: 10, textAlign: 'center', marginBottom: 12 },
  divider: { height: 1, backgroundColor: '#ffffff', marginVertical: 12 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  metaKey: { color: '#64748b', fontSize: 11 },
  metaVal: { color: '#475569', fontSize: 11, fontWeight: 'bold' },
  tierSelectBtn: { marginTop: 16, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  tierSelectBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 13 },

  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', marginBottom: 24 },
  cardTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  
  territoryItem: { borderBottomWidth: 1, borderBottomColor: '#ffffff', paddingBottom: 12, marginBottom: 12 },
  zoneName: { color: '#0f172a', fontSize: 15, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: 'bold', overflow: 'hidden' },
  territoryMeta: { color: '#64748b', fontSize: 12, marginTop: 4 },
  
  applyBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#ffffff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: '#ffffff' },
  modalTitle: { color: '#0f172a', fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  modalDesc: { color: '#64748b', fontSize: 13, marginBottom: 20, lineHeight: 18 },
  label: { color: '#475569', fontSize: 12, fontWeight: '600', marginBottom: 6 },
  modalInput: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, color: '#0f172a', padding: 12, marginBottom: 16 },
  tabsRow: { flexDirection: 'row', gap: 6, marginBottom: 24 },
  tierSelChip: { flex: 1, backgroundColor: '#ffffff', paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  tierSelChipActive: { backgroundColor: '#3b82f6' },
  tierSelText: { color: '#475569', fontSize: 11 },
  tierSelTextActive: { color: '#0f172a', fontWeight: 'bold' },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  modalBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
});
