import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../app/theme';
import { MapPin, Bell, Search } from 'lucide-react-native';

export default function HomeHeader({ location = "Pune, MH" }) {
  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.locationPill}>
          <MapPin color={COLORS.primary} size={16} />
          <Text style={styles.locationText}>{location}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bellButton}>
          <Bell color={COLORS.text} size={20} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>
      <View style={styles.searchBar}>
        <Search color={COLORS.textMuted} size={18} />
        <Text style={styles.searchPlaceholder}>Search for "Groceries"</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    ...SHADOWS.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.pill,
  },
  locationText: {
    marginLeft: SPACING.xs,
    fontWeight: '700',
    color: COLORS.primary,
  },
  bellButton: {
    padding: SPACING.xs,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchPlaceholder: {
    marginLeft: SPACING.sm,
    color: COLORS.textMuted,
  },
});
