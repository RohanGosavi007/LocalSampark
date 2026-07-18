import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../../src/context/AuthContext';

import { API_V1 } from '../../config/api';
export default function MobileSOS() {
  const { authToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [contactPhone, setContactPhone] = useState('');
  
  // Dummy pincode/location for testing
  const pincode = '400001';
  const latitude = 18.922;
  const longitude = 72.834;

  const handleTriggerSOS = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_V1}/sos/trigger`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`
        },
        body: JSON.stringify({ type, latitude, longitude, pincode })
      });
      const data = await res.json();
      
      if (data.success) {
        Alert.alert('SOS SENT', 'Broadcasting alert to your pincode and triggering loud alarms for your emergency contacts.');
        
        // In a real app, we would emit via Socket.io here:
        // socket.emit('sos:trigger', { alertId: data.data.alert.id, type, latitude, longitude, pincode, emergencyContacts: data.data.emergencyContacts });
      } else {
        Alert.alert('Error', data.error || 'Failed to trigger SOS.');
      }
    } catch (err) {
      Alert.alert('Error', 'Network request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!contactPhone) return;
    try {
      const res = await fetch(`${API_V1}/sos/contacts`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken || ''}`
        },
        body: JSON.stringify({ contactPhone })
      });
      const data = await res.json();
      if (data.success) {
        Alert.alert('Success', 'Contact added for Loud Alarms.');
        setContactPhone('');
      } else {
        Alert.alert('Error', data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency SOS</Text>
        <Text style={styles.subtitle}>Instantly alert nearby residents & admins</Text>
      </View>

      <View style={styles.warningBox}>
        <Text style={styles.warningTitle}>⚠️ WARNING</Text>
        <Text style={styles.warningText}>
          False SOS reports are heavily penalized. You will lose 200 SamparkCoins or face a temporary account ban.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.sosButton, styles.medical]} 
          onPress={() => handleTriggerSOS('Medical')}
          disabled={loading}
        >
          <Text style={styles.sosIcon}>🚑</Text>
          <Text style={styles.sosText}>MEDICAL EMERGENCY</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sosButton, styles.police]} 
          onPress={() => handleTriggerSOS('Police')}
          disabled={loading}
        >
          <Text style={styles.sosIcon}>🚓</Text>
          <Text style={styles.sosText}>SECURITY / POLICE</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sosButton, styles.fire]} 
          onPress={() => handleTriggerSOS('Fire')}
          disabled={loading}
        >
          <Text style={styles.sosIcon}>🚒</Text>
          <Text style={styles.sosText}>FIRE EMERGENCY</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contactsBox}>
        <Text style={styles.boxTitle}>Loud Alarm Contacts</Text>
        <Text style={styles.boxDesc}>Add phone numbers. These users will get a piercing alarm even if their phone is on silent.</Text>
        
        <View style={styles.inputRow}>
          <TextInput 
            style={styles.input} 
            placeholder="Enter Phone Number" 
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={setContactPhone}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddContact}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { marginTop: 40, marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#ef4444' },
  subtitle: { color: '#64748b', fontSize: 16 },
  
  warningBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', marginBottom: 30 },
  warningTitle: { color: '#ef4444', fontWeight: 'bold', marginBottom: 5 },
  warningText: { color: '#fca5a5', fontSize: 13, lineHeight: 18 },

  buttonContainer: { gap: 16, marginBottom: 40 },
  sosButton: { padding: 25, borderRadius: 20, alignItems: 'center', justifyContent: 'center', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 15 },
  sosIcon: { fontSize: 40, marginBottom: 10 },
  sosText: { color: '#ffffff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
  medical: { backgroundColor: '#3b82f6', shadowColor: '#3b82f6' },
  police: { backgroundColor: '#1e3a8a', shadowColor: '#1e3a8a' },
  fire: { backgroundColor: '#ef4444', shadowColor: '#ef4444' },

  contactsBox: { backgroundColor: '#ffffff', padding: 20, borderRadius: 15 },
  boxTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 8 },
  boxDesc: { color: '#64748b', fontSize: 13, marginBottom: 15 },
  inputRow: { flexDirection: 'row', gap: 10 },
  input: { flex: 1, backgroundColor: '#f8fafc', borderRadius: 8, paddingHorizontal: 15, color: '#0f172a', borderWidth: 1, borderColor: '#e2e8f0' },
  addBtn: { backgroundColor: '#10b981', paddingHorizontal: 20, justifyContent: 'center', borderRadius: 8 },
  addBtnText: { color: '#0f172a', fontWeight: 'bold' }
});
