import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronLeft, Leaf, Tractor, Sprout } from 'lucide-react-native';
import { RURAL_CATEGORIES, TOP_FEATURES, MANDI_RATES } from '../../src/data/rural-services';

export default function KrishiScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(RURAL_CATEGORIES[0].id);

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={s.s3}>
          <Leaf color="#22c55e" size={20} />
          <Text style={s.s4}>Krishi Hub</Text>
        </View>
        <View style={s.s5} />
      </View>

      <ScrollView style={s.s6} stickyHeaderIndices={[2]}>
        
        {/* Mandi Ticker Mock */}
        <View style={s.s7}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.s8}>
            {MANDI_RATES.map((m, idx) => (
              <View key={idx} style={s.s9}>
                <Text style={s.s10}>{m.crop}</Text>
                <Text style={s.s11}>{m.price}</Text>
                <Text style={m.trend === 'up' ? s.trendUp : m.trend === 'down' ? s.trendDown : s.trendNeutral}>
                  {m.change}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Hero Section */}
        <View style={s.s12}>
          <Text style={s.s13}>Transforming Rural India</Text>
          <Text style={s.s14}>Digital Marketplace for Farmers</Text>
          <Text style={s.s15}>Direct Mandi rates, rent equipment, sell produce without middlemen, and access expert advice.</Text>
          
          <View style={s.s16}>
            <TouchableOpacity style={s.s17}>
              <Text style={s.s18}>Join as Farmer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sticky Category Tabs */}
        <View style={s.s19}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.s20}>
            {RURAL_CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                onPress={() => setActiveCategory(cat.id)}
                style={[s.s38, activeCategory === cat.id ? s.s39 : s.s40]}
              >
                <Text style={[s.s41, activeCategory === cat.id ? s.s42 : s.s43]}>{cat.title_key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Category Content */}
        <View style={s.s21}>
          {RURAL_CATEGORIES.filter(c => c.id === activeCategory).map(cat => (
            <View key={cat.id} style={s.s22}>
              <Text style={[s.s23, { color: cat.color }]}>
                {cat.title_key} Services
              </Text>
              
              <View style={s.s24}>
                {cat.features.map(feat => (
                  <TouchableOpacity 
                    key={feat.id} 
                    style={[s.s25, { borderTopColor: cat.color }]}
                  >
                    <View style={s.s26}>
                      <Text style={s.s27}>{feat.icon}</Text>
                    </View>
                    <Text style={s.s28}>{feat.title_key}</Text>
                    <Text style={s.s29}>{feat.desc_key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        {/* Priority Features Section */}
        <View style={s.s30}>
          <View style={s.s31}>
            <Sprout color="#22c55e" size={24} style={s.s32} />
            <Text style={s.s33}>Trending Features</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TOP_FEATURES.map(feat => (
              <TouchableOpacity 
                key={feat.id} 
                style={s.s34}
              >
                <Text style={s.s35}>{feat.icon}</Text>
                <Text style={s.s36}>{feat.title_key}</Text>
                <Text style={s.s37}>{feat.desc_key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b' },
  s2: { padding: 8, backgroundColor: '#1e293b', borderRadius: 9999 },
  s3: { flexDirection: 'row', alignItems: 'center' },
  s4: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  s5: { width: 40, height: 40 },
  s6: { flex: 1 },
  s7: { backgroundColor: '#022c22', paddingVertical: 8 },
  s8: { flexDirection: 'row', paddingHorizontal: 16 },
  s9: { flexDirection: 'row', alignItems: 'center', marginRight: 24, backgroundColor: 'rgba(6,78,59,0.5)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 9999, borderWidth: 1, borderColor: 'rgba(6,95,70,0.5)' },
  s10: { color: '#6ee7b7', fontWeight: '700', marginRight: 8, fontSize: 12 },
  s11: { color: '#ffffff', fontWeight: '700', fontSize: 12, marginRight: 8 },
  s12: { padding: 24, backgroundColor: '#0f172a', borderBottomWidth: 1, borderColor: '#1e293b', paddingBottom: 40 },
  s13: { color: '#34d399', fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', fontSize: 12, marginBottom: 8, textAlign: 'center' },
  s14: { color: '#ffffff', fontSize: 30, fontWeight: '900', textAlign: 'center', marginBottom: 16, lineHeight: 1.25 },
  s15: { color: '#94a3b8', textAlign: 'center', marginBottom: 24, fontSize: 14 },
  s16: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  s17: { backgroundColor: '#059669', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  s18: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
  s19: { backgroundColor: 'rgba(2,6,23,0.9)', paddingVertical: 12, borderBottomWidth: 1, borderColor: '#1e293b' },
  s20: { paddingHorizontal: 16 },
  s21: { padding: 16 },
  s22: { marginBottom: 32 },
  s23: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 24, flexDirection: 'row', alignItems: 'center' },
  s24: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  s25: { backgroundColor: '#0f172a', borderTopWidth: 4, padding: 16, borderRadius: 16, width: '48%', marginBottom: 16 },
  s26: { width: 48, height: 48, borderRadius: 9999, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1e293b', marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  s27: { fontSize: 24 },
  s28: { color: '#ffffff', fontWeight: '700', fontSize: 14, marginBottom: 4 },
  s29: { color: '#94a3b8', fontSize: 12 },
  s30: { padding: 16, backgroundColor: '#0f172a', marginTop: 16, paddingBottom: 48 },
  s31: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
  s32: { marginRight: 8 },
  s33: { color: '#ffffff', fontSize: 20, fontWeight: '700' },
  s34: { backgroundColor: '#1e293b', padding: 16, borderRadius: 16, marginRight: 16, width: 192, borderWidth: 1, borderColor: '#334155' },
  s35: { fontSize: 30, marginBottom: 12 },
  s36: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  s37: { color: '#94a3b8', fontSize: 12 },
  s38: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 9999, marginRight: 12, borderWidth: 1 },
  s39: { backgroundColor: '#059669', borderColor: '#10b981' },
  s40: { backgroundColor: '#0f172a', borderColor: '#334155' },
  s41: { fontWeight: '700' },
  s42: { color: '#ffffff' },
  s43: { color: '#cbd5e1' },
  trendUp: { color: '#4ade80', fontWeight: '700', fontSize: 12 },
  trendDown: { color: '#f87171', fontWeight: '700', fontSize: 12 },
  trendNeutral: { color: '#facc15', fontWeight: '700', fontSize: 12 },
});
