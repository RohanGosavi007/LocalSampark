import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';

// Mock barcode scanner import since expo-barcode-scanner might not be installed
// import { BarcodeScanner } from 'expo-barcode-scanner';

export default function BarcodeScannerView({ shopLocation, onScan }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isNearShop, setIsNearShop] = useState(false);
  const [locationStatus, setLocationStatus] = useState('Checking proximity...');

  useEffect(() => {
    (async () => {
      // Mock permission request
      setHasPermission(true);
      
      // Real implementation would request Location permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationStatus('Location permission denied');
        return;
      }
      
      let location = await Location.getCurrentPositionAsync({});
      
      if (shopLocation && shopLocation.lat && shopLocation.lng) {
        // Calculate distance (Haversine)
        const R = 6371e3; // metres
        const φ1 = location.coords.latitude * Math.PI/180;
        const φ2 = shopLocation.lat * Math.PI/180;
        const Δφ = (shopLocation.lat - location.coords.latitude) * Math.PI/180;
        const Δλ = (shopLocation.lng - location.coords.longitude) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c; // in metres
        
        if (distance <= 100) { // Within 100 meters
          setIsNearShop(true);
          setLocationStatus('In store');
        } else {
          setIsNearShop(false);
          setLocationStatus(`You are ${Math.round(distance)}m away. Must be <100m to scan.`);
        }
      } else {
        // Mock fallback for testing
        setIsNearShop(true);
        setLocationStatus('In store (Mock)');
      }
    })();
  }, [shopLocation]);

  const handleSimulatedScan = () => {
    if (!isNearShop) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onScan && onScan({ data: '8901262010188', type: 'EAN-13' });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Scan Product Barcode</Text>
      
      <View style={[styles.statusBox, isNearShop ? styles.statusOk : styles.statusError]}>
        <Text style={[styles.statusText, isNearShop ? styles.textOk : styles.textError]}>
          {isNearShop ? '📍 You are inside the store' : '⚠️ Too far from store'}
        </Text>
        <Text style={styles.subText}>{locationStatus}</Text>
      </View>

      <View style={styles.cameraBox}>
        <Text style={styles.cameraIcon}>📷</Text>
        <Text style={styles.cameraText}>Camera Viewport</Text>
        <TouchableOpacity 
          style={[styles.simBtn, !isNearShop && { opacity: 0.5 }]} 
          onPress={handleSimulatedScan}
          disabled={!isNearShop}
        >
          <Text style={styles.simBtnText}>Simulate Successful Scan</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  statusBox: { padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1 },
  statusOk: { backgroundColor: '#ECFDF5', borderColor: '#10B981' },
  statusError: { backgroundColor: '#FEF2F2', borderColor: '#EF4444' },
  statusText: { fontSize: 16, fontWeight: 'bold' },
  textOk: { color: '#047857' },
  textError: { color: '#B91C1C' },
  subText: { fontSize: 12, color: '#64748b', marginTop: 4 },
  cameraBox: { height: 300, backgroundColor: '#1e293b', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { fontSize: 48, marginBottom: 16 },
  cameraText: { color: '#ffffff', opacity: 0.5 },
  simBtn: { marginTop: 40, backgroundColor: '#3b82f6', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  simBtnText: { color: '#ffffff', fontWeight: 'bold' }
});
