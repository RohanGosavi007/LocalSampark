import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../src/store/cartStore';
import { ShoppingBag, Minus, Plus, Trash2, ArrowRight } from 'lucide-react-native';

export default function CartScreen() {
  const router = useRouter();
  const { items, currentShopName, updateQuantity, removeItem, getCartTotal, getItemCount } = useCartStore();

  const total = getCartTotal();
  const itemCount = getItemCount();

  if (items.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
        <ShoppingBag color="#64748b" size={64} className="mb-4" />
        <Text className="text-white text-xl font-bold mb-2">Your cart is empty</Text>
        <Text className="text-slate-400 mb-8">Add items from shops to start an order</Text>
        <TouchableOpacity 
          className="bg-blue-600 px-6 py-3 rounded-xl"
          onPress={() => router.push('/')}
        >
          <Text className="text-white font-bold text-lg">Start Shopping</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="p-4 border-b border-slate-800 bg-slate-900">
        <Text className="text-white text-2xl font-bold">Review Cart</Text>
        <Text className="text-blue-400 font-bold text-sm mt-1">From: {currentShopName}</Text>
      </View>
      
      <ScrollView className="flex-1 p-4">
        <View className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden mb-6 shadow-lg shadow-black/50">
          {items.map((item, index) => (
            <View key={item.id} className={`p-4 flex-row items-center justify-between ${index !== items.length - 1 ? 'border-b border-slate-800' : ''}`}>
              <View className="flex-1 pr-4">
                <Text className="text-white font-bold text-base mb-1">{item.name}</Text>
                <Text className="text-blue-400 font-bold">₹{item.price}</Text>
              </View>
              
              <View className="flex-row items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                <TouchableOpacity 
                  onPress={() => item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id)}
                  className="w-8 h-8 items-center justify-center bg-slate-700 rounded-lg"
                >
                  {item.quantity > 1 ? <Minus color="#fff" size={16} /> : <Trash2 color="#ef4444" size={16} />}
                </TouchableOpacity>
                <Text className="text-white font-bold mx-3 w-4 text-center">{item.quantity}</Text>
                <TouchableOpacity 
                  onPress={() => updateQuantity(item.id, item.quantity + 1)}
                  className="w-8 h-8 items-center justify-center bg-blue-600 rounded-lg"
                >
                  <Plus color="#fff" size={16} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        <View className="bg-slate-900 p-6 rounded-3xl border border-slate-800 mb-8 shadow-lg shadow-black/50">
          <Text className="text-white font-bold text-lg mb-4">Bill Details</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-400">Item Total</Text>
            <Text className="text-slate-300">₹{total}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-slate-400">Platform Fee</Text>
            <Text className="text-slate-300">₹10</Text>
          </View>
          <View className="flex-row justify-between mb-4 pb-4 border-b border-slate-800">
            <Text className="text-slate-400">Delivery Fee</Text>
            <Text className="text-emerald-400">To be calculated</Text>
          </View>
          <View className="flex-row justify-between items-center">
            <Text className="text-white font-bold text-lg">Total Amount</Text>
            <Text className="text-white font-black text-2xl">₹{total + 10}</Text>
          </View>
        </View>
      </ScrollView>

      <View className="p-4 bg-slate-900 border-t border-slate-800 pb-8">
        <TouchableOpacity 
          className="bg-blue-600 w-full py-4 rounded-2xl shadow-lg shadow-blue-500/30 flex-row justify-center items-center"
          onPress={() => router.push('/checkout')}
        >
          <Text className="text-white font-bold text-lg mr-2">Proceed to Checkout</Text>
          <ArrowRight color="#fff" size={20} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
