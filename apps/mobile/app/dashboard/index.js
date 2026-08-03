import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

// Import our new native, database-connected dashboard component
import DashboardNativeTemplate from '../../src/components/DashboardNativeTemplate';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={s.s0}>
      {/* Custom Header */}
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s3}>Dashboard</Text>
      </View>

      {/* Render the new fully native, database-connected dashboard template */}
      <DashboardNativeTemplate />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b', backgroundColor: '#0f172a' },
  s2: { marginRight: 16, padding: 8, backgroundColor: '#1e293b', borderRadius: 9999 },
  s3: { color: '#ffffff', fontSize: 20, fontWeight: '700', textTransform: 'capitalize' },
});
