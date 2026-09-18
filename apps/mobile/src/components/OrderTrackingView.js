import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import { useSocketEvent, useSocketRoom, useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';

/**
 * Live delivery tracking.
 *
 * This component used to define a `MockSocket` whose `driver:location:update`
 * handler pushed `18.5913 + Math.random() * 0.001` every three seconds. Anyone
 * watching the map was watching a random walk around a fixed point, presented
 * as a rider's position — including, in a demo, an investor.
 *
 * It now subscribes to the real server rooms. `orderSocket.js` and
 * `trackingSocket.js` broadcast to `order_<id>`, and a `join_order_room`
 * handler was added server-side (there was none, so those rooms had no
 * members and live tracking could not work for any client on any platform).
 *
 * Where there is no live fix yet, the component says so rather than inventing
 * one. "Waiting for the rider's location" is honest; a moving marker that is
 * not the rider is not.
 */
const STEPS = [
  { key: 'accepted', label: 'Order accepted' },
  { key: 'preparing', label: 'Preparing package' },
  { key: 'out_for_delivery', label: 'Out for delivery' },
  { key: 'delivered', label: 'Delivered' },
];

const ORDER = STEPS.map((s) => s.key);

const OrderTrackingView = ({ orderId, driverName }) => {
  const { theme } = useTheme();
  const { colors, radii, typography } = theme;
  const { isConnected } = useSocket();

  const [driverLocation, setDriverLocation] = useState(null);
  const [status, setStatus] = useState('accepted');

  // Join while mounted; the hook leaves the room on unmount.
  useSocketRoom('order', orderId);

  // Per-order event name, so a screen is not filtered out of a firehose of
  // every order on the platform.
  useSocketEvent(orderId ? `order_status_${orderId}` : null, (payload) => {
    if (payload?.status) setStatus(payload.status);
  });

  useSocketEvent('order_status_update', (payload) => {
    if (payload?.orderId === orderId && payload?.status) setStatus(payload.status);
  });

  useSocketEvent('driver:location:update', (payload) => {
    if (payload?.lat == null || payload?.lng == null) return;
    if (payload.orderId && payload.orderId !== orderId) return;
    setDriverLocation(payload);
  });

  const activeIndex = useMemo(() => {
    const i = ORDER.indexOf(status);
    return i === -1 ? 0 : i;
  }, [status]);

  const animatedMarkerStyle = useAnimatedStyle(() => ({
    opacity: withTiming(driverLocation ? 1 : 0, { duration: 400, easing: Easing.ease }),
    transform: [{ translateY: withTiming(driverLocation ? 0 : 12, { duration: 600 }) }],
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.ground }]}>
      <View style={[styles.mapContainer, { backgroundColor: colors.sunken }]}>
        <View style={styles.mapMock}>
          <Text style={[styles.mapText, { color: colors.textMuted }]}>
            {driverLocation
              ? `Rider at ${driverLocation.lat.toFixed(4)}, ${driverLocation.lng.toFixed(4)}`
              : isConnected
                ? 'Waiting for the rider’s location…'
                : 'Reconnecting…'}
          </Text>

          {driverLocation && (
            <Animated.View
              style={[
                styles.driverMarker,
                { backgroundColor: colors.surface1, borderColor: colors.border },
                animatedMarkerStyle,
              ]}
            >
              <Text style={styles.driverText}>🚚</Text>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.stepperContainer}>
        <Text style={[styles.title, { color: colors.text, fontSize: typography.size.lg }]}>
          Delivery status
        </Text>

        {STEPS.map((step, i) => {
          const done = i <= activeIndex;
          return (
            <View key={step.key}>
              {i > 0 && (
                <View
                  style={[
                    styles.line,
                    { backgroundColor: i <= activeIndex ? colors.success : colors.border },
                  ]}
                />
              )}
              <View style={styles.step}>
                {/* This was `style={[styles.dot, cond ? '#10b981' : '#e5e7eb']}` —
                    a bare colour string in a style array. React Native reads a
                    string there as a registered style id, so the colour was
                    never applied and the step never changed appearance. */}
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: done ? colors.success : colors.border },
                  ]}
                />
                <Text
                  style={[
                    styles.stepText,
                    { color: done ? colors.text : colors.textMuted },
                    i === activeIndex && styles.activeStep,
                  ]}
                >
                  {step.label}
                  {step.key === 'out_for_delivery' && driverName ? ` (${driverName})` : ''}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

// Layout only; colours come from the theme above so this sheet does not need
// rebuilding when the mode changes.
const styles = StyleSheet.create({
  container: { flex: 1 },
  mapContainer: { height: 300 },
  mapMock: { flex: 1, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  mapText: { fontWeight: '600' },
  driverMarker: {
    position: 'absolute',
    padding: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  driverText: { fontSize: 20 },
  stepperContainer: { padding: 20, gap: 4 },
  title: { fontWeight: '700', marginBottom: 16 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 32 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  line: { width: 2, height: 22, marginLeft: 6 },
  stepText: { fontSize: 15 },
  activeStep: { fontWeight: '700' },
});

export default OrderTrackingView;
