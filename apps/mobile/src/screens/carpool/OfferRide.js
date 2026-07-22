import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { MapPin, Navigation, Calendar, Clock, Users, IndianRupee, Car, ShieldCheck, Leaf } from 'lucide-react-native';
import { apiPost } from '../../lib/api';

export default function OfferRide() {
  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    departureTime: '',
    totalSeats: '3',
    pricePerSeat: '50',
    vehicleType: 'Car',
    vehicleNumber: '',
    isWomenOnly: false,
    isEV: false
  });

  const handleSubmit = async () => {
    if (!formData.fromLocation || !formData.toLocation || !formData.departureDate || !formData.departureTime) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }

    try {
      await apiPost('/carpool/rides', {
        origin: formData.fromLocation,
        destination: formData.toLocation,
        departure_time: `${formData.departureDate} ${formData.departureTime}`,
        seats_available: parseInt(formData.totalSeats, 10) || 1,
        price_per_seat: parseFloat(formData.pricePerSeat) || 0
      });
      Alert.alert('Success 🎉', 'Your ride has been successfully listed! Fellow residents will be notified.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Could not post ride. Try again.');
    }
  };

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      
      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <Text className="text-white font-bold text-lg mb-4">Route Details</Text>
        
        <View className="mb-4">
          <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Leaving from *</Text>
          <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-4 h-12">
            <MapPin size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-white text-base"
              placeholder="E.g., Hinjewadi Phase 1"
              placeholderTextColor="#475569"
              value={formData.fromLocation}
              onChangeText={t => setFormData({ ...formData, fromLocation: t })}
            />
          </View>
        </View>

        <View className="mb-2">
          <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Going to *</Text>
          <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-4 h-12">
            <Navigation size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-white text-base"
              placeholder="E.g., Pune Station"
              placeholderTextColor="#475569"
              value={formData.toLocation}
              onChangeText={t => setFormData({ ...formData, toLocation: t })}
            />
          </View>
        </View>
      </View>

      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <Text className="text-white font-bold text-lg mb-4">Schedule & Capacity</Text>
        
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Date *</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-12">
              <Calendar size={18} color="#64748b" />
              <TextInput
                className="flex-1 ml-2 text-white text-base"
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#475569"
                value={formData.departureDate}
                onChangeText={t => setFormData({ ...formData, departureDate: t })}
              />
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Time *</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-12">
              <Clock size={18} color="#64748b" />
              <TextInput
                className="flex-1 ml-2 text-white text-base"
                placeholder="HH:MM AM"
                placeholderTextColor="#475569"
                value={formData.departureTime}
                onChangeText={t => setFormData({ ...formData, departureTime: t })}
              />
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 mb-2">
          <View className="flex-1">
            <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Seats *</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-12">
              <Users size={18} color="#64748b" />
              <TextInput
                className="flex-1 ml-2 text-white text-base"
                keyboardType="numeric"
                value={formData.totalSeats}
                onChangeText={t => setFormData({ ...formData, totalSeats: t })}
              />
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Price / Seat *</Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-12">
              <IndianRupee size={18} color="#64748b" />
              <TextInput
                className="flex-1 ml-2 text-white text-base"
                keyboardType="numeric"
                value={formData.pricePerSeat}
                onChangeText={t => setFormData({ ...formData, pricePerSeat: t })}
              />
            </View>
          </View>
        </View>
      </View>

      <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
        <Text className="text-white font-bold text-lg mb-4">Vehicle Details</Text>
        
        <View className="mb-4">
          <Text className="text-slate-400 font-semibold mb-2 ml-1 text-sm">Vehicle Number</Text>
          <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-4 h-12">
            <Car size={20} color="#64748b" />
            <TextInput
              className="flex-1 ml-3 text-white text-base"
              placeholder="E.g. MH 12 AB 1234"
              placeholderTextColor="#475569"
              value={formData.vehicleNumber}
              onChangeText={t => setFormData({ ...formData, vehicleNumber: t })}
            />
          </View>
        </View>

        <View className="flex-row items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800 mb-3">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-pink-500/10 items-center justify-center">
              <ShieldCheck size={20} color="#ec4899" />
            </View>
            <View>
              <Text className="text-white font-bold">Women Only Ride</Text>
              <Text className="text-slate-400 text-xs">Visible only to female users</Text>
            </View>
          </View>
          <Switch 
            value={formData.isWomenOnly} 
            onValueChange={v => setFormData({...formData, isWomenOnly: v})}
            trackColor={{ false: '#334155', true: '#ec4899' }}
            thumbColor={formData.isWomenOnly ? '#fbcfe8' : '#94a3b8'}
          />
        </View>

        <View className="flex-row items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-emerald-500/10 items-center justify-center">
              <Leaf size={20} color="#10b981" />
            </View>
            <View>
              <Text className="text-white font-bold">Green Ride (EV)</Text>
              <Text className="text-slate-400 text-xs">I am driving an Electric Vehicle</Text>
            </View>
          </View>
          <Switch 
            value={formData.isEV} 
            onValueChange={v => setFormData({...formData, isEV: v})}
            trackColor={{ false: '#334155', true: '#10b981' }}
            thumbColor={formData.isEV ? '#a7f3d0' : '#94a3b8'}
          />
        </View>
      </View>

      <TouchableOpacity 
        className="bg-indigo-600 py-4 rounded-xl items-center flex-row justify-center gap-2 mb-8"
        onPress={handleSubmit}
      >
        <Car size={20} color="#fff" />
        <Text className="text-white font-black text-lg">Publish Ride</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}
