import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { WebView } from 'react-native-webview';

export default function healthcampsWebViewScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold capitalize">health camps</Text>
      </View>

      <WebView 
        source={{ uri: 'https://localsampark.in/health-camps' }}
        style={{ flex: 1, backgroundColor: '#020617' }}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617', position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        )}
      />
    </SafeAreaView>
  );
}