import React from 'react';
import Svg, { Rect, Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

/**
 * Zomato/Swiggy/Zepto style rich colorful icons for React Native.
 */

export const StoreIcon = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Rect x="8" y="32" width="48" height="28" rx="4" fill="#F97316"/>
    <Path d="M4 24L12 8H52L60 24V32H4V24Z" fill="#FB923C"/>
    <Rect x="24" y="40" width="16" height="20" rx="2" fill="#FFF7ED"/>
    <Circle cx="16" cy="46" r="4" fill="#FFEDD5"/>
    <Circle cx="48" cy="46" r="4" fill="#FFEDD5"/>
  </Svg>
);

export const ProduceIcon = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Circle cx="32" cy="36" r="20" fill="#10B981"/>
    <Path d="M32 16C36 8 44 8 44 16C44 24 32 24 32 24C32 24 20 24 20 16C20 8 28 8 32 16Z" fill="#059669"/>
  </Svg>
);

export const DeliveryIcon = ({ size = 64 }) => (
  <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
    <Path d="M4 40H44V20H16L4 30V40Z" fill="#5B21B6"/>
    <Rect x="44" y="24" width="16" height="16" rx="2" fill="#8B5CF6"/>
    <Circle cx="16" cy="44" r="6" fill="#1E1B4B"/>
    <Circle cx="40" cy="44" r="6" fill="#1E1B4B"/>
    <Path d="M28 28H36" stroke="#DDD6FE" strokeWidth="4" strokeLinecap="round"/>
  </Svg>
);
