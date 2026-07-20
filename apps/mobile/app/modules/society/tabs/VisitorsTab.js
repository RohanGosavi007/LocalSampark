import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { Image } from 'expo-image';

export default function VisitorsTab({ role }) {
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('');
  const [showQrModal, setShowQrModal] = useState(false);
  const [visitors, setVisitors] = useState([
    { id: 1, name: 'Plumber (Rajesh Sharma)', phone: '9999988888', vehicle: 'MH-12-AB-1234', purpose: 'Repairs', status: 'Expected' }
  ]);

  const handleVisitor = () => {
    if (!visitorName || !visitorPhone) return;
    const newVisitor = {
      id: Date.now(),
      name: visitorName,
      phone: visitorPhone,
      vehicle: 'Auto / Cab',
      purpose: 'Guest Visit',
      status: 'Pre-Approved'
    };
    setVisitors([newVisitor, ...visitors]);
    setVisitorName('');
    setVisitorPhone('');
    setShowQrModal(true);
  };

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      {/* Gate Pass Pre-Approval */}
      {(role === 'resident' || role === 'admin') && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Pre-Approve Visitor</Text>
          <Text style={styles.sectionSub}>Generate a 1-time Gate Pass QR to skip security queue</Text>
          
          <Text style={styles.label}>Visitor Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Guest Name" 
            placeholderTextColor="#94a3b8" 
            value={visitorName} 
            onChangeText={setVisitorName} 
          />
          
          <Text style={styles.label}>Visitor Phone Number</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 9999988888" 
            keyboardType="phone-pad" 
            placeholderTextColor="#94a3b8" 
            value={visitorPhone} 
            onChangeText={setVisitorPhone} 
          />
          
          <TouchableOpacity style={styles.submitBtn} onPress={handleVisitor}>
            <Text style={styles.submitBtnText}>Generate Gate Pass QR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Security Guard Gate Check-In */}
      {role === 'guard' && (
        <View style={[styles.card, {backgroundColor: '#f8fafc'}]}>
          <Text style={styles.sectionTitle}>Gate Check-In (Security)</Text>
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: '#10b981' }]} onPress={() => Alert.alert('Camera', 'Opening QR Scanner...')}>
            <Text style={styles.submitBtnText}>📷 Scan Visitor QR</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Expected Visitors Log */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today's Logs</Text>
        {visitors.map(v => (
          <View key={v.id} style={styles.visitorRow}>
            <View style={{flex: 1}}>
              <Text style={styles.visitorName}>{v.name}</Text>
              <Text style={styles.visitorMeta}>Purpose: {v.purpose}</Text>
              <Text style={styles.visitorMeta}>Vehicle: {v.vehicle}</Text>
            </View>
            <View style={styles.badgePrimary}>
              <Text style={styles.badgeText}>{v.status}</Text>
            </View>
          </View>
        ))}
      </View>

      <Modal visible={showQrModal} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Share Gate Pass</Text>
            <Text style={styles.modalSub}>Send this QR to your visitor. Security will scan this at the main gate.</Text>
            
            <View style={styles.qrBox}>
              <Text style={{fontSize: 100}}>🔳</Text>
              <Text style={styles.pinText}>PIN: 4920</Text>
            </View>

            <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#22c55e', width: '100%', marginBottom: 12}]} onPress={() => Alert.alert('Share', 'Sharing to WhatsApp...')}>
              <Text style={styles.submitBtnText}>Share via WhatsApp</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.submitBtn, {backgroundColor: '#f1f5f9', width: '100%'}]} onPress={() => setShowQrModal(false)}>
              <Text style={[styles.submitBtnText, {color: '#0f172a'}]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  sectionTitle: { color: '#0f172a', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  sectionSub: { color: '#64748b', fontSize: 13, marginBottom: 20, fontWeight: '500' },
  label: { color: '#0f172a', fontSize: 13, marginBottom: 8, fontWeight: '700' },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, color: '#0f172a', padding: 14, marginBottom: 20, fontWeight: '500', fontSize: 15 },
  submitBtn: { backgroundColor: '#0f172a', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  
  visitorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#f1f5f9', marginBottom: 12 },
  visitorName: { color: '#0f172a', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  visitorMeta: { color: '#64748b', fontSize: 13, marginBottom: 2, fontWeight: '500' },
  badgePrimary: { backgroundColor: '#dcfce7', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  badgeText: { color: '#166534', fontSize: 12, fontWeight: '900' },

  modalBg: { flex: 1, backgroundColor: 'rgba(15,23,42,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 24, padding: 24, width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '900', color: '#0f172a', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, fontWeight: '500' },
  qrBox: { width: 200, height: 200, backgroundColor: '#f8fafc', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 2, borderColor: '#e2e8f0' },
  pinText: { color: '#0f172a', fontSize: 20, fontWeight: '900', marginTop: 12 }
});
