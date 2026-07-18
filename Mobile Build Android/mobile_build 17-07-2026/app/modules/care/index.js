import React, { useState } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Modal, TextInput } from 'react-native';
import { router } from 'expo-router';

const CAREGIVERS = [
  { id: 1, name: 'Sunita Bhosale', role: 'Infant Nanny / Baby Care', rating: '4.9 ★', experience: '5 years', location: 'Dhanori', charge: '₹220/hour', skills: ['Infant Feeding', 'First Aid', 'Toddler Activities'], icon: '🍼' },
  { id: 2, name: 'Janardan Shinde', role: 'Senior Care Companion', rating: '4.8 ★', experience: '8 years', location: 'Viman Nagar', charge: '₹250/hour', skills: ['Medicine Reminders', 'Mobility Assist', 'Bilingual'], icon: '👵' },
  { id: 3, name: 'Amol Gokhale', role: 'Pet Sitter / Dog Walker', rating: '4.7 ★', experience: '3 years', location: 'Kharadi', charge: '₹150/walk', skills: ['Large Breeds', 'Pet Boarding', 'Grooming Assist'], icon: '🐕' },
];

function CareModule() {
  const [showModal, setShowModal] = useState(false);
  const [selectedCare, setSelectedCare] = useState(null);

  const handleMatch = (care) => {
    setSelectedCare(care);
    setShowModal(true);
  };

  const confirmMatch = () => {
    setShowModal(false);
    Alert.alert('Match Fee Paid Successfully! 🎉', 'The Match Fee of ₹150 has been debited. You will receive the caregiver\'s contact details, police verification records, and references via SMS instantly.');
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

        {CAREGIVERS.map(c => (
          <View key={c.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}><Text style={{fontSize: 32}}>{c.icon}</Text></View>
              <View style={styles.headerTextCol}>
                <Text style={styles.name}>{c.name}</Text>
                <View style={styles.badgeSuccess}><Text style={styles.badgeSuccessText}>✓ Background Checked</Text></View>
              </View>
            </View>

            <Text style={styles.role}>{c.role} • {c.experience} Exp</Text>
            <Text style={styles.meta}>📍 {c.location} • {c.rating}</Text>
            
            <View style={styles.skillsRow}>
              {c.skills.map(s => (
                <View key={s} style={styles.skillChip}><Text style={styles.skillText}>{s}</Text></View>
              ))}
            </View>

            <View style={styles.footer}>
              <View>
                <Text style={styles.charge}>{c.charge}</Text>
                <Text style={styles.feeText}>₹150 Local Match Fee</Text>
              </View>
              <TouchableOpacity style={styles.matchBtn} onPress={() => handleMatch(c)}>
                <Text style={styles.matchBtnText}>Hire Assistant</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Match Modal */}
      <Modal visible={showModal} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Match Caregiver</Text>
            <Text style={styles.modalDesc}>A ₹150 match fee is processed securely to dispatch full police verification records and connect you directly with the provider.</Text>
            
            <Text style={styles.label}>Society Wing & flat</Text>
            <TextInput style={styles.input} placeholder="e.g. A-402, Pride Aashiyana" placeholderTextColor="#64748b" />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#e2e8f0'}]} onPress={() => setShowModal(false)}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, {backgroundColor: '#3b82f6'}]} onPress={confirmMatch}>
                <Text style={styles.modalBtnText}>Pay Fee (₹150)</Text>
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
  feeText: { color: '#64748b', fontSize: 10, marginTop: 2 },
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
