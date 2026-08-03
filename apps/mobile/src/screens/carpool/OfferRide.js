import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Switch , StyleSheet } from 'react-native';
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
    <ScrollView style={s.s0} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      
      <View style={s.s1}>
        <Text style={s.s2}>Route Details</Text>
        
        <View style={s.s3}>
          <Text style={s.s4}>Leaving from *</Text>
          <View style={s.s5}>
            <MapPin size={20} color="#64748b" />
            <TextInput
              style={s.s6}
              placeholder="E.g., Hinjewadi Phase 1"
              placeholderTextColor="#475569"
              value={formData.fromLocation}
              onChangeText={t => setFormData({ ...formData, fromLocation: t })}
            />
          </View>
        </View>

        <View style={s.s7}>
          <Text style={s.s8}>Going to *</Text>
          <View style={s.s9}>
            <Navigation size={20} color="#64748b" />
            <TextInput
              style={s.s10}
              placeholder="E.g., Pune Station"
              placeholderTextColor="#475569"
              value={formData.toLocation}
              onChangeText={t => setFormData({ ...formData, toLocation: t })}
            />
          </View>
        </View>
      </View>

      <View style={s.s11}>
        <Text style={s.s12}>Schedule & Capacity</Text>
        
        <View style={s.s13}>
          <View style={s.s14}>
            <Text style={s.s15}>Date *</Text>
            <View style={s.s16}>
              <Calendar size={18} color="#64748b" />
              <TextInput
                style={s.s17}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#475569"
                value={formData.departureDate}
                onChangeText={t => setFormData({ ...formData, departureDate: t })}
              />
            </View>
          </View>

          <View style={s.s18}>
            <Text style={s.s19}>Time *</Text>
            <View style={s.s20}>
              <Clock size={18} color="#64748b" />
              <TextInput
                style={s.s21}
                placeholder="HH:MM AM"
                placeholderTextColor="#475569"
                value={formData.departureTime}
                onChangeText={t => setFormData({ ...formData, departureTime: t })}
              />
            </View>
          </View>
        </View>

        <View style={s.s22}>
          <View style={s.s23}>
            <Text style={s.s24}>Seats *</Text>
            <View style={s.s25}>
              <Users size={18} color="#64748b" />
              <TextInput
                style={s.s26}
                keyboardType="numeric"
                value={formData.totalSeats}
                onChangeText={t => setFormData({ ...formData, totalSeats: t })}
              />
            </View>
          </View>

          <View style={s.s27}>
            <Text style={s.s28}>Price / Seat *</Text>
            <View style={s.s29}>
              <IndianRupee size={18} color="#64748b" />
              <TextInput
                style={s.s30}
                keyboardType="numeric"
                value={formData.pricePerSeat}
                onChangeText={t => setFormData({ ...formData, pricePerSeat: t })}
              />
            </View>
          </View>
        </View>
      </View>

      <View style={s.s31}>
        <Text style={s.s32}>Vehicle Details</Text>
        
        <View style={s.s33}>
          <Text style={s.s34}>Vehicle Number</Text>
          <View style={s.s35}>
            <Car size={20} color="#64748b" />
            <TextInput
              style={s.s36}
              placeholder="E.g. MH 12 AB 1234"
              placeholderTextColor="#475569"
              value={formData.vehicleNumber}
              onChangeText={t => setFormData({ ...formData, vehicleNumber: t })}
            />
          </View>
        </View>

        <View style={s.s37}>
          <View style={s.s38}>
            <View style={s.s39}>
              <ShieldCheck size={20} color="#ec4899" />
            </View>
            <View>
              <Text style={s.s40}>Women Only Ride</Text>
              <Text style={s.s41}>Visible only to female users</Text>
            </View>
          </View>
          <Switch 
            value={formData.isWomenOnly} 
            onValueChange={v => setFormData({...formData, isWomenOnly: v})}
            trackColor={{ false: '#334155', true: '#ec4899' }}
            thumbColor={formData.isWomenOnly ? '#fbcfe8' : '#94a3b8'}
          />
        </View>

        <View style={s.s42}>
          <View style={s.s43}>
            <View style={s.s44}>
              <Leaf size={20} color="#10b981" />
            </View>
            <View>
              <Text style={s.s45}>Green Ride (EV)</Text>
              <Text style={s.s46}>I am driving an Electric Vehicle</Text>
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
        style={s.s47}
        onPress={handleSubmit}
      >
        <Car size={20} color="#fff" />
        <Text style={s.s48}>Publish Ride</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const s = StyleSheet.create({
  s0: { flex: 1 },
  s1: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  s2: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s3: { marginBottom: 16 },
  s4: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s5: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  s6: { flex: 1, marginLeft: 12, color: '#ffffff', fontSize: 16 },
  s7: { marginBottom: 8 },
  s8: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s9: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  s10: { flex: 1, marginLeft: 12, color: '#ffffff', fontSize: 16 },
  s11: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  s12: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s13: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  s14: { flex: 1 },
  s15: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s16: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  s17: { flex: 1, marginLeft: 8, color: '#ffffff', fontSize: 16 },
  s18: { flex: 1 },
  s19: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s20: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  s21: { flex: 1, marginLeft: 8, color: '#ffffff', fontSize: 16 },
  s22: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  s23: { flex: 1 },
  s24: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s25: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  s26: { flex: 1, marginLeft: 8, color: '#ffffff', fontSize: 16 },
  s27: { flex: 1 },
  s28: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s29: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 12, height: 48 },
  s30: { flex: 1, marginLeft: 8, color: '#ffffff', fontSize: 16 },
  s31: { backgroundColor: '#0f172a', borderWidth: 1, borderColor: '#1e293b', borderRadius: 16, padding: 16, marginBottom: 16 },
  s32: { color: '#ffffff', fontWeight: '700', fontSize: 18, marginBottom: 16 },
  s33: { marginBottom: 16 },
  s34: { color: '#94a3b8', fontWeight: '600', marginBottom: 8, marginLeft: 4, fontSize: 14 },
  s35: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#020617', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, paddingHorizontal: 16, height: 48 },
  s36: { flex: 1, marginLeft: 12, color: '#ffffff', fontSize: 16 },
  s37: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#020617', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b', marginBottom: 12 },
  s38: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  s39: { width: 40, height: 40, borderRadius: 9999, backgroundColor: 'rgba(236,72,153,0.1)', alignItems: 'center', justifyContent: 'center' },
  s40: { color: '#ffffff', fontWeight: '700' },
  s41: { color: '#94a3b8', fontSize: 12 },
  s42: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#020617', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1e293b' },
  s43: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  s44: { width: 40, height: 40, borderRadius: 9999, backgroundColor: 'rgba(16,185,129,0.1)', alignItems: 'center', justifyContent: 'center' },
  s45: { color: '#ffffff', fontWeight: '700' },
  s46: { color: '#94a3b8', fontSize: 12 },
  s47: { backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 32 },
  s48: { color: '#ffffff', fontWeight: '900', fontSize: 18 },
});
