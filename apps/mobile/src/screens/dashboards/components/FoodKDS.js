import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Utensils, Clock, Check } from 'lucide-react-native';

export default function FoodKDS({ themeColor = '#f97316' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <View className="flex-1 mt-4">
      <Text className="text-lg font-black text-white mb-4">Live Kitchen Display</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-4">
        {['Incoming', 'Preparing', 'Ready'].map((stage, i) => (
          <View key={stage} className="w-72 mr-4 border border-slate-800 rounded-2xl p-2 bg-slate-900">
            <View className="flex-row justify-between items-center p-3 rounded-xl mb-3 bg-orange-500/10 border border-orange-500/20">
              <Text className="font-bold text-sm text-orange-400">{stage}</Text>
              <View className="w-6 h-6 rounded-full bg-orange-500 items-center justify-center">
                <Text className="text-white font-black text-xs">{3 - i}</Text>
              </View>
            </View>
            
            {[1, 2].map(order => (
              <View key={order} className="border border-slate-800 rounded-xl p-3 mb-2 bg-slate-950">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="font-black text-white text-base">#10{order + i}</Text>
                  <View className="flex-row items-center">
                    <Clock size={12} color="#94a3b8" className="mr-1" />
                    <Text className="text-slate-400 text-xs font-semibold">4m ago</Text>
                  </View>
                </View>
                <View className="mb-3">
                  <Text className="text-xs text-slate-300 font-medium mb-1">1x Margherita Pizza</Text>
                  <Text className="text-xs text-slate-300 font-medium mb-1">2x Garlic Bread</Text>
                </View>
                <TouchableOpacity 
                  className="bg-orange-500 py-2.5 rounded-lg items-center active:bg-orange-400"
                  onPress={handleAction}
                >
                  <Text className="text-white font-black text-xs">{stage === 'Incoming' ? 'Accept' : 'Next Stage'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
