import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { ShieldCheck, AlertTriangle, ShieldAlert, Scan, QrCode, LogIn, ChevronRight, CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

export default function SecurityDashboard({ user }) {
  const [sosAlerts, setSosAlerts] = useState([
    { id: 'SOS-01', type: 'Medical', location: 'A-Wing, Flat 301', time: '2 mins ago', status: 'ACTIVE' },
  ]);

  const [expectedVisitors, setExpectedVisitors] = useState([
    { id: 1, name: 'Amazon Delivery', host: 'Rahul, Flat 402', eta: '10:30 AM' },
    { id: 2, name: 'Suresh (Plumber)', host: 'Anita, Flat 101', eta: '11:00 AM' }
  ]);

  const handleResolveSOS = (id) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSosAlerts(sosAlerts.filter(s => s.id !== id));
  };

  return (
    <ScrollView className="flex-1 bg-slate-950" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      {/* Header */}
      <View className="mb-6 mt-2 flex-row justify-between items-center">
        <View>
          <View className="flex-row items-center mb-1">
            <ShieldCheck color="#10b981" size={24} className="mr-2" />
            <Text className="text-2xl font-black text-white">Gate Security</Text>
          </View>
          <Text className="text-slate-400 font-semibold text-sm">On Duty: {user?.name || 'Guard'}</Text>
        </View>
      </View>

      {/* SOS ALERTS MODULE (CRITICAL) */}
      <View className="mb-8">
        <Text className="text-white font-bold text-lg mb-4 flex-row items-center">
          <AlertTriangle color="#ef4444" size={18} className="mr-2" /> Active SOS Alerts
        </Text>
        {sosAlerts.length > 0 ? (
          sosAlerts.map(alert => (
            <View key={alert.id} className="bg-red-950/40 border border-red-500/50 p-5 rounded-3xl mb-4 shadow-lg shadow-red-900/30">
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <View className="w-10 h-10 bg-red-500/20 rounded-full items-center justify-center mr-3">
                    <ShieldAlert size={20} color="#ef4444" />
                  </View>
                  <Text className="text-red-400 font-black text-lg">{alert.type} Emergency</Text>
                </View>
                <View className="bg-red-500 px-3 py-1 rounded-full animate-pulse">
                  <Text className="text-white font-bold text-xs tracking-wider">LIVE</Text>
                </View>
              </View>
              
              <View className="bg-red-950/60 p-4 rounded-xl border border-red-900/50 mb-4">
                <Text className="text-white font-bold text-lg mb-1">{alert.location}</Text>
                <Text className="text-red-300 text-xs">Triggered: {alert.time}</Text>
              </View>

              <TouchableOpacity 
                className="bg-red-600 p-4 rounded-xl items-center flex-row justify-center"
                onPress={() => handleResolveSOS(alert.id)}
              >
                <CheckCircle2 color="#fff" size={20} className="mr-2" />
                <Text className="text-white font-black text-sm">Mark as Resolved</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View className="bg-emerald-950/30 border border-emerald-900/50 p-5 rounded-2xl flex-row items-center">
            <View className="w-12 h-12 bg-emerald-500/10 rounded-full items-center justify-center mr-4 border border-emerald-500/20">
              <ShieldCheck color="#10b981" size={24} />
            </View>
            <View className="flex-1">
              <Text className="text-emerald-400 font-bold text-base mb-0.5">Society is Secure</Text>
              <Text className="text-emerald-200/50 text-xs">No active emergencies detected.</Text>
            </View>
          </View>
        )}
      </View>

      {/* QUICK ACTIONS */}
      <View className="flex-row gap-4 mb-8">
        <TouchableOpacity className="flex-1 bg-blue-600 p-4 rounded-2xl items-center justify-center border border-blue-500 shadow-lg shadow-blue-900/50">
          <QrCode color="#fff" size={28} className="mb-2" />
          <Text className="text-white font-black text-sm text-center">Scan QR</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-1 bg-slate-900 p-4 rounded-2xl items-center justify-center border border-slate-800">
          <LogIn color="#3b82f6" size={28} className="mb-2" />
          <Text className="text-white font-black text-sm text-center">Manual Entry</Text>
        </TouchableOpacity>
      </View>

      {/* GATE MANAGEMENT */}
      <View className="mb-6">
        <Text className="text-white font-bold text-lg mb-4">Pre-Approved Visitors</Text>
        {expectedVisitors.map(v => (
          <View key={v.id} className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <View className="w-12 h-12 bg-blue-500/10 rounded-full items-center justify-center mr-3 border border-blue-500/20">
                <Text className="text-blue-400 font-black text-lg">{v.name.charAt(0)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-bold text-base mb-0.5" numberOfLines={1}>{v.name}</Text>
                <Text className="text-slate-400 text-xs">Visiting: {v.host}</Text>
              </View>
            </View>
            <View className="items-end ml-2">
              <Text className="text-blue-400 font-bold text-xs mb-2">ETA: {v.eta}</Text>
              <TouchableOpacity className="bg-emerald-600/20 border border-emerald-500/50 px-4 py-1.5 rounded-lg">
                <Text className="text-emerald-400 font-bold text-xs">Allow In</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
      
    </ScrollView>
  );
}
