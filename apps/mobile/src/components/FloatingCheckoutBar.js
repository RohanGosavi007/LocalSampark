import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { ShoppingBag, ChevronRight } from 'lucide-react-native';

/**
 * Sticky Floating Express Checkout Bar.
 * Appears dynamically when items are in the cart to encourage immediate conversion.
 */
export default function FloatingCheckoutBar({ itemCount = 2, totalAmount = 345, onPress }) {
  // Simple slide-up animation entry could be added here
  
  if (itemCount === 0) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.floatingBar} 
        activeOpacity={0.9} 
        onPress={onPress}
      >
        <View style={styles.leftContent}>
          <View style={styles.iconBadge}>
            <ShoppingBag color="#fff" size={20} />
            <View style={styles.badgeCircle}>
              <Text style={styles.badgeText}>{itemCount}</Text>
            </View>
          </View>
          <View>
            <Text style={styles.amountText}>₹{totalAmount}</Text>
            <Text style={styles.subText}>Extra ₹15 off applied</Text>
          </View>
        </View>

        <View style={styles.rightContent}>
          <Text style={styles.viewCartText}>View Cart</Text>
          <ChevronRight color="#fff" size={20} />
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80, // Sits exactly above the bottom tab navigator
    left: 16,
    right: 16,
    zIndex: 100,
  },
  floatingBar: {
    backgroundColor: '#00B074', // Emerald Green CTA
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#00B074',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBadge: {
    position: 'relative',
    marginRight: 12,
  },
  badgeCircle: {
    position: 'absolute',
    top: -6,
    right: -8,
    backgroundColor: '#FF5E00', // Deep Orange Badge
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#00B074',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  amountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  subText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 11,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewCartText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 15,
  }
});
