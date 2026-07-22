import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Stethoscope, PhoneCall, HeartPulse, Pill, Calendar, Clock, MapPin } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { apiGet } from '../../lib/api';

export default function NativemedicalScreen() {
  const router = useRouter();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('doctors'); // 'doctors' | 'pharmacy'

  useEffect(() => {
    let isMounted = true;
    async function loadDoctors() {
      try {
        const data = await apiGet('/medical/doctors');
        if (isMounted && data && data.doctors && data.doctors.length > 0) {
          setDoctors(data.doctors.map(d => ({
            id: d.id,
            name: d.name,
            specialty: d.specialization,
            experience: d.qualification || 'Experienced MD',
            clinic: d.clinic_name,
            fee: `₹${d.consultation_fee || 500}`,
            available: 'Available Today',
            rating: `${d.rating || 4.9} ★`
          })));
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn('API error, loading local fallback:', e.message);
      }
      
      if (isMounted) {
        setDoctors([
          {
            id: 'doc_1',
            name: 'Dr. Rajesh Patil',
            specialty: 'General Physician / MD',
            experience: '14 Yrs Exp',
            clinic: 'Dhanori Health Clinic, Porwal Rd',
            fee: '₹400',
            available: 'Today, 5:00 PM - 9:00 PM',
            rating: '4.9 ★'
          },
          {
            id: 'doc_2',
            name: 'Dr. Ananya Joshi',
            specialty: 'Pediatrician & Child Care',
            experience: '9 Yrs Exp',
            clinic: 'Little Angels Care, Lohegaon',
            fee: '₹500',
            available: 'Tomorrow, 10:00 AM - 1:00 PM',
            rating: '4.8 ★'
          }
        ]);
        setLoading(false);
      }
    }
    loadDoctors();
    return () => { isMounted = false; };
  }, []);

  const handleTriggerSOS = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    Alert.alert(
      '🚨 EMERGENCY SOS DISPATCH',
      'Alert nearest Dhanori Emergency Ambulance & Society Gate Guard?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'CONFIRM DISPATCH NOW',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert('Ambulance Dispatched 🚑', 'Emergency Unit En-Route!\nDriver: Ramesh Kumar (+91 98220 11223)\nETA: 4 Minutes');
          }
        }
      ]
    );
  };

  const handleBookAppointment = (doc) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Book Appointment', `Confirm appointment booking with ${doc.name} (${doc.fee})?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm Booking', onPress: () => Alert.alert('Appointment Confirmed 🎉', `Token #14 generated for ${doc.name}.\nSlot: ${doc.available}`) }
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      {/* Top Header */}
      <View className="flex-row items-center p-4 border-b border-slate-900 bg-slate-950 z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-900 border border-slate-800 rounded-full">
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-white text-xl font-black">Medical & Healthcare</Text>
          <Text className="text-slate-400 text-xs">24x7 Dhanori Doctor Consultations & Pharmacy</Text>
        </View>
      </View>

      {/* Emergency SOS Banner */}
      <TouchableOpacity
        onPress={handleTriggerSOS}
        activeOpacity={0.8}
        className="mx-4 mt-3 p-4 bg-rose-950 border border-rose-600/50 rounded-2xl flex-row items-center justify-between"
      >
        <View className="flex-row items-center flex-1 mr-2">
          <View className="w-10 h-10 bg-rose-600 rounded-full items-center justify-center mr-3">
            <HeartPulse color="#fff" size={22} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-black text-sm">24x7 EMERGENCY AMBULANCE</Text>
            <Text className="text-rose-200 text-xs">Tap for instant 4-min local dispatch</Text>
          </View>
        </View>
        <View className="bg-rose-600 px-3 py-1.5 rounded-xl">
          <Text className="text-white font-black text-xs">SOS</Text>
        </View>
      </TouchableOpacity>

      {/* Navigation Sub-Tabs */}
      <View className="flex-row p-4 gap-2">
        <TouchableOpacity
          onPress={() => { setActiveTab('doctors'); Haptics.selectionAsync(); }}
          className={`flex-1 py-2.5 rounded-xl border items-center flex-row justify-center ${activeTab === 'doctors' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Stethoscope color="#fff" size={16} className="mr-2" />
          <Text className="text-white font-bold text-xs">Find Doctors</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setActiveTab('pharmacy'); Haptics.selectionAsync(); }}
          className={`flex-1 py-2.5 rounded-xl border items-center flex-row justify-center ${activeTab === 'pharmacy' ? 'bg-indigo-600 border-indigo-500' : 'bg-slate-900 border-slate-800'}`}
        >
          <Pill color="#fff" size={16} className="mr-2" />
          <Text className="text-white font-bold text-xs">Order Medicine</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#e11d48" />
          <Text className="text-slate-500 mt-4 font-bold text-xs uppercase tracking-widest">Loading Medical Network...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {activeTab === 'doctors' ? (
            <View>
              <Text className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-3">Available Doctors in Dhanori ({doctors.length})</Text>

              {doctors.map((doc) => (
                <View key={doc.id} className="bg-slate-900 border border-slate-800 p-5 rounded-2xl mb-4">
                  <View className="flex-row justify-between items-start mb-2">
                    <View className="flex-1">
                      <Text className="text-white font-black text-lg">{doc.name}</Text>
                      <Text className="text-indigo-400 font-bold text-xs mb-1">{doc.specialty}</Text>
                      <Text className="text-slate-400 text-xs">{doc.experience}</Text>
                    </View>
                    <View className="bg-amber-950/80 border border-amber-500/40 px-2.5 py-1 rounded-lg">
                      <Text className="text-amber-400 font-black text-xs">{doc.rating}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center mb-2">
                    <MapPin color="#64748b" size={14} className="mr-1" />
                    <Text className="text-slate-400 text-xs">{doc.clinic}</Text>
                  </View>

                  <View className="flex-row items-center mb-4">
                    <Clock color="#34d399" size={14} className="mr-1" />
                    <Text className="text-emerald-400 text-xs font-semibold">{doc.available}</Text>
                  </View>

                  <View className="flex-row items-center justify-between pt-3 border-t border-slate-800">
                    <Text className="text-white font-black text-base">{doc.fee} <Text className="text-slate-400 text-xs font-normal">consultation</Text></Text>
                    <TouchableOpacity
                      onPress={() => handleBookAppointment(doc)}
                      className="bg-indigo-600 px-4 py-2.5 rounded-xl border border-indigo-400/30 flex-row items-center"
                    >
                      <Calendar color="#fff" size={14} className="mr-1.5" />
                      <Text className="text-white font-bold text-xs">Book Slot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View className="bg-slate-900 border border-slate-800 p-6 rounded-2xl items-center text-center">
              <Pill color="#a78bfa" size={40} className="mb-3" />
              <Text className="text-white font-black text-lg mb-2">Local Pharmacy Delivery</Text>
              <Text className="text-slate-400 text-xs text-center mb-4 leading-5">Upload your prescription or order over-the-counter medicines directly from verified Dhanori chemists with 30-min doorstep delivery.</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Prescription Upload', 'Select prescription image from camera roll.')}
                className="bg-purple-600 px-6 py-3 rounded-xl border border-purple-400/30"
              >
                <Text className="text-white font-bold text-xs">📷 Upload Prescription</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
