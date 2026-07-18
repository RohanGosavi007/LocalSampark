import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Haptics from 'expo-haptics';

export default function FranchisesScreen() {
  const [franchises, setFranchises] = useState([
    { id: 'FR-001', name: 'Pune East Partners', owner: 'Rahul Desai', zones: '411014, 411006', shops: 45, split: 20 },
    { id: 'FR-002', name: 'Mumbai North Ops', owner: 'Sneha Patel', zones: '400053, 400058', shops: 112, split: 18 },
    { id: 'FR-003', name: 'Delhi NCR Central', owner: 'Amit Singh', zones: '110001, 110002', shops: 78, split: 25 },
  ]);

  const [editModal, setEditModal] = useState(null);

  const handleSaveSplit = () => {
    if (editModal) {
      setFranchises(prev => prev.map(f => f.id === editModal.id ? { ...f, split: editModal.split } : f));
      setEditModal(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Franchise revenue split updated successfully.');
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ 
        title: 'Franchise Mapping', 
        headerStyle: { backgroundColor: '#f8fafc' },
        headerTintColor: '#fff'
      }} />

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.headerTitle}>Franchise Partners</Text>
        <Text style={styles.headerDesc}>Manage territory partners and configure revenue splits.</Text>

        {franchises.map((f) => (
          <View key={f.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.franchiseId}>{f.id}</Text>
              <Text style={styles.franchiseSplit}>{f.split}% Cut</Text>
            </View>
            
            <Text style={styles.franchiseName}>{f.name}</Text>
            <Text style={styles.franchiseOwner}>{f.owner}</Text>
            
            <View style={styles.statsRow}>
              <Text style={styles.statsText}>📍 {f.zones}</Text>
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

      {/* Edit Modal */}
      <Modal visible={!!editModal} animationType="fade" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Split</Text>
            <Text style={styles.modalSubtitle}>Adjust commission for {editModal?.name}</Text>
            
            <Text style={styles.label}>Split Percentage (%)</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              value={String(editModal?.split || '')} 
              onChangeText={(t) => setEditModal({ ...editModal, split: Number(t) })}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditModal(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSplit}>
                <Text style={styles.saveBtnText}>Save</Text>
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
  content: { padding: 16 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  headerDesc: { fontSize: 14, color: '#64748b', marginBottom: 24 },
  
  card: { backgroundColor: '#ffffff', padding: 16, borderRadius: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  franchiseId: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14 },
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
  
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#f8fafc', borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#3b82f6', borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#0f172a', fontWeight: 'bold' }
});
