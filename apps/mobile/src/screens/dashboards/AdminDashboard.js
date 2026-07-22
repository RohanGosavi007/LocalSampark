import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Shield, Bell, TrendingUp, Store, Users, AlertCircle, ShoppingCart, Bike, Home, Wallet, PartyPopper, Stethoscope, PackageOpen, Crown, Megaphone, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AdminDashboard({ user }) {
  // Mock data for Admin dashboard
  const stats = [
    { label: 'Total Revenue', value: '₹1.2L', change: '+22%', positive: true, icon: TrendingUp, color: '#10b981' },
    { label: 'Active Shops', value: '45', change: '+3 this week', positive: true, icon: Store, color: '#3b82f6' },
    { label: 'Active Agents', value: '12', change: 'All online', positive: true, icon: Users, color: '#8b5cf6' },
    { label: 'Pending Apps', value: '8', change: 'Action Needed', positive: false, icon: AlertCircle, color: '#f59e0b' },
  ];

  const quickActions = [
    { icon: Store, label: 'Shops', route: '/(tabs)/shops', color: '#3b82f6' },
    { icon: Users, label: 'Agents', route: '/(tabs)/agents', color: '#8b5cf6' },
    { icon: TrendingUp, label: 'Revenue', route: '/(tabs)/revenue', color: '#10b981' },
    { icon: Shield, label: 'Franchise', route: '/(admin)/franchises', color: '#f59e0b' },
    { icon: Wallet, label: 'Payouts', route: '/(admin)/payouts', color: '#ef4444' },
    { icon: ShoppingCart, label: 'Market', route: '/(admin)/marketplace', color: '#ec4899' },
    { icon: Bike, label: 'Delivery', route: '/(admin)/delivery', color: '#06b6d4' },
    { icon: Home, label: 'Society', route: '/(admin)/society', color: '#6366f1' },
    { icon: Wallet, label: 'Wallet', route: '/(admin)/wallet', color: '#14b8a6' },
    { icon: PartyPopper, label: 'Events', route: '/(admin)/events', color: '#f43f5e' },
    { icon: Stethoscope, label: 'Medical', route: '/(admin)/medical', color: '#0ea5e9' },
    { icon: PackageOpen, label: 'Subscrip', route: '/(admin)/subscriptions', color: '#84cc16' },
  ];

  const pendingQueue = [
    { id: 1, name: 'Sharma Electronics', type: 'Shop Registration', time: '2 hours ago' },
    { id: 2, name: 'Rahul Delivery', type: 'Agent Onboarding', time: '5 hours ago' },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="mb-6 mt-2 flex-row justify-between items-center">
        <View>
          <View className="flex-row items-center mb-1">
            <Shield color="#8b5cf6" size={24} className="mr-2" />
            <Text className="text-2xl font-black text-white">Super Admin</Text>
          </View>
          <Text className="text-slate-400 font-semibold text-sm">{user?.role?.replace('_', ' ').toUpperCase()} • {user?.name}</Text>
        </View>
        <TouchableOpacity className="relative bg-slate-900 w-12 h-12 rounded-full items-center justify-center border border-slate-800">
          <Bell size={24} color="#e2e8f0" />
          <View className="absolute top-0 right-0 bg-red-500 w-5 h-5 rounded-full items-center justify-center border-2 border-slate-950">
            <Text className="text-white text-[10px] font-black">8</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {stats.map((stat, idx) => {
          const IconComponent = stat.icon;
          return (
            <View key={idx} className="w-[48%] bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="flex-row justify-between items-start mb-3">
                <View className="w-10 h-10 rounded-full items-center justify-center" style={{ backgroundColor: `${stat.color}20` }}>
                  <IconComponent size={20} color={stat.color} />
                </View>
              </View>
              <Text className="text-white text-2xl font-black mb-1">{stat.value}</Text>
              <Text className="text-slate-400 text-xs font-bold mb-2">{stat.label}</Text>
              <Text className={`text-[10px] font-black ${stat.positive ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stat.change}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Quick Actions */}
      <View className="mb-6">
        <Text className="text-white font-bold text-lg mb-4">Control Panel</Text>
        <View className="flex-row flex-wrap justify-between">
          {quickActions.map((action, idx) => {
            const IconComponent = action.icon;
            return (
              <TouchableOpacity 
                key={idx} 
                className="w-[23%] bg-slate-900 border border-slate-800 p-3 rounded-2xl items-center mb-3"
                onPress={() => router.push(action.route)}
              >
                <View className="w-10 h-10 rounded-full items-center justify-center mb-2" style={{ backgroundColor: `${action.color}15` }}>
                  <IconComponent size={20} color={action.color} />
                </View>
                <Text className="text-slate-400 font-bold text-[10px] text-center">{action.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Pending Queue */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white font-bold text-lg">Action Required</Text>
          <TouchableOpacity>
            <Text className="text-blue-400 font-bold text-xs">View All Queue</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
          {pendingQueue.map((item, idx) => (
            <View key={item.id} className={`p-4 flex-row items-center justify-between ${idx !== pendingQueue.length - 1 ? 'border-b border-slate-800' : ''}`}>
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-amber-500/10 rounded-full items-center justify-center mr-3">
                  <AlertCircle size={20} color="#f59e0b" />
                </View>
                <View className="flex-1 mr-2">
                  <Text className="text-white font-bold text-sm mb-0.5" numberOfLines={1}>{item.name}</Text>
                  <Text className="text-slate-400 text-xs">{item.type} • {item.time}</Text>
                </View>
              </View>
              <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg">
                <Text className="text-white font-bold text-xs">Review</Text>
              </TouchableOpacity>
            </View>
          ))}
          {pendingQueue.length === 0 && (
            <View className="p-6 items-center">
              <CheckCircle2 color="#10b981" size={32} className="mb-2" />
              <Text className="text-slate-400 text-sm font-semibold">Queue is empty!</Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
