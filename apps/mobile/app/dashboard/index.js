import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';

// Import our new native, database-connected dashboard component
import DashboardNativeTemplate from '../../src/components/DashboardNativeTemplate';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Custom Header */}
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold capitalize">Dashboard</Text>
      </View>

      {/* Render the new fully native, database-connected dashboard template */}
      <DashboardNativeTemplate />
    </SafeAreaView>
  );
}