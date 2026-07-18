import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TextInput, TouchableOpacity, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

export default function FieldOnboard() {
  const [form, setForm] = useState({
    shopName: '',
    ownerName: '',
    phone: '',
    category: '',
    address: ''
  });

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Onboarding Submitted', `Shop "${form.shopName}" has been submitted for KYC verification. Earned ₹50 commission!`);
    setForm({ shopName: '', ownerName: '', phone: '', category: '', address: '' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏪 Onboard Shop</Text>
        <Text style={styles.subtitle}>Field Agent CRM</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.formCard}>
          <Text style={styles.formNote}>Register a local shop into the LocalSampark network. You will earn ₹50 per approved shop.</Text>
          
          <Text style={styles.inputLabel}>Shop Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Sharma Grocery" 
            placeholderTextColor="#64748b" 
            value={form.shopName}
            onChangeText={t => setForm({...form, shopName: t})}
          />
          
          <Text style={styles.inputLabel}>Owner Name</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Rahul Sharma" 
            placeholderTextColor="#64748b" 
            value={form.ownerName}
            onChangeText={t => setForm({...form, ownerName: t})}
          />
          
          <Text style={styles.inputLabel}>Phone Number</Text>
          <TextInput 
            style={styles.input} 
            placeholder="10-digit mobile number" 
            keyboardType="phone-pad"
            placeholderTextColor="#64748b" 
            value={form.phone}
            onChangeText={t => setForm({...form, phone: t})}
          />
          
          <Text style={styles.inputLabel}>Category</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Grocery, Pharmacy, Salon" 
            placeholderTextColor="#64748b" 
            value={form.category}
            onChangeText={t => setForm({...form, category: t})}
          />
          
          <Text style={styles.inputLabel}>Shop Address</Text>
          <TextInput 
            style={[styles.input, {height: 80, textAlignVertical: 'top'}]} 
            multiline
            placeholder="Full shop address..." 
            placeholderTextColor="#64748b" 
            value={form.address}
            onChangeText={t => setForm({...form, address: t})}
          />
          
          <TouchableOpacity style={styles.kycBtn}>
            <Text style={styles.kycBtnText}>📸 Upload KYC Document</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>Submit Registration</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#14b8a6' },
  subtitle: { color: '#64748b', fontSize: 14, marginTop: 4 },
  
  content: { padding: 15 },
  
  formCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  formNote: { color: '#475569', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  
  inputLabel: { color: '#64748b', fontSize: 13, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 14, color: '#0f172a', fontSize: 16 },
  
  kycBtn: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#14b8a6', borderStyle: 'dashed', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 25, marginBottom: 15 },
  kycBtnText: { color: '#14b8a6', fontWeight: 'bold' },

  submitBtn: { backgroundColor: '#14b8a6', padding: 15, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#f8fafc', fontWeight: 'bold', fontSize: 16 }
});
