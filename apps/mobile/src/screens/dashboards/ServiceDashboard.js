import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Wrench, Calendar, CheckCircle2, IndianRupee, Star, Clock, MapPin, ChevronRight } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ServiceDashboard({ user }) {
  const stats = [
    { label: 'Pending Jobs', value: '4', icon: Calendar, color: '#f59e0b' },
    { label: 'Completed Today', value: '3', icon: CheckCircle2, color: '#10b981' },
    { label: 'Profile Rating', value: '4.8', icon: Star, color: '#3b82f6' },
    { label: 'Total Earnings', value: '₹3,450', icon: IndianRupee, color: '#8b5cf6' }
  ];

  const pendingAppointments = [
    { id: 'JOB-902', service: 'AC Gas Refill', time: '02:00 PM', location: 'Sector 4, Flat 102' },
    { id: 'JOB-905', service: 'Washing Machine Repair', time: '04:30 PM', location: 'Sector 1, Flat 505' },
  ];

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="mb-6 mt-2 flex-row justify-between items-center">
        <View>
          <View className="flex-row items-center mb-1">
            <Wrench color="#3b82f6" size={24} className="mr-2" />
            <Text className="text-2xl font-black text-white">Service Partner</Text>
          </View>
          <Text className="text-slate-400 font-semibold text-sm">Online • Welcome, {user?.name || 'Suresh'}</Text>
        </View>
        <TouchableOpacity className="bg-blue-600/20 border border-blue-500/50 px-3 py-1.5 rounded-full flex-row items-center">
          <View className="w-2 h-2 rounded-full bg-blue-500 mr-2" />
          <Text className="text-blue-400 font-bold text-xs">ACCEPTING JOBS</Text>
        </TouchableOpacity>
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
                {s.label.includes('Rating') && <Text className="text-base text-slate-500"> /5</Text>}
              </Text>
              <Text className="text-slate-400 text-xs font-bold">{s.label}</Text>
            </View>
          );
        })}
      </View>

      {/* Next Appointment */}
      <View className="mb-6">
        <Text className="text-white font-bold text-lg mb-4">Pending Appointments</Text>
        {pendingAppointments.map((job) => (
          <View key={job.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-4 shadow-lg shadow-black/50">
            <View className="flex-row justify-between items-center mb-4">
              <View className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                <Text className="text-slate-300 font-bold text-xs">{job.id}</Text>
              </View>
              <View className="flex-row items-center">
                <Clock size={14} color="#f59e0b" className="mr-1" />
                <Text className="text-amber-400 font-bold text-sm">{job.time}</Text>
              </View>
            </View>
            
            <Text className="text-white font-black text-xl mb-3">{job.service}</Text>
            
            <View className="flex-row items-center mb-4">
              <MapPin color="#64748b" size={16} className="mr-2" />
              <Text className="text-slate-400 font-medium text-sm">{job.location}</Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity className="flex-1 bg-slate-800 py-3 rounded-xl items-center border border-slate-700">
                <Text className="text-white font-bold text-sm">Reschedule</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 bg-blue-600 py-3 rounded-xl items-center">
                <Text className="text-white font-black text-sm">Start Job</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>

      <TouchableOpacity className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex-row items-center justify-between mb-6">
        <View className="flex-row items-center">
          <View className="w-10 h-10 bg-purple-500/10 rounded-full items-center justify-center mr-3">
            <Wrench size={20} color="#a855f7" />
          </View>
          <View>
            <Text className="text-white font-bold text-base mb-0.5">Service Catalog</Text>
            <Text className="text-slate-400 text-xs">Manage prices and availability</Text>
          </View>
        </View>
        <ChevronRight size={20} color="#64748b" />
      </TouchableOpacity>
      
    </ScrollView>
  );
}
