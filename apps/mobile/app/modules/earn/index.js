import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';

const STREAMS = [
  {
    id: 'runner', icon: '🏍️', title: 'Delivery Runner', badge: 'Most Popular', badgeColor: '#10b981',
    rate: '₹35 – ₹65', period: 'per delivery', monthly: '~₹12k – ₹25k/mo',
    desc: 'Work on your own schedule. Accept delivery gigs from nearby shops. Walk, cycle, or use a 2-wheeler. No target pressure.',
    requirements: ['Age 18+', 'Smartphone', 'Know local Pune roads']
  },
  {
    id: 'partner', icon: '🤝', title: 'Franchise Partner', badge: 'High Earning', badgeColor: '#f97316',
    rate: '30%', period: 'of platform commission', monthly: '~₹40k – ₹1.2L/mo',
    desc: 'Operate a full LocalSampark franchise in your pincode zone. Onboard shops, manage runners, and earn on every transaction.',
    requirements: ['₹25,000 security deposit', 'Smartphone + laptop', 'Basic business knowledge']
  },
  {
    id: 'merchant', icon: '🏪', title: 'Shop Owner / Merchant', badge: 'Zero Commission', badgeColor: '#4f46e5',
    rate: '0%', period: 'commission on orders', monthly: 'Keep 100% of revenue',
    desc: 'List your grocery store, restaurant, pharmacy, or service business. Accept orders from neighbors. Never pay commission.',
    requirements: ['Valid business', 'Smartphone', 'Dhanori/Pune area location']
  },
  {
    id: 'agent', icon: '💼', title: 'Sub-Agent (Referral)', badge: 'Passive Income', badgeColor: '#8b5cf6',
    rate: '₹50', period: 'per verified referral', monthly: 'Unlimited earning',
    desc: 'Refer neighbors, shops, or service providers to LocalSampark. Every verified signup earns you wallet credits.',
    requirements: ['No requirements', 'Anyone can refer', 'Share link via WhatsApp']
  }
];

export default function EarnScreen() {
  const handleApply = (title) => {
    Alert.alert('Application Started', `You are starting the onboarding process for: ${title}. We will guide you through the next steps.`);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>💸 Earn with Us</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>
          LocalSampark is built by the community, for the community. Choose how you want to partner with us and start earning today.
        </Text>

        {STREAMS.map(stream => (
          <View key={stream.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.iconBox}><Text style={styles.icon}>{stream.icon}</Text></View>
              <View style={{flex: 1}}>
                <View style={[styles.badge, {backgroundColor: stream.badgeColor + '20'}]}>
                  <Text style={[styles.badgeText, {color: stream.badgeColor}]}>{stream.badge}</Text>
                </View>
                <Text style={styles.streamTitle}>{stream.title}</Text>
              </View>
            </View>

            <View style={styles.rateBox}>
              <Text style={styles.rate}>{stream.rate}</Text>
              <Text style={styles.period}>{stream.period}</Text>
              <Text style={styles.monthly}>{stream.monthly}</Text>
            </View>

            <Text style={styles.desc}>{stream.desc}</Text>

            <View style={styles.reqBox}>
              <Text style={styles.reqTitle}>Requirements:</Text>
              {stream.requirements.map((req, i) => (
                <Text key={i} style={styles.reqItem}>• {req}</Text>
              ))}
            </View>

            <TouchableOpacity style={styles.applyBtn} onPress={() => handleApply(stream.title)}>
              <Text style={styles.applyBtnText}>Apply Now</Text>
            </TouchableOpacity>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  
  content: { padding: 16, paddingBottom: 60 },
  subtitle: { color: '#64748b', fontSize: 14, marginBottom: 24, lineHeight: 22, textAlign: 'center' },
  
  card: { backgroundColor: '#ffffff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', marginBottom: 20 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  icon: { fontSize: 28 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  streamTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  
  rateBox: { backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 16, alignItems: 'center' },
  rate: { color: '#3b82f6', fontSize: 28, fontWeight: '900', marginBottom: 4 },
  period: { color: '#64748b', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  monthly: { color: '#10b981', fontSize: 13, fontWeight: 'bold' },
  
  desc: { color: '#475569', fontSize: 14, lineHeight: 22, marginBottom: 16 },
  
  reqBox: { backgroundColor: '#ffffff', padding: 12, borderRadius: 8, marginBottom: 20 },
  reqTitle: { color: '#0f172a', fontSize: 12, fontWeight: 'bold', marginBottom: 8 },
  reqItem: { color: '#475569', fontSize: 13, marginBottom: 4 },
  
  applyBtn: { backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  applyBtnText: { color: '#0f172a', fontWeight: 'bold', fontSize: 15 }
});
