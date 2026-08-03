import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert, StyleSheet } from 'react-native';
import { Megaphone, Calendar, Tag, Zap } from 'lucide-react-native';

export default function CampaignBuilder({ shopId }) {
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [isFlashSale, setIsFlashSale] = useState(false);

  const handleCreate = () => {
    Alert.alert('Campaign Created 🎉', `"${title}" has been scheduled successfully!`);
    setTitle(''); setDiscountValue(''); setIsFlashSale(false);
  };

  return (
    <View style={s.card}>
      <View style={s.headerRow}>
        <View style={s.iconBox}><Megaphone size={20} color="#3b82f6" /></View>
        <Text style={s.headerTitle}>Create Campaign</Text>
      </View>
      <Text style={s.fieldLabel}>Campaign Title</Text>
      <TextInput style={s.input} placeholder="e.g. Weekend Flash Sale" placeholderTextColor="#64748b" value={title} onChangeText={setTitle} />
      <Text style={s.fieldLabel}>Discount Value (₹ or %)</Text>
      <TextInput style={s.input} placeholder="20" placeholderTextColor="#64748b" keyboardType="numeric" value={discountValue} onChangeText={setDiscountValue} />
      <View style={s.switchRow}>
        <View style={s.switchLeft}><Zap size={16} color="#eab308" /><Text style={s.switchLabel}>Flash Sale (FOMO Timer)?</Text></View>
        <Switch value={isFlashSale} onValueChange={setIsFlashSale} trackColor={{ false: '#334155', true: '#3b82f6' }} thumbColor={isFlashSale ? '#ffffff' : '#94a3b8'} />
      </View>
      <TouchableOpacity style={s.submitBtn} onPress={handleCreate}>
        <Calendar size={18} color="#fff" />
        <Text style={s.submitText}>Schedule Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 24, padding: 20, marginVertical: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: '#ffffff' },
  fieldLabel: { color: '#94a3b8', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  input: { backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#ffffff', fontWeight: '500', fontSize: 14, marginBottom: 16 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#020617', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 20 },
  switchLeft: { flexDirection: 'row', alignItems: 'center' },
  switchLabel: { color: '#cbd5e1', fontWeight: '700', fontSize: 12, marginLeft: 8 },
  submitBtn: { backgroundColor: '#2563eb', paddingVertical: 14, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  submitText: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
});
