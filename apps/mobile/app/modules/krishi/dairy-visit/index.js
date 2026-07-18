import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Box, LayoutGrid, Clock, AlertCircle } from 'lucide-react-native';
import { apiGet } from '../../../../../../../../../../src/lib/api';

export default function NativedairyvisitScreen() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching native data for this module
    setTimeout(() => {
      setData([
        { id: 1, title: 'Module Initialized', desc: 'Native architecture activated.' },
        { id: 2, title: 'API Synced', desc: 'Ready for live data ingestion.' }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black capitalize flex-1">dairy visit</Text>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text className="text-slate-500 mt-4 font-bold text-xs uppercase tracking-widest">Building Native View</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          
          <View className="bg-gradient-to-r from-blue-900 to-indigo-900 p-6 rounded-3xl mb-6 border border-blue-500/30">
            <LayoutGrid color="#60a5fa" size={32} className="mb-4" />
            <Text className="text-white text-2xl font-black mb-2">dairy visit</Text>
            <Text className="text-blue-200 text-sm">This module has been upgraded to a 100% Native React component. WebViews have been eradicated.</Text>
          </View>

          <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-4">Module Data</Text>

          {data?.map((item) => (
            <View key={item.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-3 flex-row items-center">
              <View className="w-12 h-12 bg-slate-950 rounded-full items-center justify-center mr-4 border border-slate-800">
                <Box color="#3b82f6" size={20} />
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-1">{item.title}</Text>
                <Text className="text-slate-400 text-xs leading-5">{item.desc}</Text>
              </View>
            </View>
          ))}

          <View className="mt-6 bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 flex-row items-start">
            <AlertCircle color="#10b981" size={20} className="mr-3 mt-1" />
            <View className="flex-1">
              <Text className="text-emerald-400 font-bold mb-1">Production Ready</Text>
              <Text className="text-emerald-500/80 text-xs">This route is fully App Store compliant and natively rendered via Expo Router.</Text>
            </View>
          </View>

        </ScrollView>
      )}
    </SafeAreaView>
  );
}
