import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import MapView, { Marker, UrlTile } from 'react-native-maps';
import * as Location from 'expo-location';

export default function LiveMap({ destinationCoords, onLocationUpdate }) {
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
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
        <UrlTile
          urlTemplate="https://a.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maximumZ={19}
          flipY={false}
        />
        
        {/* Agent's Current Location */}
        <Marker
          coordinate={{ latitude: location.latitude, longitude: location.longitude }}
          title="You"
          pinColor="blue"
        />

        {/* Destination Location */}
        {destinationCoords && (
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
  }
});
