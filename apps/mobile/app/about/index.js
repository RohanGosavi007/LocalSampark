import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Heart, MapPin, Globe, Sparkles } from 'lucide-react-native';

export default function AboutScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About LocalSampark</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.title}>🏘️ Hyperlocal Community Platform</Text>
          <Text style={styles.desc}>
            LocalSampark connects housing societies, local merchants, residents, and service providers into one unified, trusted neighbourhood ecosystem.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Our Mission</Text>
          <Text style={styles.desc}>
            To empower local Indian communities with zero-middleman commerce, emergency safety, neighborhood carpooling, verified domestic services, and democratic society operations.
          </Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Privacy & Trust</Text>
          <Text style={styles.desc}>
            Data privacy is strictly guarded with territory-isolated security, AES encryption, and zero fabricated metrics.
          </Text>
        </View>
        <View style={styles.footer}>
          <Text style={styles.version}>LocalSampark Mobile v1.0.0 (Release Candidate)</Text>
          <Text style={styles.copyright}>© 2026 LocalSampark. Made with ❤️ in Pune, India.</Text>
        </View>
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
  card: { backgroundColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  title: { color: '#38bdf8', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#f8fafc', fontSize: 16, fontWeight: '700', marginBottom: 6 },
  desc: { color: '#94a3b8', fontSize: 14, lineHeight: 22 },
  footer: { alignItems: 'center', marginTop: 24, paddingBottom: 40 },
  version: { color: '#64748b', fontSize: 13, fontWeight: '600' },
  copyright: { color: '#475569', fontSize: 12, marginTop: 4 }
});
