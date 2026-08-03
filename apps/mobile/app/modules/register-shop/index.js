import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { postWithFallback } from '../../../src/utils/mockDataHelper';
import DemoBadge from '../../../src/components/DemoBadge';

export default function RegisterShopScreen() {
  const [form, setForm] = useState({ 
    name: '', owner: '', category: '', shopType: 'retail', 
    phone: '', address: '', initialItemName: '', initialItemPriceOrRole: '' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [isDemo, setIsDemo] = useState(false);

  const up = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = async () => {
    if (!form.name || !form.phone || !form.address) {
      Alert.alert('Error', 'Please fill all required fields.');
      return;
    }
    setSubmitting(true);
    const mockRes = { success: true, message: 'Shop registered successfully', shop_id: `SHOP-${Date.now()}` };
    const { data, isDemo: demo } = await postWithFallback('/shops', form, mockRes);
    setSubmitting(false);
    setIsDemo(demo);
    Alert.alert('Success', `Your shop registration request has been submitted for verification.${demo ? '\n\n🔧 (Demo Mode)' : ''} Our team will contact you shortly.`);
    setTimeout(() => router.back(), 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{flex: 1}}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}><Text style={styles.backBtnText}>⬅️ Back</Text></TouchableOpacity>
          <Text style={styles.title}>🏪 Register Shop</Text>
        </View>
        
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.heroTitle}>Grow Your Local Business</Text>
          <Text style={styles.heroSubtitle}>List your shop on LocalSampark and connect directly with thousands of neighbors in your area. Zero commission.</Text>
          
          <View style={styles.card}>
            <Text style={styles.label}>Shop / Business Name *</Text>
            <TextInput style={styles.input} placeholder="e.g. Sharma Grocery" placeholderTextColor="#64748b" value={form.name} onChangeText={t => up('name', t)} />
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Owner Name *</Text>
                <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#64748b" value={form.owner} onChangeText={t => up('owner', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Phone Number *</Text>
                <TextInput style={styles.input} placeholder="10-digit number" placeholderTextColor="#64748b" keyboardType="phone-pad" value={form.phone} onChangeText={t => up('phone', t)} />
              </View>
            </View>

            <Text style={styles.label}>Business Model *</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
              <TouchableOpacity 
                style={[styles.radioBtn, form.shopType === 'retail' && styles.radioBtnActive]} 
                onPress={() => up('shopType', 'retail')}
              >
                <Text style={[styles.radioBtnText, form.shopType === 'retail' && styles.radioBtnTextActive]}>Retail (Sell Products)</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.radioBtn, form.shopType === 'appointment' && styles.radioBtnActive]} 
                onPress={() => up('shopType', 'appointment')}
              >
                <Text style={[styles.radioBtnText, form.shopType === 'appointment' && styles.radioBtnTextActive]}>Service (Appointments)</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.label}>Category *</Text>
            <TextInput style={styles.input} placeholder="e.g. Grocery, Pharmacy" placeholderTextColor="#64748b" value={form.category} onChangeText={t => up('category', t)} />
            
            <Text style={styles.label}>Complete Address *</Text>
            <TextInput style={[styles.input, {minHeight: 80, textAlignVertical: 'top'}]} placeholder="Shop number, society, street" placeholderTextColor="#64748b" multiline value={form.address} onChangeText={t => up('address', t)} />
            
            <View style={styles.divider} />
            
            <Text style={styles.subTitle}>{form.shopType === 'retail' ? 'Upload Your First Product' : 'Add Your First Staff Member'}</Text>
            
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{form.shopType === 'retail' ? 'Product Name' : 'Staff Name'}</Text>
                <TextInput style={styles.input} placeholder={form.shopType === 'retail' ? 'e.g. Atta 5kg' : 'e.g. Ramesh'} placeholderTextColor="#64748b" value={form.initialItemName} onChangeText={t => up('initialItemName', t)} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>{form.shopType === 'retail' ? 'Price (₹)' : 'Role'}</Text>
                <TextInput style={styles.input} placeholder={form.shopType === 'retail' ? 'e.g. 250' : 'e.g. Barber'} placeholderTextColor="#64748b" value={form.initialItemPriceOrRole} onChangeText={t => up('initialItemPriceOrRole', t)} />
              </View>
            </View>

            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitBtnText}>Submit Registration</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff' },
  label: { color: '#475569', fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', color: '#0f172a', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#ffffff', fontSize: 15, marginBottom: 16 },
  
  radioBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ffffff', alignItems: 'center', backgroundColor: '#f8fafc' },
  radioBtnActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  radioBtnText: { color: '#475569', fontSize: 12, fontWeight: 'bold' },
  radioBtnTextActive: { color: '#0f172a' },

  divider: { height: 1, backgroundColor: '#ffffff', marginVertical: 16 },
  subTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 12 },

  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  submitBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});
