import React, { useState } from 'react';
import { withRoleGuard } from '../../../src/utils/permissions';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, Alert, Animated, Linking } from 'react-native';
import { router } from 'expo-router';

const HOSPITALS = [
  { name: 'Dhanori Lifeline Hospital', type: 'Multi-Specialty', dist: '0.8 km', phone: '+91 98765 43212', beds: '24/7 Emergency', icon: '🏥' },
  { name: 'Pune District Hospital', type: 'Government', dist: '3.2 km', phone: '020 2612 5600', beds: 'Free OPD', icon: '🏨' },
  { name: 'Surya Mother & Child Care', type: 'Maternity', dist: '1.5 km', phone: '+91 98765 43214', beds: 'NICU Available', icon: '🍼' },
];

const DOCTORS = [
  { name: 'Dr. Ajay Patil', spec: 'General Physician', clinic: 'Goodwill Square Clinic', phone: '+91 98765 11110', timing: 'Mon–Sat, 9AM–1PM', icon: '👨‍⚕️' },
  { name: 'Dr. Shalini Deshmukh', spec: 'Pediatrician', clinic: 'Tingre Nagar Rd Clinic', phone: '+91 98765 22220', timing: 'Mon–Sat, 10AM–2PM', icon: '👩‍⚕️' },
  { name: 'Dr. Ravi Bhosale', spec: 'Cardiologist', clinic: 'Dhanori Heart Center', phone: '+91 98765 33330', timing: 'Tue & Thu, 11AM–4PM', icon: '❤️' },
];

const PHARMACIES = [
  { name: 'Goodwill Pharmacy', note: '24/7 Open', phone: '+91 98765 43213', icon: '💊' },
  { name: 'Pune Wellness Chemist', note: 'Daily 7AM–11PM', phone: '+91 98765 55550', icon: '🧴' },
  { name: 'Jan Aushadhi Store', note: 'Generic Medicines', phone: '1800 111 255', icon: '🏷️' },
];

const EMERGENCY_CONTACTS = [
  { label: 'Medical Ambulance', number: '108', color: '#ef4444' },
  { label: 'Police', number: '100', color: '#4f46e5' },
  { label: 'Fire Brigade', number: '101', color: '#f97316' },
  { label: 'Women Helpline', number: '1091', color: '#8b5cf6' },
];

function HealthModule() {
  const [sosActive, setSosActive] = useState(false);
  const [sosConfirmed, setSosConfirmed] = useState(false);
  const [activeTab, setActiveTab] = useState('hospitals');

  const handleSOS = () => {
    setSosActive(true);
    setTimeout(() => {
      setSosActive(false);
      setSosConfirmed(true);
      Alert.alert('🚨 SOS BROADCAST SENT', 'All neighbors within 5km radius alerted. Local ambulance dispatched.');
      setTimeout(() => setSosConfirmed(false), 6000);
    }, 2000);
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
            { id: 'hospitals', label: '🏥 Hospitals' },
            { id: 'doctors', label: '👨‍⚕️ Doctors' },
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
          
          {activeTab === 'hospitals' && HOSPITALS.map((h, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconBox}><Text style={styles.iconText}>{h.icon}</Text></View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{h.name}</Text>
                  <Text style={styles.itemMeta}>{h.type} • 📍 {h.dist}</Text>
                  <Text style={styles.itemMeta}>{h.beds}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => dialNumber(h.phone)}>
                <Text style={styles.actionBtnText}>📞 {h.phone}</Text>
              </TouchableOpacity>
            </View>
          ))}

          {activeTab === 'doctors' && DOCTORS.map((d, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconBox}><Text style={styles.iconText}>{d.icon}</Text></View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{d.name}</Text>
                  <Text style={styles.itemMeta}><Text style={{color: '#3b82f6'}}>{d.spec}</Text></Text>
                  <Text style={styles.itemMeta}>{d.clinic}</Text>
                  <Text style={styles.itemMeta}>🕒 {d.timing}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => dialNumber(d.phone)}>
                <Text style={styles.actionBtnText}>📞 Book Appointment</Text>
              </TouchableOpacity>
            </View>
          ))}

          {activeTab === 'pharmacies' && PHARMACIES.map((p, i) => (
            <View key={i} style={styles.card}>
              <View style={styles.cardRow}>
                <View style={styles.iconBox}><Text style={styles.iconText}>{p.icon}</Text></View>
                <View style={styles.cardBody}>
                  <Text style={styles.itemName}>{p.name}</Text>
                  <Text style={styles.itemMeta}>✨ {p.note}</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => dialNumber(p.phone)}>
                <Text style={styles.actionBtnText}>📞 Call Pharmacy</Text>
              </TouchableOpacity>
            </View>
          ))}

        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
