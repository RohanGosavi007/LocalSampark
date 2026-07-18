import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform } from 'react-native';

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

  // Trigger a new order
  const triggerNewOrder = (orderData) => {
    setIncomingOrder(orderData || {
      id: `ORD-${Math.floor(Math.random() * 10000)}`,
      customer: 'Priya Sharma',
      amount: '₹850',
      items: 4,
      time: 'Just now'
    });
    playSound();
  };

  const acceptOrder = () => {
    stopSound();
    setIncomingOrder(null);
    // Ideally update backend status here
  };

  const declineOrder = () => {
    stopSound();
    setIncomingOrder(null);
    // Ideally update backend status here
  };

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
