import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator , StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, WifiOff, CloudOff, RefreshCw, Clock } from 'lucide-react-native';
import NetInfo from '@react-native-community/netinfo';
import { database } from '../../src/database';
import { OfflineQueueService } from '../../src/services/OfflineQueueService';

export default function NativeofflineScreen() {
  const router = useRouter();
  const [queueCount, setQueueCount] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(!!state.isConnected && !!state.isInternetReachable);
    });
    return () => unsubscribe();
  }, []);

  const loadQueue = async () => {
    const items = await database.get('offline_queue').query().fetch();
    setQueueCount(items.length);
    setQueueItems(items);
  };

  useEffect(() => {
    loadQueue();
    // Poll the DB every few seconds in case it changes
    const interval = setInterval(loadQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      alert("Still offline. Please check your internet connection.");
      return;
    }
    setSyncing(true);
    await OfflineQueueService.processQueue();
    await loadQueue();
    setSyncing(false);
  };

  return (
    <SafeAreaView style={s.s0}>
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text style={s.s3}>Offline Sync</Text>
      </View>

      <ScrollView style={s.s4} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View style={s.s5}>
          {isOnline ? <RefreshCw color="#34d399" size={48} style={s.s6} /> : <WifiOff color="#ef4444" size={48} />}
          <Text style={s.s7}>{isOnline ? 'Online' : 'You are Offline'}</Text>
          <Text style={s.s8}>
            {isOnline 
              ? 'You are back online. Pending actions will sync automatically.' 
              : 'You are disconnected. Actions will be saved and synced later.'}
          </Text>
        </View>

        <Text style={s.s9}>
          Pending Actions ({queueCount})
        </Text>

        {queueItems.length === 0 ? (
          <View style={s.s10}>
            <CloudOff color="#475569" size={32} />
            <Text style={s.s11}>No pending actions.</Text>
          </View>
        ) : (
          queueItems.map((item) => (
            <View key={item.id} style={s.s12}>
              <View style={s.s13}>
                <Clock color="#f59e0b" size={20} />
              </View>
              <View style={s.s14}>
                <Text style={s.s15}>{item.method} Request</Text>
                <Text style={s.s16} numberOfLines={1}>{item.url}</Text>
                <Text style={s.s17}>{item.createdAt.toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}

        {queueItems.length > 0 && (
          <TouchableOpacity 
            onPress={handleSync}
            disabled={syncing || !isOnline}
            style={[s.s20, isOnline ? s.s21 : s.s22]}
          >
            {syncing ? <ActivityIndicator color="#fff" style={s.s18} /> : <RefreshCw color="#fff" size={20} style={s.s19} />}
            <Text style={[s.s23, isOnline ? s.s24 : s.s25]}>
              {syncing ? 'Syncing...' : 'Force Sync Now'}
            </Text>
          </TouchableOpacity>
        )}

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
  s5: { padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#334155', alignItems: 'center' },
  s6: { marginBottom: 16 },
  s7: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  s8: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
  s9: { color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, marginBottom: 16 },
  s10: { padding: 32, alignItems: 'center' },
  s11: { color: '#64748b', marginTop: 16, fontWeight: '700', textAlign: 'center' },
  s12: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  s13: { width: 48, height: 48, backgroundColor: '#020617', borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginRight: 16, borderWidth: 1, borderColor: '#1e293b' },
  s14: { flex: 1 },
  s15: { color: '#ffffff', fontWeight: '700', fontSize: 16, marginBottom: 4 },
  s16: { color: '#94a3b8', fontSize: 12, lineHeight: 5 },
  s17: { color: '#64748b', fontSize: 10, marginTop: 4 },
  s18: { marginRight: 8 },
  s19: { marginRight: 8 },
  s20: { marginTop: 24, padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  s21: { backgroundColor: '#2563eb' },
  s22: { backgroundColor: '#1e293b' },
  s23: { fontWeight: '700' },
  s24: { color: '#ffffff' },
  s25: { color: '#64748b' },
});
