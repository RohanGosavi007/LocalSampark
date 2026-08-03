import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Users, TrendingDown } from 'lucide-react-native';

export default function NativecommunityhubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s3}>Community Hub</Text>
      </View>

      <ScrollView style={s.s4} contentContainerStyle={{ padding: 16 }}>
        
        <TouchableOpacity 
          onPress={() => router.push('/community-hub/trust-feed')}
          style={s.s5}
        >
          <View style={s.s6}>
            <ShieldCheck color="#34d399" size={32} />
            <Text style={s.s7}>Trust Feed</Text>
            <Text style={s.s8}>Watch verified video reviews from your neighbors.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/community-hub/group-buy')}
          style={s.s9}
        >
          <View style={s.s10}>
            <Users color="#c084fc" size={32} />
            <Text style={s.s11}>Group Buying</Text>
            <Text style={s.s12}>Unlock wholesale prices by teaming up with your society.</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  s2: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s3: { color: '#ffffff', fontSize: 20, fontWeight: '900', textTransform: 'capitalize', flex: 1 },
  s4: { flex: 1 },
  s5: { padding: 24, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', flexDirection: 'row', alignItems: 'center' },
  s6: { flex: 1 },
  s7: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  s8: { color: '#a7f3d0', fontSize: 14 },
  s9: { padding: 24, borderRadius: 24, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(168,85,247,0.3)', flexDirection: 'row', alignItems: 'center' },
  s10: { flex: 1 },
  s11: { color: '#ffffff', fontSize: 20, fontWeight: '900', marginBottom: 4 },
  s12: { color: '#e9d5ff', fontSize: 14 },
});
