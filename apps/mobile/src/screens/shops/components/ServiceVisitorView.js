import React from 'react';
import { View, Text, ScrollView, TouchableOpacity , StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Wrench, Plus, Calculator } from 'lucide-react-native';

export default function ServiceVisitorView({ shop }) {
  const handleQuote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={s.s0}>
      <View style={s.s1}>
        <Text style={s.s2}>{shop?.name || 'Quick Repair Garage'}</Text>
        <Text style={s.s3}>Automotive Services</Text>
      </View>
      
      <View style={s.s4}>
        <Text style={s.s5}>Need a repair?</Text>
        <Text style={s.s6}>Get a quick estimated quote for your service.</Text>
        <TouchableOpacity 
          style={s.s7} 
          onPress={handleQuote}
        >
          <Calculator size={16} color="#000" style={s.s8} />
          <Text style={s.s9}>GET ESTIMATE</Text>
        </TouchableOpacity>
      </View>

      <View style={s.s10}>
        <Text style={s.s11}>Popular Services</Text>
        {['Car Wash', 'Oil Change', 'Wheel Alignment'].map((service, idx) => (
          <View key={idx} style={s.s12}>
            <View>
              <Text style={s.s13}>{service}</Text>
              <Text style={s.s14}>From ₹399</Text>
            </View>
            <TouchableOpacity 
              style={s.s15} 
              onPress={handleQuote}
            >
              <Plus size={14} color="#f59e0b" />
              <Text style={s.s16}>ADD</Text>
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
  s4: { margin: 16, backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', borderRadius: 24, padding: 20 },
  s5: { fontSize: 18, fontWeight: '900', color: '#fbbf24', marginBottom: 4 },
  s6: { color: '#94a3b8', fontSize: 12, fontWeight: '500', marginBottom: 16 },
  s7: { backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s8: { marginRight: 8 },
  s9: { color: '#020617', fontWeight: '900', fontSize: 12 },
  s10: { padding: 16 },
  s11: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s12: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s13: { fontWeight: '700', color: '#ffffff', fontSize: 16 },
  s14: { color: '#fbbf24', fontWeight: '700', fontSize: 12, marginTop: 2 },
  s15: { backgroundColor: 'rgba(245,158,11,0.1)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.3)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  s16: { color: '#fbbf24', fontWeight: '900', fontSize: 12 },
});
