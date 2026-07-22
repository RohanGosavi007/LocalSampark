import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Phone, MessageSquare, MapPin } from 'lucide-react-native';

export default function DirectoryVisitorView({ shop }) {
  const handleContact = (type) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-5 bg-slate-900 border-b border-slate-800">
        <Text className="text-2xl font-black text-white">{shop?.name || 'Local Real Estate'}</Text>
        <Text className="text-slate-400 font-semibold text-xs mt-1">Directory Listing</Text>
      </View>
      
      <View className="flex-row p-4 gap-3">
        <TouchableOpacity className="flex-1 bg-indigo-500/10 border border-indigo-500/30 py-3 rounded-2xl items-center flex-row justify-center active:bg-indigo-500/20" onPress={() => handleContact('call')}>
          <Phone size={16} color="#6366f1" className="mr-1.5" />
          <Text className="text-indigo-400 font-bold text-xs">Call</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-emerald-500/10 border border-emerald-500/30 py-3 rounded-2xl items-center flex-row justify-center active:bg-emerald-500/20" onPress={() => handleContact('whatsapp')}>
          <MessageSquare size={16} color="#10b981" className="mr-1.5" />
          <Text className="text-emerald-400 font-bold text-xs">WhatsApp</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-sky-500/10 border border-sky-500/30 py-3 rounded-2xl items-center flex-row justify-center active:bg-sky-500/20" onPress={() => handleContact('map')}>
          <MapPin size={16} color="#0ea5e9" className="mr-1.5" />
          <Text className="text-sky-400 font-bold text-xs">Map</Text>
        </TouchableOpacity>
      </View>

      <View className="p-4">
        <Text className="text-white font-bold text-lg mb-4">Featured Listings</Text>
        {['2 BHK Apartment in City Center', 'Office Space - 1200 sqft', 'Plot for Sale'].map((item, idx) => (
          <View key={idx} className="bg-slate-900 border border-slate-800 rounded-2xl mb-4 overflow-hidden shadow-sm shadow-slate-950">
            <View className="w-full h-36 bg-slate-950 border-b border-slate-800" />
            <View className="p-4">
              <Text className="font-bold text-base text-white mb-2" numberOfLines={2}>{item}</Text>
              <Text className="text-indigo-400 font-black text-base mb-1">₹45,00,000</Text>
              <Text className="text-slate-400 text-xs font-semibold mb-4">Sector 15, Near Mall</Text>
              <TouchableOpacity className="bg-indigo-600 py-3 rounded-xl items-center active:bg-indigo-500" onPress={() => handleContact('inquire')}>
                <Text className="text-white font-black text-xs">Inquire Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
