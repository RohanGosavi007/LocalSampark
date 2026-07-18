import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import OrderAlertService from '../services/OrderAlertService';

export default function OrderRingOverlay({ isVisible, orderData, onAccept, onDecline }) {
  const [timeLeft, setTimeLeft] = useState(60);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    let timer;
    if (isVisible) {
      setTimeLeft(60);
      OrderAlertService.startRing(orderData?.type === 'Appointment' ? 'appointment' : 'order');
      
      // Countdown timer
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onDecline(true); // auto-decline
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      OrderAlertService.stopRing();
      pulseAnim.stopAnimation();
      if (timer) clearInterval(timer);
    }

    return () => {
      OrderAlertService.stopRing();
      if (timer) clearInterval(timer);
    };
  }, [isVisible, orderData, onDecline, pulseAnim]);

  if (!isVisible || !orderData) return null;

  return (
    <Modal visible={isVisible} transparent animationType="slide" onRequestClose={() => {}}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.alertBox, { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.alertTitle}>🚨 New {orderData.type || 'Order'}! 🚨</Text>
          <Text style={styles.timerText}>00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}</Text>
          
          <View style={styles.orderDetails}>
            <Text style={styles.orderId}>ID: {orderData.id}</Text>
            <Text style={styles.amount}>{orderData.amount}</Text>
            <Text style={styles.items}>{orderData.items}</Text>
            {orderData.customer && <Text style={styles.customer}>👤 {orderData.customer}</Text>}
            {orderData.time && <Text style={styles.customer}>🕒 {orderData.time}</Text>}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.declineBtn} onPress={() => onDecline(false)}>
              <Text style={styles.btnText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
              <Text style={styles.btnText}>ACCEPT</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  alertBox: { width: '100%', backgroundColor: '#ffffff', borderRadius: 24, padding: 30, alignItems: 'center', borderWidth: 2, borderColor: '#ef4444' },
  alertTitle: { color: '#ef4444', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  timerText: { color: '#0f172a', fontSize: 40, fontWeight: 'bold', fontFamily: 'monospace', marginBottom: 20 },
  orderDetails: { backgroundColor: '#ffffff', width: '100%', padding: 20, borderRadius: 16, marginBottom: 30, alignItems: 'center' },
  orderId: { color: '#64748b', fontSize: 14, marginBottom: 8 },
  amount: { color: '#10b981', fontSize: 32, fontWeight: '900', marginBottom: 8 },
  items: { color: '#64748b', fontSize: 16, textAlign: 'center', marginBottom: 8 },
  customer: { color: '#475569', fontSize: 14, marginTop: 4 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 16 },
  declineBtn: { flex: 1, backgroundColor: '#e2e8f0', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  acceptBtn: { flex: 2, backgroundColor: '#10b981', paddingVertical: 18, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#0f172a', fontSize: 18, fontWeight: 'bold' }
});
