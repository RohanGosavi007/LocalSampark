import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform , Alert } from 'react-native';
import { apiPut } from '../lib/api';

// Dynamic import of expo-av to prevent crash if native module is missing
let Audio = null;
try {
  Audio = require('expo-av').Audio;
} catch (e) {
  console.warn('expo-av not available, audio features disabled:', e.message);
}

import OrderRingOverlay from '../components/OrderRingOverlay';

const OrderRingerContext = createContext();

export function OrderRingerProvider({ children }) {
  const [incomingOrder, setIncomingOrder] = useState(null);
  const [sound, setSound] = useState();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Use a free sound URI for ringing (using a reliable generic beep or ringing URI)
  const RING_URI = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

  // Pulse animation for the UI
  useEffect(() => {
    if (incomingOrder) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [incomingOrder]);

  async function playSound() {
    if (!Audio) return; // Skip if expo-av not available
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: RING_URI },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      setSound(newSound);
    } catch (error) {
      console.warn('Could not play ringer sound', error);
    }
  }

  async function stopSound() {
    if (sound) {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(undefined);
    }
  }

  useEffect(() => {
    return sound ? () => { stopSound(); } : undefined;
  }, [sound]);

  /**
   * Ring the merchant for an incoming order.
   *
   * Called with no argument this used to invent one — a random order number for
   * "Priya Sharma, ₹850, 4 items" — and sound the new-order alarm. A merchant
   * would be pulled to the counter by a ringing phone for an order that did not
   * exist, and would have no way to tell it from a real one.
   *
   * There is now nothing to ring about unless a real order is passed in.
   */
  const triggerNewOrder = (orderData) => {
    if (!orderData || !orderData.id) {
      console.warn('[OrderRinger] triggerNewOrder called without an order; ignoring.');
      return;
    }
    setIncomingOrder(orderData);
    playSound();
  };

  /**
   * Accept and decline both said "Ideally update backend status here" and did
   * not: the overlay closed, the alarm stopped, and the order stayed exactly as
   * it was on the server. A merchant who accepted an order had not accepted it,
   * and a customer waiting on that acceptance was never told.
   */
  const respondToOrder = async (orderId, status) => {
    stopSound();
    setIncomingOrder(null);
    try {
      await apiPut(`/shops/my-shop/orders/${orderId}/status`, { status });
    } catch (err) {
      // The merchant has to know the server did not take it, or they will start
      // preparing an order the customer still sees as pending.
      Alert.alert(
        status === 'accepted' ? 'Order not accepted' : 'Order not declined',
        `${err?.message || 'The update could not be sent.'} Open the order and try again.`
      );
    }
  };

  const acceptOrder = () => respondToOrder(incomingOrder?.id, 'accepted');
  const declineOrder = () => respondToOrder(incomingOrder?.id, 'cancelled');

  return (
    <OrderRingerContext.Provider value={{ triggerNewOrder }}>
      {children}
      
      <OrderRingOverlay 
        isVisible={!!incomingOrder} 
        orderData={incomingOrder} 
        onAccept={acceptOrder} 
        onDecline={declineOrder}
      />
    </OrderRingerContext.Provider>
  );
}

export function useOrderRinger() {
  return useContext(OrderRingerContext);
}
