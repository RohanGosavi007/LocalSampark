import { apiGet, apiPost, apiPut, apiDelete } from '../../../../../../../../../src/lib/api';
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImageUploader from '../../../src/components/ImageUploader';
import { useAuth } from '../../../src/context/AuthContext';
import Constants from 'expo-constants';

import { API_V1, API_BASE_URL } from '../../config/api';
export default function DeliveryOnboardingScreen() {
  const router = useRouter();
  const { authState } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    dlNumber: '',
    aadharNumber: '',
    profileImage: '',
    dlImage: '',
    rcImage: ''
  });

  const submitKYC = async () => {
    if (!formData.profileImage || !formData.dlImage || !formData.rcImage) {
      Alert.alert("Missing Documents", "Please upload all required KYC documents to proceed.");
      return;
    }

    try {
      const baseUrl = Constants.expoConfig?.extra?.API_URL_DEV || API_BASE_URL;
      const response = await fetch(`${baseUrl}/api/v1/delivery/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        Alert.alert('KYC Submitted!', 'Your onboarding application is under review.');
        router.replace('/modules/delivery-dashboard');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.message || 'Failed to submit KYC.');
      }
    } catch (err) {
      Alert.alert('Network Error', 'Could not connect to server.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Driver Onboarding</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]} />
          <View style={[styles.progressLine, step >= 2 && styles.progressLineActive]} />
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]} />
        </View>
        <Text style={styles.stepText}>Step {step} of 2</Text>

        {step === 1 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>Basic Details</Text>
            
            <ImageUploader 
              label="Profile Photo (Clear face)" 
              onUploadSuccess={(url) => setFormData({...formData, profileImage: url})} 
            />

            <Text style={styles.inputLabel}>Aadhar Number</Text>
            <TextInput 
              style={styles.input} 
              placeholder="12-digit Aadhar Number"
              keyboardType="numeric"
              maxLength={12}
              value={formData.aadharNumber}
              onChangeText={(txt) => setFormData({...formData, aadharNumber: txt})}
            />

            <Text style={styles.inputLabel}>Driving License Number</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. MH1220110001234"
              autoCapitalize="characters"
              value={formData.dlNumber}
              onChangeText={(txt) => setFormData({...formData, dlNumber: txt})}
            />

            <TouchableOpacity style={styles.primaryBtn} onPress={() => setStep(2)}>
              <Text style={styles.primaryBtnText}>Next: Upload Documents</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 2 && (
          <View style={styles.formSection}>
            <Text style={styles.sectionTitle}>KYC Documents</Text>
            
            <ImageUploader 
              label="Driving License (Front)" 
              onUploadSuccess={(url) => setFormData({...formData, dlImage: url})} 
            />

            <Text style={styles.inputLabel}>Vehicle Registration Number</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. MH 12 AB 1234"
              autoCapitalize="characters"
              value={formData.vehicleNumber}
              onChangeText={(txt) => setFormData({...formData, vehicleNumber: txt})}
            />

            <ImageUploader 
              label="Vehicle RC (Front)" 
              onUploadSuccess={(url) => setFormData({...formData, rcImage: url})} 
            />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => setStep(1)}>
                <Text style={styles.secondaryBtnText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.primaryBtn, { flex: 1, marginLeft: 12 }]} onPress={submitKYC}>
                <Text style={styles.primaryBtnText}>Submit KYC</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { marginRight: 12 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  content: { padding: 20 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#d1d5db' },
  progressDotActive: { backgroundColor: '#3b82f6' },
  progressLine: { width: 40, height: 3, backgroundColor: '#d1d5db', marginHorizontal: 8 },
  progressLineActive: { backgroundColor: '#3b82f6' },
  stepText: { textAlign: 'center', color: '#6b7280', fontSize: 12, marginBottom: 24, fontWeight: 'bold' },
  formSection: { backgroundColor: '#fff', padding: 20, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginBottom: 20 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#4b5563', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#f3f4f6', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10, padding: 12, fontSize: 15, color: '#1f2937' },
  primaryBtn: { backgroundColor: '#3b82f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  secondaryBtn: { backgroundColor: '#f3f4f6', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 24, paddingHorizontal: 24 },
  secondaryBtnText: { color: '#4b5563', fontWeight: 'bold', fontSize: 16 },
  btnRow: { flexDirection: 'row', alignItems: 'center' }
});
