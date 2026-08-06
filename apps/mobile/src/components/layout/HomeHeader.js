import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme/theme';

const HomeHeader = ({ currentLocation = "Pune, Maharashtra" }) => {
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={styles.container}>
      {/* Top Row: Location & Actions */}
      <View style={styles.topRow}>
        <TouchableOpacity style={styles.locationContainer} activeOpacity={0.7}>
          <Animated.View style={[styles.locationIcon, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="location" size={20} color={theme.colors.primary} />
          </Animated.View>
          <View style={styles.locationTextContainer}>
            <Text style={styles.locationTitle}>Current Location <Ionicons name="chevron-down" size={12} color={theme.colors.textSecondary} /></Text>
            <Text style={styles.locationSubtitle} numberOfLines={1}>{currentLocation}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.notificationButton} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.textPrimary} />
          <View style={styles.badge} />
        </TouchableOpacity>
      </View>

      {/* Bottom Row: Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={theme.colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for 'Groceries', 'Plumber'..."
          placeholderTextColor={theme.colors.textTertiary}
        />
        <View style={styles.searchDivider} />
        <TouchableOpacity style={styles.micButton}>
          <Ionicons name="mic" size={20} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl, // Assume safe area handled outside or adjusted
    paddingBottom: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationIcon: {
    marginRight: theme.spacing.sm,
  },
  locationTextContainer: {
    flex: 1,
  },
  locationTitle: {
    ...theme.typography.body2,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  locationSubtitle: {
    ...theme.typography.caption,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  notificationButton: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.round,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    backgroundColor: theme.colors.error,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.surface,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body1,
    color: theme.colors.textPrimary,
    height: '100%',
  },
  searchDivider: {
    width: 1,
    height: 24,
    backgroundColor: theme.colors.border,
    marginHorizontal: theme.spacing.sm,
  },
  micButton: {
    padding: theme.spacing.xs,
  },
});

export default HomeHeader;
