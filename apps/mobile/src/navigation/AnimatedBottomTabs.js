import React from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { theme } from '../theme/theme';
import { Home, ShoppingBag, User } from 'lucide-react-native';

const TabIcon = ({ name, isFocused, color }) => {
  if (name === 'Home') return <Home color={color} size={24} strokeWidth={isFocused ? 2.5 : 2} fill={isFocused ? color : 'none'} />;
  if (name === 'Cart') return <ShoppingBag color={color} size={24} strokeWidth={isFocused ? 2.5 : 2} fill={isFocused ? color : 'none'} />;
  if (name === 'Profile') return <User color={color} size={24} strokeWidth={isFocused ? 2.5 : 2} fill={isFocused ? color : 'none'} />;
  return <Home color={color} size={24} strokeWidth={isFocused ? 2.5 : 2} />;
};

export default function AnimatedBottomTabs({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBar}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const iconColor = isFocused ? theme.colors.primary : theme.colors.textSecondary;
        
        const { options } = descriptors[route.key];
        
        const scaleAnim = React.useRef(new Animated.Value(1)).current;

        const onPress = () => {
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.8, duration: 100, useNativeDriver: true }),
            Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true })
          ]).start();

          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate({ name: route.name, merge: true });
          }
        };

        return (
          <TouchableOpacity key={route.key} onPress={onPress} style={styles.tabItem} activeOpacity={0.8}>
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
               <TabIcon name={route.name} isFocused={isFocused} color={iconColor} />
            </Animated.View>
            {isFocused && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    position: 'absolute',
    bottom: theme.spacing.xl,
    left: theme.spacing.xl,
    right: theme.spacing.xl,
    borderRadius: theme.borderRadius.xl,
    height: 64,
    ...theme.shadows.lg,
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  tabItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    position: 'absolute',
    bottom: 8,
  },
});
