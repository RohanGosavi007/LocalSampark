import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';

export default function EmergencyTab({ role }) {
  const [activeEmergency, setActiveEmergency] = useState(false);

  const triggerSOS = () => {
    setActiveEmergency(true);
    Alert.alert(
      "SOS Triggered",
      "Emergency alert sent to Security Guards and Society Admins!",
      [{ text: "OK" }]
    );
  };

  const cancelSOS = () => {
    setActiveEmergency(false);
  };

  return (
    <View style={styles.container}>
      {!activeEmergency ? (
        <View style={styles.idleState}>
          <Text style={styles.title}>🚨 Emergency / SOS</Text>
          <Text style={styles.subtitle}>
            Press the button below only in case of a severe emergency. 
            This will immediately alert all guards and admins.
          </Text>
          
          <TouchableOpacity style={styles.sosButton} onPress={triggerSOS}>
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.activeState}>
          <Text style={styles.activeIcon}>🚨</Text>
          <Text style={styles.activeTitle}>EMERGENCY TRIGGERED</Text>
          <Text style={styles.activeSubtitle}>Security is on the way to your location.</Text>
          
          <TouchableOpacity style={styles.cancelButton} onPress={cancelSOS}>
            <Text style={styles.cancelText}>Mark as Resolved</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    minHeight: 300,
    justifyContent: 'center'
  },
  idleState: {
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  sosButton: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 6,
    borderColor: '#fee2e2'
  },
  sosText: {
    color: '#ffffff',
    fontSize: 42,
    fontWeight: '900',
  },

  activeState: {
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 24,
    borderRadius: 16,
  },
  activeIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#dc2626',
    marginBottom: 8,
    textAlign: 'center',
  },
  activeSubtitle: {
    fontSize: 16,
    color: '#991b1b',
    textAlign: 'center',
    marginBottom: 24,
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#dc2626'
  },
  cancelText: {
    color: '#dc2626',
    fontWeight: 'bold',
    fontSize: 16,
  }
});
