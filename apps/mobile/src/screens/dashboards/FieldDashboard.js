import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Briefcase, Target, Users, IndianRupee, Store, CheckCircle2, ChevronRight, FileText } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function FieldDashboard({ user }) {
  const stats = [
    { label: 'Onboarded Shops', value: '42', icon: Store, color: '#3b82f6' },
    { label: 'Active Leads', value: '14', icon: Users, color: '#8b5cf6' },
    { label: 'Pending KYC', value: '3', icon: FileText, color: '#f59e0b' },
    { label: 'Bounty Earned', value: '₹2,100', icon: IndianRupee, color: '#10b981' }
  ];

  const recentOnboards = [
    { id: 1, name: 'Laxmi Supermarket', type: 'Retail', status: 'KYC Verified' },
    { id: 2, name: 'Priya Beauty Parlour', type: 'Service', status: 'Pending Approval' },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="mb-6 mt-2">
        <View className="flex-row items-center mb-1">
          <Briefcase color="#14b8a6" size={24} className="mr-2" />
          <Text className="text-2xl font-black text-white">Field Agent CRM</Text>
        </View>
        <Text className="text-slate-400 font-semibold text-sm">Welcome back, {user?.name || 'Agent'}</Text>
      </View>

      {/* Target Progress */}
      <View className="bg-gradient-to-r from-teal-900 to-emerald-950 p-6 rounded-3xl mb-6 border border-teal-500/30 shadow-lg shadow-teal-900/50">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-teal-200/80 font-bold text-sm uppercase tracking-wider">Weekly Target</Text>
          <Target size={20} color="#5eead4" />
        </View>
        <View className="flex-row items-end mb-2">
          <Text className="text-white text-4xl font-black">12</Text>
          <Text className="text-teal-200 font-semibold text-base mb-1 ml-1">/ 15 Shops</Text>
        </View>
        <View className="h-2 bg-teal-950 rounded-full overflow-hidden">
          <View className="h-full bg-teal-400" style={{ width: '80%' }} />
        </View>
        <Text className="text-teal-400 text-xs font-semibold mt-2">Just 3 more to earn ₹500 bonus!</Text>
      </View>

      {/* Stats Grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {stats.map((s, i) => {
          const IconComponent = s.icon;
          return (
            <View key={i} className="w-[48%] bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-4">
              <View className="w-10 h-10 rounded-full items-center justify-center mb-3" style={{ backgroundColor: `${s.color}20` }}>
                <IconComponent size={20} color={s.color} />
              </View>
              <Text className="text-white text-2xl font-black mb-1">{s.value}</Text>
              <Text className="text-slate-400 text-xs font-bold">{s.label}</Text>
            </View>
          );
        })}
      </View>

      <TouchableOpacity className="bg-teal-600 p-4 rounded-xl flex-row items-center justify-center mb-6">
        <Store color="#fff" size={20} className="mr-2" />
        <Text className="text-white font-black text-base">Onboard New Shop</Text>
      </TouchableOpacity>

      {/* Recent Activity */}
      <View className="mb-6">
        <Text className="text-white font-bold text-lg mb-4">Recent Onboards</Text>
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
          {recentOnboards.map((shop, idx) => (
            <View key={shop.id} className={`p-3 flex-row items-center justify-between ${idx !== recentOnboards.length - 1 ? 'border-b border-slate-800' : ''}`}>
              <View className="flex-row items-center flex-1">
                <View className="w-10 h-10 bg-blue-500/10 rounded-full items-center justify-center mr-3">
                  <CheckCircle2 size={20} color={shop.status.includes('Verified') ? '#10b981' : '#f59e0b'} />
                </View>
                <View>
                  <Text className="text-white font-bold text-base mb-0.5">{shop.name}</Text>
                  <Text className="text-slate-400 text-xs">{shop.type} • {shop.status}</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#64748b" />
            </View>
          ))}
        </View>
      </View>
      
    </ScrollView>
  );
}
