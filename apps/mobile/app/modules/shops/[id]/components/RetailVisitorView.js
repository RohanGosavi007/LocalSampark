import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function RetailVisitorView({ shop }) {
  return (
    <View style={styles.container}>
      <View style={styles.ocrCard}>
        <Text style={styles.ocrTitle}>📋 Smart List Order</Text>
        <Text style={styles.desc}>Upload a photo of your handwritten shopping list or type it out.</Text>
        
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.btnCamera}>
            <Text style={styles.btnCameraText}>📷 Capture / Upload</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnManual}>
            <Text style={styles.btnManualText}>⌨️ Type Manually</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>Order Type: 🏪 Self-Pickup Only (Bulk Order)</Text>
          <Text style={styles.infoText}>ETA: ~25 mins preparation time</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 16 },
  ocrCard: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 12 },
  ocrTitle: { fontSize: 18, fontWeight: 'bold', color: '#1e3a8a', marginBottom: 4 },
  desc: { color: '#3b82f6', fontSize: 14, marginBottom: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  btnCamera: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnCameraText: { color: '#fff', fontWeight: 'bold' },
  btnManual: { flex: 1, backgroundColor: '#fff', paddingVertical: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#3b82f6' },
  btnManualText: { color: '#3b82f6', fontWeight: 'bold' },
  infoBox: { backgroundColor: '#fff', padding: 12, borderRadius: 6, borderWidth: 1, borderColor: '#bfdbfe' },
  infoText: { color: '#1e40af', fontSize: 12, marginBottom: 4 }
});
