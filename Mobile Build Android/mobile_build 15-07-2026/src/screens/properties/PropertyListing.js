import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PropertyListingScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'Rent',
    price: '',
    deposit: '',
    beds: '1',
    baths: '1',
    sqft: '',
    description: ''
  });

  const handleSubmit = () => {
    if (!form.title || !form.location || !form.price) {
      Alert.alert('Missing Fields', 'Please fill in Title, Location, and Price.');
      return;
    }
    
    // Stub for backend integration
    Alert.alert('Success', 'Property listed successfully!');
    navigation.goBack();
  };

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>List Property</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Type Toggle */}
        <View style={styles.toggleContainer}>
          <TouchableOpacity 
            style={[styles.toggleBtn, form.type === 'Rent' && styles.toggleActive]}
            onPress={() => updateForm('type', 'Rent')}
          >
            <Text style={[styles.toggleText, form.type === 'Rent' && styles.toggleTextActive]}>For Rent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleBtn, form.type === 'Buy' && styles.toggleActive]}
            onPress={() => updateForm('type', 'Buy')}
          >
            <Text style={[styles.toggleText, form.type === 'Buy' && styles.toggleTextActive]}>For Sale</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Details */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Title *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 2 BHK in Ganga Aria" 
            placeholderTextColor="#64748b"
            value={form.title}
            onChangeText={(t) => updateForm('title', t)}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Society / Location *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. Dhanori, Pune" 
            placeholderTextColor="#64748b"
            value={form.location}
            onChangeText={(t) => updateForm('location', t)}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>{form.type === 'Rent' ? 'Monthly Rent *' : 'Asking Price *'}</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholder="₹"
              placeholderTextColor="#64748b"
              value={form.price}
              onChangeText={(t) => updateForm('price', t)}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>{form.type === 'Rent' ? 'Deposit' : 'Token Amount'}</Text>
            <TextInput 
              style={styles.input} 
              keyboardType="numeric" 
              placeholder="₹"
              placeholderTextColor="#64748b"
              value={form.deposit}
              onChangeText={(t) => updateForm('deposit', t)}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 4 }]}>
            <Text style={styles.label}>Beds</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={form.beds} onChangeText={(t) => updateForm('beds', t)} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginHorizontal: 4 }]}>
            <Text style={styles.label}>Baths</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={form.baths} onChangeText={(t) => updateForm('baths', t)} />
          </View>
          <View style={[styles.inputGroup, { flex: 1, marginLeft: 4 }]}>
            <Text style={styles.label}>SqFt</Text>
            <TextInput style={styles.input} keyboardType="numeric" placeholder="1000" placeholderTextColor="#64748b" value={form.sqft} onChangeText={(t) => updateForm('sqft', t)} />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Description</Text>
          <TextInput 
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]} 
            multiline 
            placeholder="Describe the amenities, furnishings, etc." 
            placeholderTextColor="#64748b"
            value={form.description}
            onChangeText={(t) => updateForm('description', t)}
          />
        </View>

        {/* Image Upload Mock */}
        <TouchableOpacity style={styles.imageUploadBox}>
          <Ionicons name="camera-outline" size={32} color="#3b82f6" />
          <Text style={styles.imageUploadText}>Add Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitBtnText}>Post Listing</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#ffffff', padding: 4, borderRadius: 12, marginBottom: 24 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: '#3b82f6' },
  toggleText: { color: '#64748b', fontWeight: 'bold', fontSize: 16 },
  toggleTextActive: { color: '#0f172a' },
  inputGroup: { marginBottom: 16 },
  label: { color: '#475569', fontSize: 13, marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#ffffff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#0f172a', fontSize: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  imageUploadBox: { backgroundColor: '#ffffff', borderWidth: 2, borderColor: '#e2e8f0', borderStyle: 'dashed', borderRadius: 12, height: 120, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  imageUploadText: { color: '#3b82f6', marginTop: 8, fontWeight: '600' },
  submitBtn: { backgroundColor: '#10b981', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' }
});
