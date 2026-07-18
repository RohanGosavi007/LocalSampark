import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import DynamicIcon, { getCategoryIconInfo } from './DynamicIcon';

/**
 * GlassIcon — Animated glassmorphism icon wrapper (React Native)
 * Enhanced: Accepts categorySlug for auto-resolve from 55-category registry
 *
 * Usage:
 *   <GlassIcon icon={ShoppingCart} />                          // Direct icon component
 *   <GlassIcon categorySlug="grocery-supermarkets" />          // Auto-resolve from registry
 *   <GlassIcon categorySlug="pharmacy-healthcare" size={56} /> // Custom size
 */
export function GlassIcon({ 
  icon: Icon,
  categorySlug,
  iconName,
  iconColor = "#0D6EFD",
  bgColor = "rgba(13, 110, 253, 0.1)",
  borderColor = "rgba(13, 110, 253, 0.2)",
  size = 48,
  iconSize = 24,
  onPress,
  style 
}) {
  // If categorySlug provided, auto-resolve colors from registry
  let resolvedIconColor = iconColor;
  let resolvedBgColor = bgColor;
  let resolvedBorderColor = borderColor;

  if (categorySlug) {
    const catInfo = getCategoryIconInfo(categorySlug);
    if (catInfo?.color) {
      resolvedIconColor = catInfo.color;
      resolvedBgColor = catInfo.color + '18'; // ~10% opacity hex
      resolvedBorderColor = catInfo.color + '35'; // ~20% opacity hex
    }
  }

  const containerStyle = [
    styles.container,
    {
      width: size,
      height: size,
      backgroundColor: resolvedBgColor,
      borderColor: resolvedBorderColor,
      borderRadius: size / 4,
    },
    style
  ];

  // Determine what to render inside
  const renderIcon = () => {
    if (categorySlug) {
      return (
        <DynamicIcon
          categorySlug={categorySlug}
          size={iconSize}
          color={resolvedIconColor}
        />
      );
    }
    if (iconName) {
      return <DynamicIcon name={iconName} size={iconSize} color={resolvedIconColor} />;
    }
    if (Icon) {
      return <Icon size={iconSize} color={resolvedIconColor} />;
    }
    return null;
  };

  const content = (
    <View style={containerStyle}>
      {renderIcon()}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  }
});
