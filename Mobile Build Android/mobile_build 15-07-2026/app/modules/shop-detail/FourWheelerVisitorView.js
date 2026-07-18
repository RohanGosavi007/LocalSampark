import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import VisitorLayout from './components/VisitorLayout';

export default function FourWheelerVisitorView({ shop }) {
  return (
    <VisitorLayout shopName={shop.name || 'Car Point'} shopAddress="Pune City" shopIcon="🚘" cartCount={0}>
      <View style={{ padding: 16 }}>
        <Text style={styles.title}>Our Services</Text>
        <TouchableOpacity style={styles.card}>
          <Text style={{fontSize: 24, marginBottom: 8}}>🚘</Text>
          <Text style={styles.cardTitle}>Car Servicing</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.card}>
          <Text style={{fontSize: 24, marginBottom: 8}}>🧼</Text>
          <Text style={styles.cardTitle}>Car Wash & Detailing</Text>
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
