import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function MobileTracking() {
  const [statusStep, setStatusStep] = useState(1);

  useEffect(() => {
    const timer1 = setTimeout(() => setStatusStep(2), 3000); 
    const timer2 = setTimeout(() => setStatusStep(3), 6000); 
    const timer3 = setTimeout(() => setStatusStep(4), 9000); 
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const steps = [
    { id: 1, title: 'Order Placed', desc: 'Waiting for shop confirmation' },
    { id: 2, title: 'Order Accepted', desc: 'Shop has confirmed' },
    { id: 3, title: 'Preparing', desc: 'Items are being packed' },
    { id: 4, title: 'Out for Delivery', desc: 'Agent on the way' },
    { id: 5, title: 'Delivered', desc: 'Enjoy!' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>⬅️ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order Tracking</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.mapCard}>
          <View style={styles.mapArea}>
            <Text style={styles.mapIcon}>🗺️</Text>
            <Text style={styles.mapNotice}>Live GPS tracking active</Text>
          </View>
          <View style={styles.etaArea}>
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
            <Text style={styles.etaValue}>15-20 mins</Text>
          </View>
        </View>

        <View style={styles.timelineCard}>
          {steps.map((step, i) => {
            const isCompleted = statusStep > step.id;
            const isCurrent = statusStep === step.id;
            const isPending = statusStep < step.id;
            
            return (
              <View key={step.id} style={styles.stepRow}>
                <View style={styles.stepIndicatorCol}>
                  <View style={[
                    styles.stepCircle, 
                    isCompleted && styles.completedCircle,
                    isCurrent && styles.currentCircle,
                    isPending && styles.pendingCircle
                  ]}>
                    {isCompleted && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  {i < steps.length - 1 && (
                    <View style={[
                      styles.stepLine,
                      (isCompleted || isCurrent) ? styles.completedLine : styles.pendingLine
                    ]} />
                  )}
                </View>
                <View style={styles.stepContentCol}>
                  <Text style={[styles.stepTitle, isPending ? styles.pendingText : styles.activeText]}>
                    {step.title}
                  </Text>
                  <Text style={styles.stepDesc}>{step.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#ffffff', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 12 }, 
  backBtnText: { color: '#3b82f6', fontWeight: 'bold', fontSize: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  content: { padding: 16 },
  
  mapCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', overflow: 'hidden', marginBottom: 24 },
  mapArea: { height: 200, backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', position: 'relative' },
  mapIcon: { fontSize: 64, zIndex: 10 },
  mapNotice: { position: 'absolute', bottom: 12, color: '#64748b', fontSize: 12, fontWeight: 'bold', zIndex: 10 },
  etaArea: { padding: 24, alignItems: 'center' },
  etaLabel: { color: '#64748b', fontSize: 14, fontWeight: '500', marginBottom: 4 },
  etaValue: { color: '#0f172a', fontSize: 32, fontWeight: 'bold' },

  timelineCard: { backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 1, borderColor: '#ffffff', padding: 24 },
  stepRow: { flexDirection: 'row' },
  stepIndicatorCol: { alignItems: 'center', marginRight: 20, width: 32 },
  stepCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  completedCircle: { backgroundColor: '#10b981' },
  currentCircle: { backgroundColor: '#3b82f6', shadowColor: '#3b82f6', shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 5 },
  pendingCircle: { backgroundColor: '#ffffff' },
  checkmark: { color: '#0f172a', fontWeight: 'bold', fontSize: 16 },
  stepLine: { width: 4, flex: 1, marginVertical: -4 },
  completedLine: { backgroundColor: '#10b981' },
  pendingLine: { backgroundColor: '#ffffff' },
  stepContentCol: { flex: 1, paddingBottom: 32 },
  stepTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  activeText: { color: '#0f172a' },
  pendingText: { color: '#64748b' },
  stepDesc: { color: '#64748b', fontSize: 14 }
});
