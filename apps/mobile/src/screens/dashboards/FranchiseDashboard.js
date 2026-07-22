import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Map, Users, Store, TrendingUp, IndianRupee, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function FranchiseDashboard({ user }) {
  const stats = [
    { label: 'Territory Revenue', value: '₹1.4L', icon: TrendingUp, color: '#10b981' },
    { label: 'Managed Shops', value: '156', icon: Store, color: '#3b82f6' },
    { label: 'Active Agents', value: '12', icon: Users, color: '#8b5cf6' },
    { label: 'Your Commission', value: '₹14,500', icon: IndianRupee, color: '#f59e0b' }
  ];

  const pendingApprovals = [
    { id: 1, name: 'Sanjay Provision Store', type: 'Retail', location: 'Sector 4' },
    { id: 2, name: 'Dr. Mehta Clinic', type: 'Medical', location: 'Sector 1' },
  ];

  const recentPayouts = [
    { id: 1, date: '15 Jul', amount: '₹4,500', status: 'Credited' },
    { id: 2, date: '01 Jul', amount: '₹10,000', status: 'Credited' },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="mb-6 mt-2">
        <View className="flex-row items-center mb-1">
          <Map color="#f59e0b" size={24} className="mr-2" />
          <Text className="text-2xl font-black text-white">Territory Franchise</Text>
        </View>
        <Text className="text-slate-400 font-semibold text-sm">Welcome Partner, {user?.name || 'Rahul'}</Text>
      </View>

      {/* Primary KPI */}
      <View className="bg-gradient-to-r from-amber-900 to-orange-950 p-6 rounded-3xl mb-6 border border-amber-500/30 shadow-lg shadow-amber-900/50">
        <Text className="text-amber-200/80 font-bold text-sm uppercase tracking-wider mb-2">This Month's Earnings</Text>
        <Text className="text-white text-4xl font-black mb-1">₹14,500</Text>
        <Text className="text-amber-400 text-xs font-semibold">+12% from last month</Text>
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

      {/* Pending Approvals */}
      <View className="mb-6">
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white font-bold text-lg">Pending Approvals</Text>
          <TouchableOpacity>
            <Text className="text-blue-400 font-bold text-xs">View All</Text>
          </TouchableOpacity>
        </View>
        {pendingApprovals.map(approval => (
          <View key={approval.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-10 h-10 bg-amber-500/10 rounded-full items-center justify-center mr-3">
                <AlertCircle size={20} color="#f59e0b" />
              </View>
              <View>
                <Text className="text-white font-bold text-base mb-0.5">{approval.name}</Text>
                <Text className="text-slate-400 text-xs">{approval.type} • {approval.location}</Text>
              </View>
            </View>
            <TouchableOpacity className="bg-blue-600 px-4 py-2 rounded-lg">
              <Text className="text-white font-bold text-xs">Review</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Recent Payouts */}
      <View className="mb-6">
        <Text className="text-white font-bold text-lg mb-4">Recent Payouts</Text>
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-2">
          {recentPayouts.map((payout, idx) => (
            <View key={payout.id} className={`p-3 flex-row items-center justify-between ${idx !== recentPayouts.length - 1 ? 'border-b border-slate-800' : ''}`}>
              <View className="flex-row items-center">
                <View className="w-10 h-10 bg-emerald-500/10 rounded-full items-center justify-center mr-3">
                  <CheckCircle2 size={20} color="#10b981" />
                </View>
                <View>
                  <Text className="text-white font-bold text-base mb-0.5">{payout.amount}</Text>
                  <Text className="text-slate-400 text-xs">{payout.date}</Text>
                </View>
              </View>
              <View className="flex-row items-center">
                <Text className="text-emerald-400 font-bold text-xs mr-2">{payout.status}</Text>
                <ChevronRight size={16} color="#64748b" />
              </View>
            </View>
          ))}
        </View>
      </View>
      
    </ScrollView>
  );
}
