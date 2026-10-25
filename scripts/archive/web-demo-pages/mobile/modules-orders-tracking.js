import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function OrderTrackingScreen() {
  const [statusStep, setStatusStep] = useState(1);

  // Auto-progress status for demo purposes
  useEffect(() => {
    const timer1 = setTimeout(() => setStatusStep(2), 3000); // Accepted
    const timer2 = setTimeout(() => setStatusStep(3), 6000); // Cooking/Packing
    const timer3 = setTimeout(() => setStatusStep(4), 9000); // Out for delivery
    
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  const steps = [
    { id: 1, title: 'Order Placed', desc: 'Waiting for shop to confirm', icon: '📝' },
    { id: 2, title: 'Order Accepted', desc: 'Shop has confirmed your order', icon: '✅' },
    { id: 3, title: 'Preparing', desc: 'Your items are being packed', icon: '📦' },
    { id: 4, title: 'Out for Delivery', desc: 'Agent is on the way', icon: '🛵' },
    { id: 5, title: 'Delivered', desc: 'Enjoy your order!', icon: '🎉' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.backBtnIcon}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Status</Text>
        <View style={{width: 40}} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Mock Map Area */}
        <View style={styles.mapContainer}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <Text style={styles.mapText}>Live GPS Tracking will appear here when out for delivery</Text>
        </View>

        {/* ETA Card */}
        <View style={styles.etaCard}>
          <Text style={styles.etaTitle}>Estimated Delivery</Text>
          <Text style={styles.etaTime}>15 - 20 mins</Text>
          <Text style={styles.etaSubtitle}>Arriving by 7:45 PM</Text>
        </View>

        {/* Tracking Timeline */}
        <View style={styles.timelineContainer}>
          {steps.map((step, index) => {
            const isCompleted = statusStep > step.id;
            const isCurrent = statusStep === step.id;
            const isPending = statusStep < step.id;
            
            return (
              <View key={step.id} style={styles.timelineStep}>
                <View style={styles.timelineLeft}>
                  <View style={[
                    styles.node, 
                    isCompleted && styles.nodeCompleted,
                    isCurrent && styles.nodeCurrent,
                    isPending && styles.nodePending
                  ]}>
                    <Text style={{fontSize: 14}}>{isCompleted ? '✓' : ''}</Text>
                  </View>
                  {index < steps.length - 1 && (
                    <View style={[styles.line, (isCompleted || isCurrent) && styles.lineActive]} />
                  )}
                </View>
                
                <View style={styles.timelineRight}>
                  <Text style={styles.stepIcon}>{step.icon}</Text>
                  <View>
                    <Text style={[
                      styles.stepTitle, 
                      isPending && styles.stepTitlePending
                    ]}>{step.title}</Text>
                    <Text style={styles.stepDesc}>{step.desc}</Text>
                  </View>
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
  header: { padding: 16, backgroundColor: '#ffffff', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#ffffff' },
  headerTitle: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  backBtnIcon: { color: '#0f172a', fontSize: 24 },
  
  scrollContent: { padding: 16 },
  
  mapContainer: { height: 200, backgroundColor: '#ffffff', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#e2e8f0' },
  mapEmoji: { fontSize: 48, marginBottom: 12 },
  mapText: { color: '#64748b', fontSize: 13, textAlign: 'center', paddingHorizontal: 20 },
  
  etaCard: { backgroundColor: '#3b82f6', borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 32 },
  etaTitle: { color: '#bfdbfe', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  etaTime: { color: '#0f172a', fontSize: 32, fontWeight: '900', marginBottom: 4 },
  etaSubtitle: { color: '#dbeafe', fontSize: 14 },
  
  timelineContainer: { paddingHorizontal: 16 },
  timelineStep: { flexDirection: 'row', marginBottom: 0, minHeight: 70 },
  
  timelineLeft: { alignItems: 'center', width: 40 },
  node: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center', zIndex: 10 },
  nodeCompleted: { backgroundColor: '#10b981' },
  nodeCurrent: { backgroundColor: '#3b82f6', borderWidth: 4, borderColor: 'rgba(59, 130, 246, 0.3)' },
  nodePending: { backgroundColor: '#e2e8f0' },
  line: { width: 2, flex: 1, backgroundColor: '#e2e8f0', marginVertical: -4 },
  lineActive: { backgroundColor: '#10b981' },
  
  timelineRight: { flex: 1, flexDirection: 'row', paddingBottom: 24, paddingLeft: 16 },
  stepIcon: { fontSize: 24, marginRight: 16 },
  stepTitle: { color: '#0f172a', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  stepTitlePending: { color: '#64748b' },
  stepDesc: { color: '#64748b', fontSize: 13 }
});
