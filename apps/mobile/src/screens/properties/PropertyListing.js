import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert , StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Camera, Check } from 'lucide-react-native';
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
    Alert.alert('Success 🎉', 'Property listed successfully!');
    navigation.goBack();
  };

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.s2}>
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={s.s3}>List Property</Text>
        <View style={s.s4} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Type Toggle */}
        <View style={s.s5}>
          <TouchableOpacity 
            style={[s.s36, form.type === 'Rent' && s.s37]}
            onPress={() => updateForm('type', 'Rent')}
          >
            <Text style={[s.s38, form.type === 'Rent' ? s.s39 : s.s40]}>For Rent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[s.s41, form.type === 'Buy' && s.s42]}
            onPress={() => updateForm('type', 'Buy')}
          >
            <Text style={[s.s43, form.type === 'Buy' ? s.s44 : s.s45]}>For Sale</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Details */}
        <View style={s.s6}>
          <Text style={s.s7}>Title *</Text>
          <TextInput 
            style={s.s8} 
            placeholder="e.g. 2 BHK in Ganga Aria" 
            placeholderTextColor="#64748b"
            value={form.title}
            onChangeText={(t) => updateForm('title', t)}
          />
        </View>

        <View style={s.s9}>
          <Text style={s.s10}>Society / Location *</Text>
          <TextInput 
            style={s.s11} 
            placeholder="e.g. Dhanori, Pune" 
            placeholderTextColor="#64748b"
            value={form.location}
            onChangeText={(t) => updateForm('location', t)}
          />
        </View>

        <View style={s.s12}>
          <View style={s.s13}>
            <Text style={s.s14}>{form.type === 'Rent' ? 'Monthly Rent *' : 'Asking Price *'}</Text>
            <TextInput 
              style={s.s15} 
              keyboardType="numeric" 
              placeholder="₹"
              placeholderTextColor="#64748b"
              value={form.price}
              onChangeText={(t) => updateForm('price', t)}
            />
          </View>
          <View style={s.s16}>
            <Text style={s.s17}>{form.type === 'Rent' ? 'Deposit' : 'Token Amount'}</Text>
            <TextInput 
              style={s.s18} 
              keyboardType="numeric" 
              placeholder="₹"
              placeholderTextColor="#64748b"
              value={form.deposit}
              onChangeText={(t) => updateForm('deposit', t)}
            />
          </View>
        </View>

        <View style={s.s19}>
          <View style={s.s20}>
            <Text style={s.s21}>Beds</Text>
            <TextInput style={s.s22} keyboardType="numeric" value={form.beds} onChangeText={(t) => updateForm('beds', t)} />
          </View>
          <View style={s.s23}>
            <Text style={s.s24}>Baths</Text>
            <TextInput style={s.s25} keyboardType="numeric" value={form.baths} onChangeText={(t) => updateForm('baths', t)} />
          </View>
          <View style={s.s26}>
            <Text style={s.s27}>SqFt</Text>
            <TextInput style={s.s28} keyboardType="numeric" placeholder="1000" placeholderTextColor="#64748b" value={form.sqft} onChangeText={(t) => updateForm('sqft', t)} />
          </View>
        </View>

        <View style={s.s29}>
          <Text style={s.s30}>Description</Text>
          <TextInput
            style={[s.s31, { textAlignVertical: 'top' }]}
            multiline
            placeholder="Describe the amenities, furnishings, etc."
            placeholderTextColor="#64748b"
            value={form.description}
            onChangeText={(t) => updateForm('description', t)}
          />
        </View>

        {/* Image Upload Box */}
        <TouchableOpacity style={s.s32}>
          <Camera size={28} color="#3b82f6" />
          <Text style={s.s33}>Add Property Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.s34} onPress={handleSubmit}>
          <Text style={s.s35}>Post Listing</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a' },
  s2: { padding: 8, backgroundColor: '#0f172a', borderRadius: 9999, borderWidth: 1, borderColor: '#1e293b' },
  s3: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  s4: { width: 40 },
  s5: { flexDirection: 'row', backgroundColor: '#0f172a', padding: 6, borderRadius: 16, borderWidth: 1, borderColor: '#1e293b', marginBottom: 24 },
  s6: { marginBottom: 16 },
  s7: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s8: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  s9: { marginBottom: 16 },
  s10: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s11: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  s12: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  s13: { flex: 1 },
  s14: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s15: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  s16: { flex: 1 },
  s17: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s18: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#ffffff', fontWeight: '500', fontSize: 14 },
  s19: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  s20: { flex: 1 },
  s21: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s22: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#ffffff', fontWeight: '500', fontSize: 14, textAlign: 'center' },
  s23: { flex: 1 },
  s24: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s25: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#ffffff', fontWeight: '500', fontSize: 14, textAlign: 'center' },
  s26: { flex: 1 },
  s27: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s28: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#ffffff', fontWeight: '500', fontSize: 14, textAlign: 'center' },
  s29: { marginBottom: 24 },
  s30: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 6 },
  s31: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, padding: 16, color: '#ffffff', fontWeight: '500', fontSize: 14, height: 112 },
  s32: { backgroundColor: '#0f172a', borderWidth: 2, borderStyle: 'dashed', borderColor: '#1e293b', borderRadius: 16, height: 112, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  s33: { color: '#60a5fa', fontWeight: '700', fontSize: 12 },
  s34: { backgroundColor: '#059669', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  s35: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  s36: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  s37: { backgroundColor: '#2563eb' },
  s38: { fontWeight: '900', fontSize: 14 },
  s39: { color: '#ffffff' },
  s40: { color: '#94a3b8' },
  s41: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12 },
  s42: { backgroundColor: '#2563eb' },
  s43: { fontWeight: '900', fontSize: 14 },
  s44: { color: '#ffffff' },
  s45: { color: '#94a3b8' },
});
