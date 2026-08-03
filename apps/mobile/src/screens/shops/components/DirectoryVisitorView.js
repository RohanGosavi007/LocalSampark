import React from 'react';
import { View, Text, ScrollView, TouchableOpacity , StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Phone, MessageSquare, MapPin } from 'lucide-react-native';

export default function DirectoryVisitorView({ shop }) {
  const handleContact = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={s.s0}>
      <View style={s.s1}>
        <Text style={s.s2}>{shop?.name || 'Local Real Estate'}</Text>
        <Text style={s.s3}>Directory Listing</Text>
      </View>
      
      <View style={s.s4}>
        <TouchableOpacity style={s.s5} onPress={() => handleContact('call')}>
          <Phone size={16} color="#6366f1" />
          <Text style={s.s6}>Call</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.s7} onPress={() => handleContact('whatsapp')}>
          <MessageSquare size={16} color="#10b981" style={s.s8} />
          <Text style={s.s9}>WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.s10} onPress={() => handleContact('map')}>
          <MapPin size={16} color="#0ea5e9" />
          <Text style={s.s11}>Map</Text>
        </TouchableOpacity>
      </View>

      <View style={s.s12}>
        <Text style={s.s13}>Featured Listings</Text>
        {['2 BHK Apartment in City Center', 'Office Space - 1200 sqft', 'Plot for Sale'].map((item, idx) => (
          <View key={idx} style={s.s14}>
            <View style={s.s15} />
            <View style={s.s16}>
              <Text style={s.s17} numberOfLines={2}>{item}</Text>
              <Text style={s.s18}>₹45,00,000</Text>
              <Text style={s.s19}>Sector 15, Near Mall</Text>
              <TouchableOpacity style={s.s20} onPress={() => handleContact('inquire')}>
                <Text style={s.s21}>Inquire Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { padding: 20, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s2: { fontSize: 24, fontWeight: '900', color: '#ffffff' },
  s3: { color: '#94a3b8', fontWeight: '600', fontSize: 12, marginTop: 4 },
  s4: { flexDirection: 'row', padding: 16, gap: 12 },
  s5: { flex: 1, backgroundColor: 'rgba(99,102,241,0.1)', borderWidth: 1, borderColor: 'rgba(99,102,241,0.3)', paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s6: { color: '#818cf8', fontWeight: '700', fontSize: 12 },
  s7: { flex: 1, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s8: { marginRight: 6 },
  s9: { color: '#34d399', fontWeight: '700', fontSize: 12 },
  s10: { flex: 1, backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)', paddingVertical: 12, borderRadius: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s11: { color: '#38bdf8', fontWeight: '700', fontSize: 12 },
  s12: { padding: 16 },
  s13: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s14: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, marginBottom: 16, overflow: 'hidden' },
  s15: { width: '100%', height: 144, backgroundColor: '#020617', borderBottomWidth: 1, borderColor: '#1e293b' },
  s16: { padding: 16 },
  s17: { fontWeight: '700', fontSize: 16, color: '#ffffff', marginBottom: 8 },
  s18: { color: '#818cf8', fontWeight: '900', fontSize: 16, marginBottom: 4 },
  s19: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 16 },
  s20: { backgroundColor: '#4f46e5', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  s21: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});
