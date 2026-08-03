import React from 'react';
import { View, Text, ScrollView, TouchableOpacity , StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Car, KeyRound } from 'lucide-react-native';

export default function RentalVisitorView({ shop }) {
  const handleRent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={s.s0}>
      <View style={s.s1}>
        <Text style={s.s2}>{shop?.name || 'Kisan Tractors & Tools'}</Text>
        <Text style={s.s3}>Fleet & Heavy Equipment</Text>
      </View>

      <View style={s.s4}>
        <Text style={s.s5}>Available Equipment</Text>
        {['Mahindra Tractor', 'JCB Excavator', 'Water Tanker'].map((item, idx) => (
          <View key={idx} style={s.s6}>
            <View style={s.s7}>
              <Car size={24} color="#64748b" />
            </View>
            <View style={s.s8}>
              <Text style={s.s9}>{item}</Text>
              <Text style={s.s10}>₹500 / hr</Text>
              <View style={s.s11}>
                <Text style={s.s12}>Available Now</Text>
              </View>
            </View>
            <TouchableOpacity 
              style={s.s13} 
              onPress={handleRent}
            >
              <Text style={s.s14}>RENT</Text>
            </TouchableOpacity>
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
  s4: { padding: 16 },
  s5: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s6: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 14, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  s7: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  s8: { flex: 1 },
  s9: { fontWeight: '700', color: '#ffffff', fontSize: 16, marginBottom: 2 },
  s10: { color: '#34d399', fontWeight: '900', fontSize: 14, marginBottom: 4 },
  s11: { backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  s12: { color: '#34d399', fontSize: 10, fontWeight: '700' },
  s13: { backgroundColor: '#059669', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  s14: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});
