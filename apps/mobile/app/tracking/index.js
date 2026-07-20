import React, { useState, useEffect, useContext } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AuthContext } from '../../src/context/AuthContext';
import { apiGet } from '../../src/lib/api';
import { ChevronLeft, Truck, Package, CheckCircle2, MapPin, Navigation, PhoneCall, Star } from 'lucide-react-native';

export default function TrackingScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const orderId = id || 'ORD-1234';
  const { socket, API_URL } = useContext(AuthContext);

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch initial order state from backend
    const fetchOrder = async () => {
      try {
        const data = await apiGet(`/orders/${orderId}`);
        if (data && data.success) {
          setOrder({
            id: data.order.id,
            shop_name: 'LocalSampark Shop',
            total_amount: data.order.total_amount,
            status: data.order.status.toLowerCase(),
            delivery_type: data.order.fulfillment_method?.toLowerCase() || 'delivery',
            tracking_otp: '4921',
            eta: '12 mins',
            items: [],
            driver: {
                name: 'Ramesh Kumar',
                rating: 4.8,
                vehicle: 'MH 12 AB 1234',
                image: 'https://ui-avatars.com/api/?name=Ramesh+Kumar&background=3b82f6&color=fff'
            }
          });
        }
      } catch (e) {
        console.error("Failed to fetch order", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();

    // Socket.io Realtime Subscription
    if (socket) {
      socket.emit('order:track', orderId);

      socket.on('order:status_update', (payload) => {
        if (payload.orderId === orderId) {
          setOrder(prev => {
            if(!prev) return prev;
            return { ...prev, status: payload.status.toLowerCase() };
          });
        }
      });
    }

    return () => {
      if (socket) {
        socket.off('order:status_update');
      }
    };
  }, [orderId, socket, API_URL]);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </SafeAreaView>
    );
  }

  const steps = [
    { id: 'placed', label: 'Order Placed', icon: Package },
    { id: 'packing', label: 'Packing', icon: CheckCircle2 },
    { id: 'out_for_delivery', label: 'Out for Delivery', icon: Truck },
    { id: 'delivered', label: 'Delivered', icon: MapPin }
  ];
  
  const currentStepIndex = steps.findIndex(s => s.id === order?.status);

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center p-4 border-b border-slate-800 bg-slate-900">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <Text className="text-white text-xl font-bold">Track Order</Text>
      </View>

      <ScrollView className="flex-1 p-4">
        
        {/* Header Info */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-white text-2xl font-black mb-1">#{order?.id}</Text>
            <Text className="text-slate-400 font-medium">ETA: {order?.eta}</Text>
          </View>
          <View className="bg-blue-600/20 px-4 py-2 rounded-xl border border-blue-500/30">
            <Text className="text-blue-400 font-bold">Live Tracking Active</Text>
          </View>
        </View>

        {/* Status Timeline */}
        <View className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg mb-6">
          <View className="flex-row items-center mb-6">
            <Navigation color="#3b82f6" size={20} className="mr-2" />
            <Text className="text-white font-bold text-lg">Order Status</Text>
          </View>
          
          <View className="pl-2">
            {steps.map((step, idx) => {
              const isActive = idx <= currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              const Icon = step.icon;
              
              return (
                <View key={step.id} className="flex-row items-start mb-6 last:mb-0">
                  <View className="items-center mr-4">
                    <View className={`w-8 h-8 rounded-full items-center justify-center border-2 ${isActive ? 'bg-blue-600 border-blue-500' : 'bg-slate-800 border-slate-700'}`}>
                      <Icon color={isActive ? "#fff" : "#475569"} size={16} />
                    </View>
                    {idx < steps.length - 1 && (
                      <View className={`w-0.5 h-8 mt-2 ${isActive ? 'bg-blue-600' : 'bg-slate-800'}`} />
                    )}
                  </View>
                  <View className={`flex-1 p-3 rounded-xl border ${isCurrent ? 'bg-blue-600/10 border-blue-500/50' : isActive ? 'bg-slate-800 border-slate-700' : 'bg-slate-900 border-transparent'}`}>
                    <Text className={`font-bold text-base ${isActive ? 'text-white' : 'text-slate-500'}`}>{step.label}</Text>
                    {isCurrent && <Text className="text-blue-400 text-xs font-bold mt-1">Currently in progress</Text>}
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Delivery PIN */}
        {order?.delivery_type === 'delivery' && (order?.status === 'out_for_delivery' || order?.status === 'packing') && (
          <View className="bg-amber-500 p-6 rounded-3xl shadow-lg mb-6">
            <Text className="text-amber-950 font-bold text-lg mb-1">Delivery PIN</Text>
            <Text className="text-amber-900 text-sm mb-4">Share this with the agent to receive your order.</Text>
            <View className="bg-white/30 p-4 rounded-xl items-center">
              <Text className="text-amber-950 font-black text-3xl tracking-[8px] ml-2">{order.tracking_otp}</Text>
            </View>
          </View>
        )}

        {/* Driver Details */}
        {order?.driver && order?.status === 'out_for_delivery' && (
          <View className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-lg mb-6 flex-row items-center">
            <Image source={order.driver.image } className="w-16 h-16 rounded-full mr-4 border-2 border-blue-500"  contentFit="cover" placeholder="L6PZfSi_.AyE_3t7t7R**0o#DgR4" cachePolicy="memory-disk" transition={200} />
            <View className="flex-1">
              <Text className="text-white font-bold text-lg">{order.driver.name}</Text>
              <Text className="text-slate-400 text-sm mb-1">{order.driver.vehicle}</Text>
              <View className="flex-row items-center bg-amber-500/10 px-2 py-1 rounded-lg self-start">
                <Star color="#f59e0b" size={12} fill="#f59e0b" className="mr-1" />
                <Text className="text-amber-500 font-bold text-xs">{order.driver.rating}</Text>
              </View>
            </View>
            <TouchableOpacity className="bg-blue-600/20 p-4 rounded-full border border-blue-500/30">
              <PhoneCall color="#3b82f6" size={20} />
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
