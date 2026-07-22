import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Switch, Alert } from 'react-native';
import { Megaphone, Calendar, Tag, Zap } from 'lucide-react-native';

export default function CampaignBuilder({ shopId }) {
  const [title, setTitle] = useState('');
  const [discountValue, setDiscountValue] = useState('');
  const [isFlashSale, setIsFlashSale] = useState(false);

  const handleCreate = () => {
    Alert.alert('Campaign Created 🎉', `"${title}" has been scheduled successfully!`);
    setTitle('');
    setDiscountValue('');
    setIsFlashSale(false);
  };

  return (
    <View className="bg-slate-900 border border-slate-800 rounded-3xl p-5 my-3 shadow-lg shadow-slate-900">
      <View className="flex-row items-center mb-4">
        <View className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 justify-center items-center mr-3">
          <Megaphone size={20} color="#3b82f6" />
        </View>
        <Text className="text-lg font-black text-white">Create Campaign</Text>
      </View>

      <Text className="text-slate-400 font-bold text-xs mb-1">Campaign Title</Text>
      <TextInput
        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-sm mb-4"
        placeholder="e.g. Weekend Flash Sale"
        placeholderTextColor="#64748b"
        value={title}
        onChangeText={setTitle}
      />

      <Text className="text-slate-400 font-bold text-xs mb-1">Discount Value (₹ or %)</Text>
      <TextInput
        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-sm mb-4"
        placeholder="20"
        placeholderTextColor="#64748b"
        keyboardType="numeric"
        value={discountValue}
        onChangeText={setDiscountValue}
      />

      <View className="flex-row justify-between items-center bg-slate-950 p-3.5 rounded-xl border border-slate-800 mb-5">
        <View className="flex-row items-center">
          <Zap size={16} color="#eab308" />
          <Text className="text-slate-300 font-bold text-xs ml-2">Flash Sale (FOMO Timer)?</Text>
        </View>
        <Switch
          value={isFlashSale}
          onValueChange={setIsFlashSale}
          trackColor={{ false: '#334155', true: '#3b82f6' }}
          thumbColor={isFlashSale ? '#ffffff' : '#94a3b8'}
        />
      </View>

      <TouchableOpacity 
        className="bg-blue-600 py-3.5 rounded-xl items-center flex-row justify-center active:bg-blue-500" 
        onPress={handleCreate}
      >
        <Calendar size={18} color="#fff" />
        <Text className="text-white font-black text-sm ml-2">Schedule Campaign</Text>
      </TouchableOpacity>
    </View>
  );
}
