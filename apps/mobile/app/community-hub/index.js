import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck, Users, TrendingDown } from 'lucide-react-native';

export default function NativecommunityhubScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-black capitalize flex-1">Community Hub</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        
        <TouchableOpacity 
          onPress={() => router.push('/community-hub/trust-feed')}
          className="bg-gradient-to-r from-emerald-900 to-teal-900 p-6 rounded-3xl mb-4 border border-emerald-500/30 flex-row items-center"
        >
          <View className="flex-1">
            <ShieldCheck color="#34d399" size={32} className="mb-2" />
            <Text className="text-white text-xl font-black mb-1">Trust Feed</Text>
            <Text className="text-emerald-200 text-sm">Watch verified video reviews from your neighbors.</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={() => router.push('/community-hub/group-buy')}
          className="bg-gradient-to-r from-purple-900 to-fuchsia-900 p-6 rounded-3xl mb-4 border border-purple-500/30 flex-row items-center"
        >
          <View className="flex-1">
            <Users color="#c084fc" size={32} className="mb-2" />
            <Text className="text-white text-xl font-black mb-1">Group Buying</Text>
            <Text className="text-purple-200 text-sm">Unlock wholesale prices by teaming up with your society.</Text>
          </View>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
