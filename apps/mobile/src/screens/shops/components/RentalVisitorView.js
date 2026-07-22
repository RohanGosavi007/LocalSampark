import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Car, KeyRound } from 'lucide-react-native';

export default function RentalVisitorView({ shop }) {
  const handleRent = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-5 bg-slate-900 border-b border-slate-800">
        <Text className="text-2xl font-black text-white">{shop?.name || 'Kisan Tractors & Tools'}</Text>
        <Text className="text-slate-400 font-semibold text-xs mt-1">Fleet & Heavy Equipment</Text>
      </View>

      <View className="p-4">
        <Text className="text-white font-bold text-lg mb-4">Available Equipment</Text>
        {['Mahindra Tractor', 'JCB Excavator', 'Water Tanker'].map((item, idx) => (
          <View key={idx} className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl mb-3 flex-row items-center">
            <View className="w-16 h-16 rounded-xl bg-slate-950 border border-slate-800 items-center justify-center mr-3">
              <Car size={24} color="#64748b" />
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white text-base mb-0.5">{item}</Text>
              <Text className="text-emerald-400 font-black text-sm mb-1">₹500 / hr</Text>
              <View className="bg-emerald-500/10 border border-emerald-500/30 self-start px-2 py-0.5 rounded-md">
                <Text className="text-emerald-400 text-[10px] font-bold">Available Now</Text>
              </View>
            </View>
            <TouchableOpacity 
              className="bg-emerald-600 px-4 py-2.5 rounded-xl items-center active:bg-emerald-500" 
              onPress={handleRent}
            >
              <Text className="text-white font-black text-xs">RENT</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
