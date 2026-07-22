import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Package, MapPin, IndianRupee, Clock, Star, Navigation, Zap, CalendarDays } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function DeliveryDashboard({ user }) {
  const stats = [
    { label: 'Today Earnings', value: '₹1,240', icon: IndianRupee, color: '#10b981' },
    { label: 'Deliveries', value: '28', icon: Package, color: '#3b82f6' },
    { label: 'Active Run', value: '1', icon: Zap, color: '#f59e0b' },
    { label: 'Rating', value: '4.9', icon: Star, color: '#8b5cf6' }
  ];

  const activeTask = {
    id: '#DEL-8831',
    restaurant: 'Sampark Supermarket',
    dropoff: 'Silver Oaks Society, Flat 402',
    eta: '12 Mins',
    earnings: '₹45'
  };

  const history = [
    { id: 1, time: '2:30 PM', location: 'Viman Nagar', amount: '₹60' },
    { id: 2, time: '1:15 PM', location: 'Kalyani Nagar', amount: '₹40' },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="mb-6 mt-2 flex-row justify-between items-center">
        <View>
          <View className="flex-row items-center mb-1">
            <Package color="#3b82f6" size={24} className="mr-2" />
            <Text className="text-2xl font-black text-white">Delivery Agent</Text>
          </View>
          <Text className="text-slate-400 font-semibold text-sm">Online • Welcome, {user?.name || 'Ramesh'}</Text>
        </View>
        <TouchableOpacity className="bg-emerald-500/20 border border-emerald-500/50 px-3 py-1.5 rounded-full flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          <Text className="text-emerald-400 font-bold text-xs">GO OFFLINE</Text>
        </TouchableOpacity>
      </View>

      {/* Active Run Card */}
      <View className="bg-blue-600 rounded-3xl p-5 mb-6 border border-blue-500 shadow-lg shadow-blue-900/50">
        <View className="flex-row justify-between items-center mb-4">
          <View className="bg-blue-500/50 px-3 py-1 rounded-full">
            <Text className="text-white font-bold text-xs">CURRENT TASK</Text>
          </View>
          <Text className="text-blue-200 font-bold text-sm">{activeTask.id}</Text>
        </View>
        
        <View className="mb-4">
          <View className="flex-row items-center mb-2">
            <Store color="#fff" size={16} className="mr-2 opacity-80" />
            <Text className="text-white font-bold text-lg">{activeTask.restaurant}</Text>
          </View>
          <View className="flex-row items-center">
            <MapPin color="#fff" size={16} className="mr-2 opacity-80" />
            <Text className="text-blue-100 font-medium text-sm">{activeTask.dropoff}</Text>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-2 border-t border-blue-500/50 pt-4">
          <View>
            <Text className="text-blue-200 text-xs font-semibold mb-0.5">ETA</Text>
            <Text className="text-white font-black text-xl">{activeTask.eta}</Text>
          </View>
          <View>
            <Text className="text-blue-200 text-xs font-semibold mb-0.5">EST. EARNINGS</Text>
            <Text className="text-white font-black text-xl">{activeTask.earnings}</Text>
          </View>
          <TouchableOpacity className="bg-white px-4 py-2 rounded-xl flex-row items-center">
            <Navigation size={16} color="#2563eb" className="mr-1.5" />
            <Text className="text-blue-600 font-black text-sm">Navigate</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {stats.map((s, i) => {
          const IconComponent = s.icon;
          return (
            <View key={i} className="w-[48%] bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row justify-between items-start mb-2">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${s.color}20` }}>
                  <IconComponent size={20} color={s.color} />
                </View>
              </View>
              <Text className="text-white text-2xl font-black mb-1">
                {s.value}
                {s.label === 'Rating' && <Text className="text-base text-slate-500"> /5</Text>}
              </Text>
              <Text className="text-slate-400 text-xs font-bold">{s.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Recent History */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white font-bold text-lg">Today's Runs</Text>
          <TouchableOpacity className="flex-row items-center">
            <CalendarDays size={14} color="#60a5fa" className="mr-1" />
            <Text className="text-blue-400 font-bold text-xs">History</Text>
          </TouchableOpacity>
        </View>
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
          {history.map((h, idx) => (
            <View key={h.id} className={`p-3 flex-row items-center justify-between ${idx !== history.length - 1 ? 'border-b border-slate-800' : ''}`}>
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-slate-800 rounded-full items-center justify-center mr-3 border border-slate-700">
                  <Package size={16} color="#94a3b8" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base mb-0.5">{h.location}</Text>
                  <Text className="text-slate-400 text-xs">{h.time}</Text>
                </View>
              </View>
              <Text className="text-emerald-400 font-black text-base">{h.amount}</Text>
            </View>
          ))}
        </View>
      </View>
      
    </ScrollView>
  );
}

// Dummy Store icon since it was used but not imported
const Store = ({ color, size, className, style }) => (
  <View style={style} className={className}>
    <Package color={color} size={size} />
  </View>
);
