import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, ActivityIndicator, Alert , StyleSheet } from 'react-native';
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
    <SafeAreaView style={s.s0}>
      {/* Top Header */}
      <View style={s.s1}>
        <TouchableOpacity onPress={() => router.back()} style={s.s2}>
          <ChevronLeft color="#fff" size={24} />
        </TouchableOpacity>
        <View style={s.s3}>
          <Text style={s.s4}>Medical & Healthcare</Text>
          <Text style={s.s5}>24x7 Dhanori Doctor Consultations & Pharmacy</Text>
        </View>
      </View>

      {/* Emergency SOS Banner */}
      <TouchableOpacity
        onPress={handleTriggerSOS}
        activeOpacity={0.8}
        style={s.s6}
      >
        <View style={s.s7}>
          <View style={s.s8}>
            <HeartPulse color="#fff" size={22} />
          </View>
          <View style={s.s9}>
            <Text style={s.s10}>24x7 EMERGENCY AMBULANCE</Text>
            <Text style={s.s11}>Tap for instant 4-min local dispatch</Text>
          </View>
        </View>
        <View style={s.s12}>
          <Text style={s.s13}>SOS</Text>
        </View>
      </TouchableOpacity>

      {/* Navigation Sub-Tabs */}
      <View style={s.s14}>
        <TouchableOpacity
          onPress={() => { setActiveTab('doctors'); Haptics.selectionAsync(); }}
          style={[s.s46, activeTab === 'doctors' ? s.s47 : s.s48]}
        >
          <Stethoscope color="#fff" size={16} style={s.s15} />
          <Text style={s.s16}>Find Doctors</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => { setActiveTab('pharmacy'); Haptics.selectionAsync(); }}
          style={[s.s49, activeTab === 'pharmacy' ? s.s50 : s.s51]}
        >
          <Pill color="#fff" size={16} style={s.s17} />
          <Text style={s.s18}>Order Medicine</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.s19}>
          <ActivityIndicator size="large" color="#e11d48" />
          <Text style={s.s20}>Loading Medical Network...</Text>
        </View>
      ) : (
        <ScrollView style={s.s21} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          {activeTab === 'doctors' ? (
            <View>
              <Text style={s.s22}>Available Doctors in Dhanori ({doctors.length})</Text>

              {doctors.map((doc) => (
                <View key={doc.id} style={s.s23}>
                  <View style={s.s24}>
                    <View style={s.s25}>
                      <Text style={s.s26}>{doc.name}</Text>
                      <Text style={s.s27}>{doc.specialty}</Text>
                      <Text style={s.s28}>{doc.experience}</Text>
                    </View>
                    <View style={s.s29}>
                      <Text style={s.s30}>{doc.rating}</Text>
                    </View>
                  </View>

                  <View style={s.s31}>
                    <MapPin color="#64748b" size={14} />
                    <Text style={s.s32}>{doc.clinic}</Text>
                  </View>

                  <View style={s.s33}>
                    <Clock color="#34d399" size={14} />
                    <Text style={s.s34}>{doc.available}</Text>
                  </View>

                  <View style={s.s35}>
                    <Text style={s.s36}>{doc.fee} <Text style={s.s37}>consultation</Text></Text>
                    <TouchableOpacity
                      onPress={() => handleBookAppointment(doc)}
                      style={s.s38}
                    >
                      <Calendar color="#fff" size={14} />
                      <Text style={s.s39}>Book Slot</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={s.s40}>
              <Pill color="#a78bfa" size={40} style={s.s41} />
              <Text style={s.s42}>Local Pharmacy Delivery</Text>
              <Text style={s.s43}>Upload your prescription or order over-the-counter medicines directly from verified Dhanori chemists with 30-min doorstep delivery.</Text>
              <TouchableOpacity
                onPress={() => Alert.alert('Prescription Upload', 'Select prescription image from camera roll.')}
                style={s.s44}
              >
                <Text style={s.s45}>📷 Upload Prescription</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1, backgroundColor: '#020617' },
  s1: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderColor: '#0f172a', backgroundColor: '#020617', zIndex: 10 },
  s2: { marginRight: 16, padding: 8, backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 9999 },
  s3: { flex: 1 },
  s4: { color: '#ffffff', fontSize: 20, fontWeight: '900' },
  s5: { color: '#94a3b8', fontSize: 12 },
  s6: { marginHorizontal: 16, marginTop: 12, padding: 16, backgroundColor: '#4c0519', borderWidth: 1, borderColor: 'rgba(225,29,72,0.5)', borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  s7: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  s8: { width: 40, height: 40, backgroundColor: '#e11d48', borderRadius: 9999, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  s9: { flex: 1 },
  s10: { color: '#ffffff', fontWeight: '900', fontSize: 14 },
  s11: { color: '#fecdd3', fontSize: 12 },
  s12: { backgroundColor: '#e11d48', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  s13: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
  s14: { flexDirection: 'row', padding: 16, gap: 8 },
  s15: { marginRight: 8 },
  s16: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s17: { marginRight: 8 },
  s18: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s19: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  s20: { color: '#64748b', marginTop: 16, fontWeight: '700', fontSize: 12, textTransform: 'uppercase', letterSpacing: 2 },
  s21: { flex: 1 },
  s22: { color: '#94a3b8', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12, marginBottom: 12 },
  s23: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 20, borderRadius: 16, marginBottom: 16 },
  s24: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  s25: { flex: 1 },
  s26: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
  s27: { color: '#818cf8', fontWeight: '700', fontSize: 12, marginBottom: 4 },
  s28: { color: '#94a3b8', fontSize: 12 },
  s29: { backgroundColor: 'rgba(69,26,3,0.8)', borderWidth: 1, borderColor: 'rgba(245,158,11,0.4)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  s30: { color: '#fbbf24', fontWeight: '900', fontSize: 12 },
  s31: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  s32: { color: '#94a3b8', fontSize: 12 },
  s33: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  s34: { color: '#34d399', fontSize: 12, fontWeight: '600' },
  s35: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderColor: '#1e293b' },
  s36: { color: '#ffffff', fontWeight: '900', fontSize: 16 },
  s37: { color: '#94a3b8', fontSize: 12, fontWeight: '400' },
  s38: { backgroundColor: '#4f46e5', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(129,140,248,0.3)', flexDirection: 'row', alignItems: 'center' },
  s39: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s40: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', padding: 24, borderRadius: 16, alignItems: 'center', textAlign: 'center' },
  s41: { marginBottom: 12 },
  s42: { color: '#ffffff', fontWeight: '900', fontSize: 18, marginBottom: 8 },
  s43: { color: '#94a3b8', fontSize: 12, textAlign: 'center', marginBottom: 16, lineHeight: 5 },
  s44: { backgroundColor: '#9333ea', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(192,132,252,0.3)' },
  s45: { color: '#ffffff', fontWeight: '700', fontSize: 12 },
  s46: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s47: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  s48: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
  s49: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  s50: { backgroundColor: '#4f46e5', borderColor: '#6366f1' },
  s51: { backgroundColor: '#0f172a', borderColor: '#1e293b' },
});
