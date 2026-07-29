import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';

// Mock Socket for demonstration
// In production, this would use socket.io-client connecting to TrackingGateway
const MockSocket = {
  on: (event, callback) => {
    if (event === 'driver:location:update') {
      // Simulate driver moving towards destination
      setInterval(() => {
        callback({
          lat: 18.5913 + (Math.random() * 0.001),
          lng: 73.8987 + (Math.random() * 0.001),
          speed: 45, // km/h
          heading: 90
        });
      }, 3000);
    }
  }
};

/**
 * Mobile Interactive Delivery Tracking Stepper & Live Map Visualizer
 */
const OrderTrackingView = ({ orderId, driverName = "Rajesh" }) => {
  const [driverLocation, setDriverLocation] = useState(null);
  const [status, setStatus] = useState('out_for_delivery'); // pending -> accepted -> preparing -> out_for_delivery -> delivered

  useEffect(() => {
    // Subscribe to driver location stream via WebSocket
    MockSocket.on('driver:location:update', (data) => {
      setDriverLocation(data);
    });
  }, [orderId]);

  // Reanimated style for smooth marker interpolation (simulating 60FPS marker movement)
  const animatedMarkerStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(1, { duration: 500, easing: Easing.ease }),
      transform: [
        { translateY: withTiming(0, { duration: 1000 }) }
      ]
    };
  });

  return (
    <View style={styles.container}>
      <View style={styles.mapContainer}>
        {/* Placeholder for MapView (e.g. react-native-maps) */}
        <View style={styles.mapMock}>
          <Text style={styles.mapText}>Live Map Tracking</Text>
          {driverLocation && (
            <Animated.View style={[styles.driverMarker, animatedMarkerStyle]}>
              <Text style={styles.driverText}>🚚</Text>
            </Animated.View>
          )}
        </View>
      </View>

      <View style={styles.stepperContainer}>
        <Text style={styles.title}>Delivery Status</Text>
        <View style={styles.step}>
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.stepText}>Order Accepted</Text>
        </View>
        <View style={styles.line} />
        <View style={styles.step}>
          <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
          <Text style={styles.stepText}>Preparing Package</Text>
        </View>
        <View style={styles.line} />
        <View style={styles.step}>
          <View style={[styles.dot, status === 'out_for_delivery' ? '#10b981' : '#e5e7eb']} />
          <Text style={[styles.stepText, status === 'out_for_delivery' && styles.activeStep]}>
            Out for Delivery ({driverName})
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    height: 300,
    backgroundColor: '#f3f4f6',
  },
  mapMock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  mapText: {
    color: '#6b7280',
    fontWeight: 'bold'
  },
  driverMarker: {
    position: 'absolute',
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  driverText: {
    fontSize: 20
  },
  stepperContainer: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  stepText: {
    fontSize: 16,
    color: '#4b5563',
  },
  activeStep: {
    color: '#111827',
    fontWeight: 'bold'
  },
  line: {
    width: 2,
    height: 30,
    backgroundColor: '#e5e7eb',
    marginLeft: 7,
    marginVertical: 4,
  }
});

export default OrderTrackingView;
