import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Phone, MessageSquare, ArrowRight, UserCheck } from 'lucide-react-native';

export default function LeadCRMCenter({ themeColor = '#6366f1' }) {
  const handleAction = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <View className="flex-1 mt-4">
      <Text className="text-lg font-black text-white mb-4">Lead Pipeline</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="pb-4">
        {['New Leads', 'Contacted', 'Site Visit', 'Closed'].map((stage, i) => (
          <View key={stage} className="w-64 mr-4 border border-slate-800 rounded-2xl p-2 bg-slate-900">
            <View className="flex-row justify-between items-center p-3 rounded-xl mb-3 bg-indigo-500/10 border border-indigo-500/20">
              <Text className="font-bold text-sm text-indigo-400">{stage}</Text>
              <View className="w-6 h-6 rounded-full bg-slate-800 items-center justify-center border border-slate-700">
                <Text className="text-slate-300 font-bold text-xs">{3 - i}</Text>
              </View>
            </View>
            
            {[1, 2].map((lead) => (
              <View key={lead} className="border border-slate-800 rounded-xl p-3 mb-2 bg-slate-950">
                <Text className="font-bold text-sm text-white mb-1">Amit Patel</Text>
                <Text className="text-xs text-slate-400 mb-1">Looking for: 2 BHK Flat</Text>
                <Text className="text-xs text-emerald-400 font-bold mb-3">Budget: ₹45L - ₹55L</Text>
                
                <View className="flex-row gap-2">
                  <TouchableOpacity 
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 justify-center items-center active:bg-slate-800" 
                    onPress={handleAction}
                  >
                    <Phone size={16} color="#3b82f6" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="w-9 h-9 rounded-full bg-slate-900 border border-slate-800 justify-center items-center active:bg-slate-800" 
                    onPress={handleAction}
                  >
                    <MessageSquare size={16} color="#10b981" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    className="flex-1 bg-indigo-600 rounded-lg justify-center items-center flex-row active:bg-indigo-500" 
                    onPress={handleAction}
                  >
                    <Text className="text-white font-bold text-xs mr-1">Move</Text>
                    <ArrowRight size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
