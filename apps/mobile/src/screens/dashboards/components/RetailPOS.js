import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import * as Haptics from 'expo-haptics';
import NetInfo from '@react-native-community/netinfo';
import { OfflineQueueService } from '../../../services/OfflineQueueService';
import { Camera, Search, ShoppingBag, Minus, Plus } from 'lucide-react-native';

export default function RetailPOS({ themeColor = '#10b981' }) {
  const [items, setItems] = React.useState([
    { id: 1, name: 'Aashirvaad Atta 5kg', stock: 12 },
    { id: 2, name: 'Tata Salt 1kg', stock: 45 },
    { id: 3, name: 'Amul Butter 500g', stock: 8 }
  ]);
  const [isOffline, setIsOffline] = React.useState(false);

  React.useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    return () => unsubscribe();
  }, []);

  const handleAction = async (item) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Optimistic Update
    setItems(prev => prev.map(p => 
      p.id === item.id ? { ...p, stock: Math.max(0, p.stock - 1) } : p
    ));

    // Offline Queue
    try {
      if (isOffline) {
        await OfflineQueueService.enqueue(`/api/v1/shops/inventory/decrement`, 'POST', { productId: item.id });
      }
    } catch (e) {
      console.log('Error queueing:', e);
    }
  };

  return (
    <View className="flex-1 mt-4">
      <Text className="text-lg font-black text-white mb-4">Smart POS & Inventory</Text>
      
      <TouchableOpacity className="h-24 bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl justify-center items-center mb-4 active:opacity-80">
        <Camera size={28} color="#94a3b8" className="mb-1" />
        <Text className="text-slate-400 font-bold text-xs">Tap to scan barcode</Text>
      </TouchableOpacity>
      
      <View className="flex-row gap-2 mb-6">
        <View className="flex-1 flex-row items-center bg-slate-900 border border-slate-800 px-4 py-3 rounded-xl">
          <Search size={18} color="#64748b" className="mr-2" />
          <TextInput 
            placeholder="Search products..."
            placeholderTextColor="#64748b"
            className="flex-1 text-white font-medium text-sm"
          />
        </View>
        <TouchableOpacity className="bg-emerald-600 px-5 justify-center rounded-xl items-center">
          <Text className="text-white font-black text-xs">Search</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">Quick Add Items</Text>
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
        {items.map((item, idx) => (
          <View key={item.id} className={`flex-row justify-between items-center p-3 ${idx !== items.length - 1 ? 'border-b border-slate-800' : ''}`}>
            <View className="flex-1 mr-2">
              <Text className="text-white font-bold text-sm mb-0.5">{item.name}</Text>
              <Text className="text-slate-400 text-xs font-medium">Stock: <Text className="text-emerald-400 font-bold">{item.stock}</Text> units left</Text>
            </View>
            <TouchableOpacity 
              className="bg-emerald-500/10 border border-emerald-500/30 px-3 py-2 rounded-lg flex-row items-center active:bg-emerald-500/20"
              onPress={() => handleAction(item)}
            >
              <Minus size={14} color="#10b981" className="mr-1" />
              <Text className="text-emerald-400 font-black text-xs">SELL</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
}
