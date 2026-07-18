import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { X, CheckCircle, RefreshCcw, Camera as CameraIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function ARVirtualTryOn({ item, onClose }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [snapshot, setSnapshot] = useState(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef(null);

  if (!permission) {
    return <View style={styles.container}><Text>Loading Camera...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>We need your permission to show the camera for AR Try-On.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant Permission</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.closeBtnTextOnly} onPress={onClose}>
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takeSnapshot = async () => {
    if (cameraRef.current) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync();
        setSnapshot(photo.uri);
      } catch (e) {
        console.error(e);
      }
      setIsCapturing(false);
    }
  };

  const retake = () => {
    setSnapshot(null);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AR Virtual Try-On</Text>
          <Text style={styles.headerSub}>Trying on: {item?.name || 'Aviator Glasses'}</Text>
        </View>
        <TouchableOpacity style={styles.closeIconBtn} onPress={onClose}>
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>

      {/* Camera View */}
      <View style={styles.cameraContainer}>
        {snapshot ? (
          <Image source={{ uri: snapshot }} style={styles.camera} />
        ) : (
          <CameraView 
            ref={cameraRef} 
            style={styles.camera} 
            facing="front"
          >
            {/* AR Overlay Mask */}
            <View style={styles.arOverlay}>
              <View style={styles.glassesMockup}>
                <View style={styles.lens} />
                <View style={styles.bridge} />
                <View style={styles.lens} />
              </View>
            </View>
            
            <View style={styles.faceGuide}>
              <View style={styles.guideOval} />
              <Text style={styles.guideText}>Align face here</Text>
            </View>
          </CameraView>
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        {snapshot ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
              <RefreshCcw color="#fff" size={20} />
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onClose}>
              <CheckCircle color="#fff" size={20} />
              <Text style={styles.acceptBtnText}>Looks Good!</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.captureWrapper}>
            <TouchableOpacity 
              style={styles.captureOuter} 
              onPress={takeSnapshot}
              disabled={isCapturing}
            >
              <View style={[styles.captureInner, isCapturing && styles.capturing]} />
            </TouchableOpacity>
            <Text style={styles.captureHint}>Tap to capture</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  permissionContainer: { flex: 1, backgroundColor: '#111827', justifyContent: 'center', alignItems: 'center', padding: 24 },
  permissionText: { color: '#fff', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  primaryBtn: { backgroundColor: '#4f46e5', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 16 },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  closeBtnTextOnly: { padding: 12 },
  closeText: { color: '#9ca3af', fontSize: 16 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSub: { color: '#9ca3af', fontSize: 12, marginTop: 4 },
  closeIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },

  cameraContainer: { flex: 1, backgroundColor: '#000', position: 'relative' },
  camera: { flex: 1 },
  
  arOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 2 },
  glassesMockup: { flexDirection: 'row', alignItems: 'center', transform: [{ translateY: -40 }] },
  lens: { width: 80, height: 50, borderWidth: 3, borderColor: '#4f46e5', borderRadius: 12, backgroundColor: 'rgba(79,70,229,0.1)' },
  bridge: { width: 20, height: 4, backgroundColor: '#4f46e5' },

  faceGuide: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  guideOval: { width: width * 0.7, height: width * 0.9, borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)', borderRadius: width, borderStyle: 'dashed' },
  guideText: { color: 'rgba(255,255,255,0.7)', position: 'absolute', bottom: '20%' },

  controls: { padding: 32, paddingBottom: 60, backgroundColor: '#000' },
  captureWrapper: { alignItems: 'center' },
  captureOuter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  capturing: { backgroundColor: '#d1d5db' },
  captureHint: { color: '#fff', marginTop: 12, fontSize: 14 },

  actionRow: { flexDirection: 'row', gap: 16 },
  retakeBtn: { flex: 1, backgroundColor: '#374151', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  retakeBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  acceptBtn: { flex: 1, backgroundColor: '#4f46e5', paddingVertical: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  acceptBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
