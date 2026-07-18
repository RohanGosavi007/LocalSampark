import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Leaf, Tractor, Sprout } from 'lucide-react-native';
import { RURAL_CATEGORIES, TOP_FEATURES, MANDI_RATES } from '../../src/data/rural-services';

export default function KrishiScreen() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState(RURAL_CATEGORIES[0].id);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-row items-center">
          <Leaf color="#22c55e" size={20} className="mr-2" />
          <Text className="text-white text-xl font-bold">Krishi Hub</Text>
        </View>
        <View className="w-10 h-10" />
      </View>

      <ScrollView className="flex-1" stickyHeaderIndices={[2]}>
        
        {/* Mandi Ticker Mock */}
        <View className="bg-emerald-950 py-2">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row px-4">
            {MANDI_RATES.map((m, idx) => (
              <View key={idx} className="flex-row items-center mr-6 bg-emerald-900/50 px-3 py-1 rounded-full border border-emerald-800/50">
                <Text className="text-emerald-300 font-bold mr-2 text-xs">{m.crop}</Text>
                <Text className="text-white font-bold text-xs mr-2">{m.price}</Text>
                <Text className={m.trend === 'up' ? "text-green-400 font-bold text-xs" : m.trend === 'down' ? "text-red-400 font-bold text-xs" : "text-yellow-400 font-bold text-xs"}>
                  {m.change}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Hero Section */}
        <View className="p-6 bg-slate-900 border-b border-slate-800 pb-10">
          <Text className="text-emerald-400 font-black tracking-widest uppercase text-xs mb-2 text-center">Transforming Rural India</Text>
          <Text className="text-white text-3xl font-black text-center mb-4 leading-tight">Digital Marketplace for Farmers</Text>
          <Text className="text-slate-400 text-center mb-6 text-sm">Direct Mandi rates, rent equipment, sell produce without middlemen, and access expert advice.</Text>
          
          <View className="flex-row justify-center gap-4">
            <TouchableOpacity className="bg-emerald-600 px-6 py-3 rounded-xl shadow-lg shadow-emerald-500/20">
              <Text className="text-white font-bold text-base">Join as Farmer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sticky Category Tabs */}
        <View className="bg-slate-950/90 py-3 border-b border-slate-800">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-4">
            {RURAL_CATEGORIES.map(cat => (
              <TouchableOpacity 
                key={cat.id} 
                onPress={() => setActiveCategory(cat.id)}
                className={`px-5 py-2 rounded-full mr-3 border ${activeCategory === cat.id ? 'bg-emerald-600 border-emerald-500' : 'bg-slate-900 border-slate-700'}`}
              >
                <Text className={`font-bold ${activeCategory === cat.id ? 'text-white' : 'text-slate-300'}`}>{cat.title_key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Dynamic Category Content */}
        <View className="p-4">
          {RURAL_CATEGORIES.filter(c => c.id === activeCategory).map(cat => (
            <View key={cat.id} className="mb-8">
              <Text className="text-white text-2xl font-black mb-6 flex-row items-center" style={{ color: cat.color }}>
                {cat.title_key} Services
              </Text>
              
              <View className="flex-row flex-wrap justify-between">
                {cat.features.map(feat => (
                  <TouchableOpacity 
                    key={feat.id} 
                    className="bg-slate-900 border-t-4 p-4 rounded-2xl w-[48%] mb-4 shadow-lg"
                    style={{ borderTopColor: cat.color }}
                  >
                    <View className="w-12 h-12 rounded-full items-center justify-center bg-slate-800 mb-3 border border-slate-700">
                      <Text className="text-2xl">{feat.icon}</Text>
                    </View>
                    <Text className="text-white font-bold text-sm mb-1">{feat.title_key}</Text>
                    <Text className="text-slate-400 text-xs">{feat.desc_key}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </View>
        
        {/* Priority Features Section */}
        <View className="p-4 bg-slate-900 mt-4 pb-12">
          <View className="flex-row items-center mb-6">
            <Sprout color="#22c55e" size={24} className="mr-2" />
            <Text className="text-white text-xl font-bold">Trending Features</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {TOP_FEATURES.map(feat => (
              <TouchableOpacity 
                key={feat.id} 
                className="bg-slate-800 p-4 rounded-2xl mr-4 w-48 border border-slate-700"
              >
                <Text className="text-3xl mb-3">{feat.icon}</Text>
                <Text className="text-white font-bold text-base mb-1">{feat.title_key}</Text>
                <Text className="text-slate-400 text-xs">{feat.desc_key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
      </ScrollView>
    </SafeAreaView>
  );
}
