import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function OfferRideScreen() {
  const navigation = useNavigation();
  const [formData, setFormData] = useState({
    fromLocation: '',
    toLocation: '',
    departureDate: '',
    departureTime: '',
    totalSeats: '3',
    pricePerSeat: '50',
    vehicleType: 'Car',
    vehicleNumber: ''
  });

  const handleSubmit = async () => {
    if (!formData.fromLocation || !formData.toLocation || !formData.departureDate || !formData.departureTime) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }

    try {
      // Stub for backend integration
      // await axios.post('/api/v1/carpool/rides', formData)
      Alert.alert('Success', 'Your ride has been successfully listed!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not post ride. Try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Offer a Ride</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={{ paddingBottom: 40 }}>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Leaving from *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="location-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="E.g., Hinjewadi Phase 1"
              value={formData.fromLocation}
              onChangeText={t => setFormData({ ...formData, fromLocation: t })}
            />
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Going to *</Text>
          <View style={styles.inputRow}>
            <Ionicons name="navigate-circle-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="E.g., Pune Station"
              value={formData.toLocation}
              onChangeText={t => setFormData({ ...formData, toLocation: t })}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Date *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="calendar-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={formData.departureDate}
                onChangeText={t => setFormData({ ...formData, departureDate: t })}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Time *</Text>
            <View style={styles.inputRow}>
              <Ionicons name="time-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                placeholder="HH:MM AM"
                value={formData.departureTime}
                onChangeText={t => setFormData({ ...formData, departureTime: t })}
              />
            </View>
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
            <Text style={styles.label}>Seats Available</Text>
            <View style={styles.inputRow}>
              <Ionicons name="people-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.totalSeats}
                onChangeText={t => setFormData({ ...formData, totalSeats: t })}
              />
            </View>
          </View>

          <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
            <Text style={styles.label}>Price / Seat (₹)</Text>
            <View style={styles.inputRow}>
              <Ionicons name="cash-outline" size={20} color="#999" />
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={formData.pricePerSeat}
                onChangeText={t => setFormData({ ...formData, pricePerSeat: t })}
              />
            </View>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Vehicle Number (Optional)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="car-outline" size={20} color="#999" />
            <TextInput
              style={styles.input}
              placeholder="MH 12 AB 1234"
              value={formData.vehicleNumber}
              onChangeText={t => setFormData({ ...formData, vehicleNumber: t })}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Text style={styles.submitText}>Publish Ride</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#0f172a', borderBottomWidth: 1, borderBottomColor: '#eee' },
  title: { fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#555', marginBottom: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', borderRadius: 12, paddingHorizontal: 15, borderWidth: 1, borderColor: '#ddd' },
  input: { flex: 1, paddingVertical: 15, paddingHorizontal: 10, fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  submitBtn: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  submitText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' }
});
