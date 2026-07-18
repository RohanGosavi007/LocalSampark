import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function StoryCreateScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Story Create</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.icon}>🚀</Text>
          <Text style={styles.title}>Story Create Module</Text>
          <Text style={styles.subtitle}>This module has been synchronized from the Web Application and is ready for native mobile implementation.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { marginRight: 16, padding: 4 },
  backText: { fontSize: 24, color: '#0f172a' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  card: { backgroundColor: '#ffffff', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0', marginTop: 40 },
  icon: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', lineHeight: 22 }
});
