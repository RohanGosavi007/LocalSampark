import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldAlert, ShoppingBag, Car, Briefcase, Building, Sparkles } from 'lucide-react-native';

const FEATURES = [
  { icon: ShieldAlert, title: 'Emergency SOS', desc: 'Instant siren broadcast, GPS coordinates to society security & contacts.', color: '#ef4444', route: '/modules/sos' },
  { icon: ShoppingBag, title: 'Local Marketplace', desc: 'Buy and sell pre-owned items directly within your society & ward.', color: '#f59e0b', route: '/modules/marketplace' },
  { icon: Car, title: 'Carpool & Rideshare', desc: 'Commute with verified neighbors and split fuel costs transparently.', color: '#06b6d4', route: '/modules/carpool' },
  { icon: Briefcase, title: 'Local Jobs & Gigs', desc: 'Find part-time, full-time, and domestic service gigs right nearby.', color: '#8b5cf6', route: '/modules/jobs' },
  { icon: Building, title: 'Society & Gate Operations', desc: 'Pre-approve visitors, view notices, pay maintenance dues.', color: '#10b981', route: '/modules/society' }
];

export default function FeaturesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Platform Features</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {FEATURES.map((f, i) => {
          const Icon = f.icon;
          return (
            <TouchableOpacity key={i} style={styles.card} onPress={() => router.push(f.route)} activeOpacity={0.7}>
              <View style={[styles.iconBox, { backgroundColor: f.color + '20' }]}>
                <Icon color={f.color} size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{f.title}</Text>
                <Text style={styles.cardDesc}>{f.desc}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#1e293b' },
  backBtn: { marginRight: 16 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  content: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1e293b', padding: 16, borderRadius: 14, marginBottom: 12, borderWidth: 1, borderColor: '#334155', gap: 14 },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: '#94a3b8', fontSize: 13, lineHeight: 18 }
});
