import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Car, Phone, CheckCircle2, AlertCircle } from 'lucide-react-native';

export default function FleetAssetTracker({ themeColor = '#14b8a6' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="flex-1 mt-4">
      <Text className="text-lg font-black text-white mb-4">Asset Tracker</Text>
      
      <View className="flex-row gap-3 mb-6">
        <View className="flex-1 border border-teal-500/30 bg-teal-500/10 rounded-2xl p-4 items-center">
          <Text className="text-3xl font-black text-teal-400">12</Text>
          <Text className="text-xs text-slate-400 font-bold mt-1">Available</Text>
        </View>
        <View className="flex-1 border border-slate-800 bg-slate-900 rounded-2xl p-4 items-center">
          <Text className="text-3xl font-black text-white">5</Text>
          <Text className="text-xs text-slate-400 font-bold mt-1">Rented Out</Text>
        </View>
      </View>
      
      <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">Recent Bookings</Text>
      <View className="gap-3">
        {[1, 2].map((item) => (
          <View key={item} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm shadow-slate-900">
            <View className="flex-row justify-between items-start mb-2">
              <Text className="font-bold text-base text-white flex-1 mr-2">Mahindra Tractor 575 DI</Text>
              <View className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                <Text className="text-amber-400 font-bold text-xs">In Field</Text>
              </View>
            </View>
            <Text className="text-xs text-slate-300 font-medium mb-1">Rented by: Suresh Kumar (9876543210)</Text>
            <Text className="text-xs text-red-400 font-bold mb-4">Due: Tomorrow, 5:00 PM</Text>
            
            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl border border-slate-800 bg-slate-950 items-center flex-row justify-center active:bg-slate-800" 
                onPress={handleAction}
              >
                <Phone size={14} color="#94a3b8" className="mr-1.5" />
                <Text className="text-slate-300 font-bold text-xs">Call Client</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl bg-teal-600 items-center flex-row justify-center active:bg-teal-500" 
                onPress={handleAction}
              >
                <CheckCircle2 size={14} color="#fff" className="mr-1.5" />
                <Text className="text-white font-black text-xs">Mark Returned</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
