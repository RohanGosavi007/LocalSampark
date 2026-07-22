import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShoppingBag, MapPin, Wallet, ShieldCheck } from 'lucide-react-native';

export default function NativeCheckoutScreen() {
  const router = useRouter();
  const [items, setItems] = useState([
    { id: 'prod_1', name: 'Organic Fresh Whole Milk (1L)', price: 68, quantity: 2 },
    { id: 'prod_2', name: 'Fresh Aashirvaad Atta (5kg)', price: 245, quantity: 1 }
  ]);

  const subtotal = items.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);
  const deliveryFee = 25;
  const totalAmount = subtotal + deliveryFee;

  const handlePlaceOrder = () => {
    Alert.alert(
      'Confirm Order',
      `Pay ₹${totalAmount} via LocalWallet for Instant Delivery?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Pay & Place Order', 
          onPress: () => {
            Alert.alert('Order Confirmed!', `Order Ref: ORD-${Math.random().toString(36).substring(2, 8).toUpperCase()}`);
            router.back();
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-800">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-900 rounded-full items-center justify-center">
          <ChevronLeft color="#f8fafc" size={20} />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Checkout Cart</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 p-4 gap-4">
        {/* Address */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <View className="flex-row items-center gap-2 mb-1">
            <MapPin color="#6366f1" size={16} />
            <Text className="text-indigo-400 font-bold text-xs">Delivery Address</Text>
          </View>
          <Text className="text-white font-bold text-sm">Flat 402, Dhanori Greens</Text>
          <Text className="text-slate-400 text-xs">Porwal Road, Dhanori, Pune - 411015</Text>
        </View>

        {/* Cart Items */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <Text className="text-slate-400 font-bold text-xs uppercase mb-3">Order Items</Text>
          {items.map(i => (
            <View key={i.id} className="flex-row justify-between items-center border-b border-slate-800/60 py-2">
              <View>
                <Text className="text-white font-bold text-sm">{i.name}</Text>
                <Text className="text-slate-400 text-xs">Qty: {i.quantity} × ₹{i.price}</Text>
              </View>
              <Text className="text-white font-extrabold text-sm">₹{i.price * i.quantity}</Text>
            </View>
          ))}
        </View>

        {/* Bill Summary */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 gap-2">
          <Text className="text-slate-400 font-bold text-xs uppercase mb-1">Bill Summary</Text>
          <View className="flex-row justify-between">
            <Text className="text-slate-400 text-xs">Subtotal</Text>
            <Text className="text-slate-200 text-xs font-bold">₹{subtotal}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-slate-400 text-xs">Hyperlocal Delivery Fee</Text>
            <Text className="text-slate-200 text-xs font-bold">₹{deliveryFee}</Text>
          </View>
          <View className="flex-row justify-between border-t border-slate-800 pt-2 mt-1">
            <Text className="text-white font-extrabold text-sm">To Pay</Text>
            <Text className="text-emerald-400 font-extrabold text-base">₹{totalAmount}</Text>
          </View>
        </View>

        {/* Pay Button */}
        <TouchableOpacity onPress={handlePlaceOrder} className="bg-indigo-600 p-4 rounded-2xl flex-row items-center justify-center gap-2 mt-2">
          <Wallet color="#ffffff" size={18} />
          <Text className="text-white font-bold text-base">Pay ₹{totalAmount} via LocalWallet</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
