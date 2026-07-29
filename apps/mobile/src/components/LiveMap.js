import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';

// Crash-safe native module imports with fallbacks
let MapView = null;
let Marker = null;
let UrlTile = null;
let Location = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  UrlTile = maps.UrlTile;
} catch (e) {
  console.warn('[LiveMap] react-native-maps not available:', e.message);
}

try {
  Location = require('expo-location');
} catch (e) {
  console.warn('[LiveMap] expo-location not available:', e.message);
}

export default function LiveMap({ destinationCoords, onLocationUpdate }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!Location) {
      setErrorMsg('Location services not available');
      return;
    }

    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
      if (onLocationUpdate) {
        onLocationUpdate(loc.coords);
      }

      // Subscribe to location updates
      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        (newLoc) => {
          setLocation(newLoc.coords);
          if (onLocationUpdate) {
            onLocationUpdate(newLoc.coords);
          }
        }
      );

      return () => {
        if (subscription) {
          subscription.remove();
        }
      };
    })();
  }, [onLocationUpdate]);

  if (errorMsg) {
    return <View style={styles.center}><Text style={styles.error}>{errorMsg}</Text></View>;
  }

  if (!location) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#3b82f6" /></View>;
  }

  // If react-native-maps failed to load, show a text-based fallback
  if (!MapView) {
    return (
      <View style={styles.center}>
        <Text style={styles.fallbackTitle}>📍 Live Location</Text>
        <Text style={styles.fallbackCoords}>
          Lat: {location.latitude.toFixed(6)}{'\n'}
          Lng: {location.longitude.toFixed(6)}
        </Text>
        <Text style={styles.fallbackNote}>Map view unavailable — native maps module not linked</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView 
        style={styles.map}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        mapType="none" // Important for OpenStreetMap
      >
        {UrlTile && (
          <UrlTile
            urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maximumZ={19}
            flipY={false}
          />
        )}
        
        {/* Agent's Current Location */}
        {Marker && (
          <Marker
            coordinate={{ latitude: location.latitude, longitude: location.longitude }}
            title="You"
            pinColor="blue"
          />
        )}

        {/* Destination Location */}
        {destinationCoords && Marker && (
          <Marker
            coordinate={destinationCoords}
            title="Destination"
            pinColor="red"
          />
        )}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden'
  },
  map: {
    width: '100%',
    height: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12
  },
  error: {
    color: '#ef4444',
    textAlign: 'center',
    padding: 20
  },
  fallbackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 8,
  },
  fallbackCoords: {
    fontSize: 14,
    color: '#3b82f6',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  fallbackNote: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
