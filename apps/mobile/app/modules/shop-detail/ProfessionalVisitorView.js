import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import VisitorLayout from './components/VisitorLayout';

export default function ProfessionalVisitorView({ shop }) {
  return (
    <VisitorLayout 
      shopName={shop.name || 'Verma & Associates (CA)'} 
      shopAddress="Office 402, Business Bay"
      shopIcon="💼"
      cartCount={0}
      onCheckout={() => {}}
    >
      <View style={{ padding: 16 }}>
        
        <View style={styles.profileBox}>
          <Text style={styles.profileDesc}>We provide expert accounting, tax filing, and financial consultation for businesses and individuals.</Text>
          
          <TouchableOpacity style={styles.actionBtn} onPress={() => router.push('/modules/service-booking')}>
            <Text style={styles.actionBtnText}>Request Quotation</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSec]} onPress={() => router.push('/modules/service-booking')}>
            <Text style={[styles.actionBtnText, styles.actionBtnTextSec]}>Book Consultation Call</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Areas of Expertise</Text>
        <View style={styles.tagsContainer}>
          <View style={styles.tag}><Text style={styles.tagText}>Income Tax Filing</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>GST Registration</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>Corporate Audit</Text></View>
          <View style={styles.tag}><Text style={styles.tagText}>Bookkeeping</Text></View>
        </View>

      </View>
    </VisitorLayout>
  );
}

const styles = StyleSheet.create({
  profileBox: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  profileDesc: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 20 },
  actionBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  actionBtnSec: { backgroundColor: '#f1f5f9' },
  actionBtnTextSec: { color: '#0f172a' },

  sectionTitle: { fontSize: 18, fontWeight: '900', color: '#0f172a', marginBottom: 16 },
  tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tag: { backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  tagText: { color: '#334155', fontWeight: 'bold', fontSize: 13 },
});
