import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Plus, Wrench, CheckCircle, Clock } from 'lucide-react-native';

export default function JobCardConsole({ themeColor = '#eab308' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="flex-1 mt-4">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-black text-white">Active Repairs</Text>
        <TouchableOpacity 
          className="bg-amber-500 px-4 py-2 rounded-xl flex-row items-center active:bg-amber-400" 
          onPress={handleAction}
        >
          <Plus size={16} color="#000" className="mr-1" />
          <Text className="text-slate-950 font-black text-xs">New Job</Text>
        </TouchableOpacity>
      </View>
      
      <View className="gap-4">
        {[1, 2].map((job) => (
          <View key={job} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm shadow-slate-900">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="font-black text-white text-base">JC-204{job}</Text>
                <Text className="text-xs text-slate-400 font-medium mt-0.5">Maruti Swift • MH12 AB 1234</Text>
              </View>
              <View className="bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg">
                <Text className="text-amber-400 font-bold text-xs">In Progress</Text>
              </View>
            </View>
            
            <View className="flex-row justify-between mb-5 bg-slate-950 p-3 rounded-xl border border-slate-800/60">
              {['Check', 'Repair', 'Wash', 'Ready'].map((step, idx) => (
                <View key={step} className="items-center">
                  <View className={`w-3 h-3 rounded-full mb-1.5 ${idx < 2 ? 'bg-amber-400' : 'bg-slate-800'}`} />
                  <Text className="text-[10px] text-slate-400 font-bold">{step}</Text>
                </View>
              ))}
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl border border-slate-800 bg-slate-950 items-center active:bg-slate-800" 
                onPress={handleAction}
              >
                <Text className="text-slate-300 font-bold text-xs">Add Parts</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl bg-amber-500 items-center active:bg-amber-400" 
                onPress={handleAction}
              >
                <Text className="text-slate-950 font-black text-xs">Update Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
