import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Wrench, Plus, Calculator } from 'lucide-react-native';

export default function ServiceVisitorView({ shop }) {
  const handleQuote = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-5 bg-slate-900 border-b border-slate-800">
        <Text className="text-2xl font-black text-white">{shop?.name || 'Quick Repair Garage'}</Text>
        <Text className="text-slate-400 font-semibold text-xs mt-1">Automotive Services</Text>
      </View>
      
      <View className="m-4 bg-amber-500/10 border border-amber-500/30 rounded-3xl p-5">
        <Text className="text-lg font-black text-amber-400 mb-1">Need a repair?</Text>
        <Text className="text-slate-400 text-xs font-medium mb-4">Get a quick estimated quote for your service.</Text>
        <TouchableOpacity 
          className="bg-amber-500 py-3 rounded-xl items-center flex-row justify-center active:bg-amber-400" 
          onPress={handleQuote}
        >
          <Calculator size={16} color="#000" className="mr-2" />
          <Text className="text-slate-950 font-black text-xs">GET ESTIMATE</Text>
        </TouchableOpacity>
      </View>

      <View className="p-4">
        <Text className="text-white font-bold text-lg mb-4">Popular Services</Text>
        {['Car Wash', 'Oil Change', 'Wheel Alignment'].map((service, idx) => (
          <View key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
            <View>
              <Text className="font-bold text-white text-base">{service}</Text>
              <Text className="text-amber-400 font-bold text-xs mt-0.5">From ₹399</Text>
            </View>
            <TouchableOpacity 
              className="bg-amber-500/10 border border-amber-500/30 px-4 py-2 rounded-xl flex-row items-center active:bg-amber-500/20" 
              onPress={handleQuote}
            >
              <Plus size={14} color="#f59e0b" className="mr-1" />
              <Text className="text-amber-400 font-black text-xs">ADD</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
