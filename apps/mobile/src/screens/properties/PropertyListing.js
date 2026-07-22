import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Camera, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function PropertyListingScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    title: '',
    location: '',
    type: 'Rent',
    price: '',
    deposit: '',
    beds: '1',
    baths: '1',
    sqft: '',
    description: ''
  });

  const handleSubmit = () => {
    if (!form.title || !form.location || !form.price) {
      Alert.alert('Missing Fields', 'Please fill in Title, Location, and Price.');
      return;
    }
    
    // Stub for backend integration
    Alert.alert('Success 🎉', 'Property listed successfully!');
    navigation.goBack();
  };

  const updateForm = (key, value) => setForm({ ...form, [key]: value });

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-row items-center justify-between p-4 border-b border-slate-900">
        <TouchableOpacity onPress={() => navigation.goBack()} className="p-2 bg-slate-900 rounded-full border border-slate-800">
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white font-black text-lg">List Property</Text>
        <View className="w-10" />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        
        {/* Type Toggle */}
        <View className="flex-row bg-slate-900 p-1.5 rounded-2xl border border-slate-800 mb-6">
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-xl ${form.type === 'Rent' ? 'bg-blue-600' : ''}`}
            onPress={() => updateForm('type', 'Rent')}
          >
            <Text className={`font-black text-sm ${form.type === 'Rent' ? 'text-white' : 'text-slate-400'}`}>For Rent</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-3 items-center rounded-xl ${form.type === 'Buy' ? 'bg-blue-600' : ''}`}
            onPress={() => updateForm('type', 'Buy')}
          >
            <Text className={`font-black text-sm ${form.type === 'Buy' ? 'text-white' : 'text-slate-400'}`}>For Sale</Text>
          </TouchableOpacity>
        </View>

        {/* Basic Details */}
        <View className="mb-4">
          <Text className="text-slate-400 font-bold text-xs mb-1.5">Title *</Text>
          <TextInput 
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-medium text-sm" 
            placeholder="e.g. 2 BHK in Ganga Aria" 
            placeholderTextColor="#64748b"
            value={form.title}
            onChangeText={(t) => updateForm('title', t)}
          />
        </View>

        <View className="mb-4">
          <Text className="text-slate-400 font-bold text-xs mb-1.5">Society / Location *</Text>
          <TextInput 
            className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-medium text-sm" 
            placeholder="e.g. Dhanori, Pune" 
            placeholderTextColor="#64748b"
            value={form.location}
            onChangeText={(t) => updateForm('location', t)}
          />
        </View>

        <View className="flex-row gap-3 mb-4">
          <View className="flex-1">
            <Text className="text-slate-400 font-bold text-xs mb-1.5">{form.type === 'Rent' ? 'Monthly Rent *' : 'Asking Price *'}</Text>
            <TextInput 
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-medium text-sm" 
              keyboardType="numeric" 
              placeholder="₹"
              placeholderTextColor="#64748b"
              value={form.price}
              onChangeText={(t) => updateForm('price', t)}
            />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 font-bold text-xs mb-1.5">{form.type === 'Rent' ? 'Deposit' : 'Token Amount'}</Text>
            <TextInput 
              className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-medium text-sm" 
              keyboardType="numeric" 
              placeholder="₹"
              placeholderTextColor="#64748b"
              value={form.deposit}
              onChangeText={(t) => updateForm('deposit', t)}
            />
          </View>
        </View>

        <View className="flex-row gap-2 mb-4">
          <View className="flex-1">
            <Text className="text-slate-400 font-bold text-xs mb-1.5">Beds</Text>
            <TextInput className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-sm text-center" keyboardType="numeric" value={form.beds} onChangeText={(t) => updateForm('beds', t)} />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 font-bold text-xs mb-1.5">Baths</Text>
            <TextInput className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-sm text-center" keyboardType="numeric" value={form.baths} onChangeText={(t) => updateForm('baths', t)} />
          </View>
          <View className="flex-1">
            <Text className="text-slate-400 font-bold text-xs mb-1.5">SqFt</Text>
            <TextInput className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white font-medium text-sm text-center" keyboardType="numeric" placeholder="1000" placeholderTextColor="#64748b" value={form.sqft} onChangeText={(t) => updateForm('sqft', t)} />
          </View>
        </View>

        <View className="mb-6">
          <Text className="text-slate-400 font-bold text-xs mb-1.5">Description</Text>
          <TextInput 
            className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-white font-medium text-sm h-28" 
            multiline 
            style={{ textAlignVertical: 'top' }}
            placeholder="Describe the amenities, furnishings, etc." 
            placeholderTextColor="#64748b"
            value={form.description}
            onChangeText={(t) => updateForm('description', t)}
          />
        </View>

        {/* Image Upload Box */}
        <TouchableOpacity className="bg-slate-900 border-2 border-dashed border-slate-800 rounded-2xl h-28 justify-center items-center mb-6">
          <Camera size={28} color="#3b82f6" className="mb-1" />
          <Text className="text-blue-400 font-bold text-xs">Add Property Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity className="bg-emerald-600 py-4 rounded-xl items-center active:bg-emerald-500" onPress={handleSubmit}>
          <Text className="text-white font-black text-base">Post Listing</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
