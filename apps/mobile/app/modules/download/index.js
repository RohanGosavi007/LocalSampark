import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';

export default function DownloadScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={{ fontSize: 20 }}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Download App</Text>
      </View>
      
      <View style={styles.content}>
        <View style={styles.iconBox}>
          <Text style={{ fontSize: 60 }}>📱</Text>
        </View>
        <Text style={styles.mainTitle}>Get the LocalSampark App</Text>
        <Text style={styles.subtitle}>
          You are already using the LocalSampark app! This screen typically links to the Google Play Store and Apple App Store for web users.
        </Text>
        
        <View style={styles.storesContainer}>
          <TouchableOpacity style={styles.storeBtn}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🤖</Text>
            <View>
              <Text style={styles.storeBtnSub}>GET IT ON</Text>
              <Text style={styles.storeBtnTitle}>Google Play</Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.storeBtn}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>🍎</Text>
            <View>
              <Text style={styles.storeBtnSub}>Download on the</Text>
              <Text style={styles.storeBtnTitle}>App Store</Text>
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/(tabs)/')}>
          <Text style={styles.homeBtnText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  title: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  content: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  iconBox: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  mainTitle: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: '#64748b', textAlign: 'center', lineHeight: 22, paddingHorizontal: 20, marginBottom: 40 },
  storesContainer: { width: '100%', gap: 16, marginBottom: 40 },
  storeBtn: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  storeBtnSub: { color: '#cbd5e1', fontSize: 10, fontWeight: '600' },
  storeBtnTitle: { color: '#fff', fontSize: 18, fontWeight: '700' },
  homeBtn: { backgroundColor: '#3b82f6', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, width: '100%', alignItems: 'center' },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
