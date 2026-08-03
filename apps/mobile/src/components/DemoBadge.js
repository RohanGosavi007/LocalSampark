import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DEV_CONFIG } from '../config/devMode';

/**
 * DemoBadge — Shows a small floating badge when a screen is displaying mock/fallback data.
 * Only visible when DEV_CONFIG.SHOW_DEMO_BADGE is true.
 * 
 * Usage: <DemoBadge visible={isUsingMockData} />
 */
export default function DemoBadge({ visible = false, label = 'DEMO DATA' }) {
  if (!visible || !DEV_CONFIG.SHOW_DEMO_BADGE) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>🔧 {label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    right: 12,
    backgroundColor: 'rgba(245, 158, 11, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 9999,
    elevation: 10,
  },
  text: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
