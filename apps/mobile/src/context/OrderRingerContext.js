import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated, Platform, Alert, Vibration } from 'react-native';
import { apiPut } from '../lib/api';

/**
 * Audio playback moved from expo-av to expo-audio.
 *
 * expo-av is deprecated in Expo SDK 54 and is scheduled for removal, at which
 * point the require below would have started failing and the merchant's
 * new-order alarm would have gone silent with nothing but a console warning.
 * The dynamic require is kept because it is what stops a missing native module
 * from taking down the whole provider at import time.
 *
 * The option names are not the same between the two packages, so they are
 * translated here rather than carried over:
 *   allowsRecordingIOS       -> allowsRecording
 *   staysActiveInBackground  -> shouldPlayInBackground
 *   playsInSilentModeIOS     -> playsInSilentMode
 *   shouldDuckAndroid: true  -> interruptionModeAndroid: 'duckOthers'
 *   playThroughEarpieceAndroid: false -> shouldRouteThroughEarpiece: false
 */
let ExpoAudio = null;
try {
  ExpoAudio = require('expo-audio');
} catch (e) {
  console.warn('expo-audio not available, falling back to vibration only:', e.message);
}

import OrderRingOverlay from '../components/OrderRingOverlay';

const OrderRingerContext = createContext();

export function OrderRingerProvider({ children }) {
  const [incomingOrder, setIncomingOrder] = useState(null);
  // The player is held in a ref, not state. It is an imperative handle that no
  // render reads, and keeping it in state meant every ring re-rendered the whole
  // provider subtree -- including the merchant's current screen.
  const playerRef = useRef(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // NOTE: this is a third-party CDN. If mixkit is unreachable -- an offline
  // shop, a blocked domain, a DNS failure -- createAudioPlayer has nothing to
  // play and the merchant gets no audible alert at all, which for a new-order
  // alarm is a missed sale rather than a cosmetic bug. The vibration fallback
  // below covers that case. Bundling a short ringtone under assets/ and
  // require()-ing it would remove the dependency entirely and is the right
  // long-term fix.
  const RING_URI = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

  // A repeating pattern, so the merchant keeps being nudged for as long as the
  // order is un-answered rather than getting one buzz they can miss.
  const VIBRATION_PATTERN = [0, 600, 400];

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
    // Vibrate first and unconditionally. Audio is the part that can fail (no
    // native module, no network, silent mode); vibration is the floor that
    // guarantees the merchant is alerted at all.
    try {
      Vibration.vibrate(VIBRATION_PATTERN, true);
    } catch {
      // Vibration is unsupported on some devices and on web; never fatal.
    }

    if (!ExpoAudio) return;

    try {
      await ExpoAudio.setAudioModeAsync({
        allowsRecording: false,
        shouldPlayInBackground: true,
        playsInSilentMode: true,
        interruptionModeAndroid: 'duckOthers',
        shouldRouteThroughEarpiece: false,
      });

      // Replace any player still alive from a previous order, otherwise two
      // orders in quick succession leave two loops ringing over each other with
      // only the second one reachable to stop.
      await stopSound({ keepVibrating: true });

      const player = ExpoAudio.createAudioPlayer({ uri: RING_URI });
      player.loop = true;
      player.volume = 1.0;
      player.play();
      playerRef.current = player;
    } catch (error) {
      console.warn('Could not play ringer sound; vibration alert still active.', error);
    }
  }

  async function stopSound({ keepVibrating = false } = {}) {
    if (!keepVibrating) {
      try {
        Vibration.cancel();
      } catch {
        // See above.
      }
    }

    const player = playerRef.current;
    if (!player) return;
    playerRef.current = null;
    try {
      player.pause();
      // remove() releases the native player. Without it each order leaks one.
      player.remove();
    } catch (error) {
      console.warn('Could not stop ringer sound', error);
    }
  }

  // Stop the alarm if the provider unmounts while an order is still ringing.
  useEffect(() => {
    return () => { stopSound(); };
  }, []);

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
