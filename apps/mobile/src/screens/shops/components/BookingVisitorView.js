import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Calendar, Clock, Plus } from 'lucide-react-native';

export default function BookingVisitorView({ shop }) {
  const handleBook = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-5 bg-slate-900 border-b border-slate-800">
        <Text className="text-2xl font-black text-white">{shop?.name || 'City Clinic'}</Text>
        <Text className="text-slate-400 font-semibold text-xs mt-1">Healthcare & Appointments</Text>
      </View>
      
      <View className="m-4 bg-sky-500/10 border border-sky-500/30 rounded-3xl p-5 items-center">
        <Text className="text-xs font-black text-sky-400 mb-3 tracking-widest uppercase">LIVE TOKEN TRACKER</Text>
        <View className="flex-row w-full justify-around items-center">
          <View className="items-center">
            <Text className="text-4xl font-black text-sky-400">#18</Text>
            <Text className="text-xs text-slate-400 font-medium mt-1">Currently Serving</Text>
          </View>
          <View className="w-px h-10 bg-sky-500/30" />
          <View className="items-center">
            <Text className="text-4xl font-black text-sky-400">12m</Text>
            <Text className="text-xs text-slate-400 font-medium mt-1">Est. Wait Time</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-white font-bold text-lg mb-4">Book Appointment</Text>
        {['General Checkup', 'Dental Cleaning', 'Consultation'].map((service, idx) => (
          <View key={idx} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
            <View>
              <Text className="font-bold text-white text-base">{service}</Text>
              <Text className="text-sky-400 font-bold text-xs mt-0.5">₹500</Text>
            </View>
            <TouchableOpacity className="bg-sky-500 px-5 py-2.5 rounded-xl items-center active:bg-sky-400" onPress={handleBook}>
              <Text className="text-slate-950 font-black text-xs">BOOK</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
