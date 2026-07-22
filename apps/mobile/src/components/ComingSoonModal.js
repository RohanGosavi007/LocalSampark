import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';

export default function ComingSoonModal({ visible, onClose, data, userPincode, API_BASE }) {
  const [notified, setNotified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!visible || !data) return null;

  const headline = data.coming_soon?.headline || 'Feature Launching Soon!';
  const message = data.coming_soon?.message || 'We are actively expanding this service to your neighborhood. Stay tuned!';
  const featureKey = data.feature_key || 'unknown';

  const handleNotifyMe = async () => {
    setSubmitting(true);
    try {
      if (API_BASE) {
        await fetch(`${API_BASE}/gtm/interest-lead`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_key: featureKey,
            pincode: userPincode || 'unknown'
          })
        });
      }
      setNotified(true);
    } catch (e) {
      console.warn('Could not record interest lead:', e);
      setNotified(true); // Graceful fallback
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.iconCircle}>
            <Text style={styles.iconText}>🚀</Text>
          </View>

          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.message}>{message}</Text>

          {userPincode && (
            <View style={styles.pincodeBadge}>
              <Text style={styles.pincodeText}>📍 Target Pincode: {userPincode}</Text>
            </View>
          )}

          {notified ? (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✓ Thanks! We'll notify you first when it launches in your area.</Text>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.notifyBtn} 
              onPress={handleNotifyMe} 
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.notifyBtnText}>🔔 Notify Me When Available</Text>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeBtnText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(79, 70, 229, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16
  },
  iconText: {
    fontSize: 32
  },
  headline: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 8
  },
  message: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16
  },
  pincodeBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155'
  },
  pincodeText: {
    fontSize: 12,
    color: '#38bdf8',
    fontWeight: '600'
  },
  notifyBtn: {
    width: '100%',
    backgroundColor: '#4f46e5',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12
  },
  notifyBtnText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  successBanner: {
    width: '100%',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    padding: 12,
    borderRadius: 12,
    marginBottom: 12
  },
  successText: {
    color: '#34d399',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center'
  },
  closeBtn: {
    paddingVertical: 8
  },
  closeBtnText: {
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600'
  }
});
