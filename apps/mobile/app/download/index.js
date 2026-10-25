import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Share2, DownloadCloud, Smartphone } from 'lucide-react-native';

export default function DownloadScreen() {
  const router = useRouter();
  const handleShare = async () => {
    try {
      await Share.share({
        message: 'Join LocalSampark, the hyperlocal neighbourhood community app! https://localsampark.com',
        title: 'LocalSampark'
      });
    } catch (e) {}
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Share & Install App</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Smartphone color="#38bdf8" size={36} style={{ marginBottom: 12 }} />
          <Text style={styles.title}>LocalSampark on Android & iOS</Text>
          <Text style={styles.desc}>
            You are running the official LocalSampark Android native client. Share with neighbors to grow your society community!
          </Text>
          <TouchableOpacity style={styles.btn} onPress={handleShare}>
            <Share2 color="#fff" size={18} style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Share App Link</Text>
          </TouchableOpacity>
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
  card: { backgroundColor: '#1e293b', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  title: { color: '#f8fafc', fontSize: 18, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  desc: { color: '#94a3b8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  btn: { flexDirection: 'row', backgroundColor: '#2563eb', paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' }
});
