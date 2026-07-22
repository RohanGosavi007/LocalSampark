import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Users, PhoneCall, Clock, CheckCircle2 } from 'lucide-react-native';

export default function QueueReceptionDesk({ themeColor = '#0ea5e9' }) {
  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <View className="flex-1 mt-4">
      <Text className="text-lg font-black text-white mb-4">Live Reception Desk</Text>
      
      <View className="bg-slate-900 border border-slate-800 rounded-3xl p-6 items-center mb-6 shadow-lg shadow-slate-900">
        <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-2">Currently Serving</Text>
        <Text className="text-5xl font-black text-sky-400 my-2">Token #18</Text>
        <TouchableOpacity 
          className="bg-sky-500 px-8 py-3.5 rounded-xl mt-3 flex-row items-center active:opacity-80" 
          onPress={handleNext}
        >
          <PhoneCall size={18} color="#fff" className="mr-2" />
          <Text className="text-white font-black text-sm tracking-wider">CALL NEXT (19)</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">Today's Appointments</Text>
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
        {[19, 20, 21].map((token, idx) => (
          <View key={token} className={`flex-row items-center p-3 ${idx !== 2 ? 'border-b border-slate-800' : ''}`}>
            <View className="w-11 h-11 rounded-full bg-slate-800 items-center justify-center mr-3 border border-slate-700">
              <Text className="font-black text-slate-300 text-sm">#{token}</Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-white text-sm mb-0.5">Rahul Sharma</Text>
              <View className="flex-row items-center">
                <Clock size={12} color="#64748b" className="mr-1" />
                <Text className="text-slate-400 text-xs font-medium">Est. 11:30 AM</Text>
              </View>
            </View>
            <View className="bg-sky-500/10 border border-sky-500/30 px-3 py-1.5 rounded-lg">
              <Text className="text-sky-400 font-bold text-xs">Waiting</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
