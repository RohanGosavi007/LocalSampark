import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
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
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black capitalize flex-1">Offline Sync</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        
        <View className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 rounded-3xl mb-6 border border-slate-700 items-center">
          {isOnline ? <RefreshCw color="#34d399" size={48} className="mb-4" /> : <WifiOff color="#ef4444" size={48} className="mb-4" />}
          <Text className="text-white text-2xl font-black mb-2">{isOnline ? 'Online' : 'You are Offline'}</Text>
          <Text className="text-slate-400 text-sm text-center">
            {isOnline 
              ? 'You are back online. Pending actions will sync automatically.' 
              : 'You are disconnected. Actions will be saved and synced later.'}
          </Text>
        </View>

        <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-4">
          Pending Actions ({queueCount})
        </Text>

        {queueItems.length === 0 ? (
          <View className="p-8 items-center">
            <CloudOff color="#475569" size={32} />
            <Text className="text-slate-500 mt-4 font-bold text-center">No pending actions.</Text>
          </View>
        ) : (
          queueItems.map((item) => (
            <View key={item.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-3 flex-row items-center">
              <View className="w-12 h-12 bg-slate-950 rounded-full items-center justify-center mr-4 border border-slate-800">
                <Clock color="#f59e0b" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-1">{item.method} Request</Text>
                <Text className="text-slate-400 text-xs leading-5" numberOfLines={1}>{item.url}</Text>
                <Text className="text-slate-500 text-[10px] mt-1">{item.createdAt.toLocaleString()}</Text>
              </View>
            </View>
          ))
        )}

        {queueItems.length > 0 && (
          <TouchableOpacity 
            onPress={handleSync}
            disabled={syncing || !isOnline}
            className={`mt-6 p-4 rounded-2xl flex-row justify-center items-center ${isOnline ? 'bg-blue-600' : 'bg-slate-800'}`}
          >
            {syncing ? <ActivityIndicator color="#fff" className="mr-2" /> : <RefreshCw color="#fff" size={20} className="mr-2" />}
            <Text className={`font-bold ${isOnline ? 'text-white' : 'text-slate-500'}`}>
              {syncing ? 'Syncing...' : 'Force Sync Now'}
            </Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
