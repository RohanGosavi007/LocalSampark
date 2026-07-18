import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import VisitorLayout from './components/VisitorLayout';

export default function FleetVisitorView({ shop }) {
  return (
    <VisitorLayout shopName={shop.name || 'City Cabs'} shopAddress="Pune City" shopIcon="🚕" cartCount={0}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Book a Ride</Text>
        <TouchableOpacity style={styles.card}>
          <Text style={{fontSize: 24, marginBottom: 8}}>🚕</Text>
          <Text style={styles.cardTitle}>City Taxi</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card}>
          <Text style={{fontSize: 24, marginBottom: 8}}>🛺</Text>
          <Text style={styles.cardTitle}>Auto Rickshaw</Text>
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
