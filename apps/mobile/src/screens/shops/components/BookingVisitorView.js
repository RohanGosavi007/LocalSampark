import React from 'react';
import { View, Text, ScrollView, TouchableOpacity , StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Calendar, Clock, Plus } from 'lucide-react-native';

export default function BookingVisitorView({ shop }) {
  const handleBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView style={s.s0}>
      <View style={s.s1}>
        <Text style={s.s2}>{shop?.name || 'City Clinic'}</Text>
        <Text style={s.s3}>Healthcare & Appointments</Text>
      </View>
      
      <View style={s.s4}>
        <Text style={s.s5}>LIVE TOKEN TRACKER</Text>
        <View style={s.s6}>
          <View style={s.s7}>
            <Text style={s.s8}>#18</Text>
            <Text style={s.s9}>Currently Serving</Text>
          </View>
          <View style={s.s10} />
          <View style={s.s11}>
            <Text style={s.s12}>12m</Text>
            <Text style={s.s13}>Est. Wait Time</Text>
          </View>
        </View>
      </View>

      <View style={s.s14}>
        <Text style={s.s15}>Book Appointment</Text>
        {['General Checkup', 'Dental Cleaning', 'Consultation'].map((service, idx) => (
          <View key={idx} style={s.s16}>
            <View>
              <Text style={s.s17}>{service}</Text>
              <Text style={s.s18}>₹500</Text>
            </View>
            <TouchableOpacity style={s.s19} onPress={handleBook}>
              <Text style={s.s20}>BOOK</Text>
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
  s4: { margin: 16, backgroundColor: 'rgba(14,165,233,0.1)', borderWidth: 1, borderColor: 'rgba(14,165,233,0.3)', borderRadius: 24, padding: 20, alignItems: 'center' },
  s5: { fontSize: 12, fontWeight: '900', color: '#38bdf8', marginBottom: 12, letterSpacing: 2, textTransform: 'uppercase' },
  s6: { flexDirection: 'row', width: '100%', justifyContent: 'space-around', alignItems: 'center' },
  s7: { alignItems: 'center' },
  s8: { fontSize: 36, fontWeight: '900', color: '#38bdf8' },
  s9: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  s10: { width: 1, height: 40, backgroundColor: 'rgba(14,165,233,0.3)' },
  s11: { alignItems: 'center' },
  s12: { fontSize: 36, fontWeight: '900', color: '#38bdf8' },
  s13: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginTop: 4 },
  s14: { padding: 16 },
  s15: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s16: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 16, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s17: { fontWeight: '700', color: '#ffffff', fontSize: 16 },
  s18: { color: '#38bdf8', fontWeight: '700', fontSize: 12, marginTop: 2 },
  s19: { backgroundColor: '#0ea5e9', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  s20: { color: '#020617', fontWeight: '900', fontSize: 12 },
});
