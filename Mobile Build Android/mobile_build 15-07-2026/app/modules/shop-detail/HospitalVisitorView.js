import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';
import { Ionicons } from '@expo/vector-icons';

export default function HospitalVisitorView({ shop }) {
  return (
    <VisitorLayout shopName={shop.name || 'City Hospital'} shopAddress="Main Road" shopIcon="🏥" cartCount={0}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Hospital Services</Text>
        <TouchableOpacity style={styles.card} onPress={() => router.push('/modules/checkout')}>
          <Text style={{fontSize: 24, marginBottom: 8}}>🩺</Text>
          <Text style={styles.cardTitle}>Book OPD Appointment</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card}>
          <Text style={{fontSize: 24, marginBottom: 8}}>🩸</Text>
          <Text style={styles.cardTitle}>Book Lab Test</Text>
        </TouchableOpacity>
      </View>
    </VisitorLayout>
  );
}
const styles = StyleSheet.create({
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTitle: { fontSize: 16, fontWeight: 'bold' }
});
