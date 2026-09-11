import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ShoppingBag, ChevronRight } from 'lucide-react-native';
import { useCartStore } from '../../store/cartStore';
import tokens from '../../theme/design-tokens';

const { commerce, radius } = tokens;

/**
 * Persistent cart bar — the defining quick-commerce pattern.
 *
 * This replaces an inline block in DynamicSuperAppShopScreen that had three
 * problems, all of which are fixed here:
 *
 *   1. It showed `cart.length` labelled "ITEMS" — the number of distinct line
 *      entries, not units. Three of one product read "1 ITEMS". The store has
 *      always exposed getItemCount(); it simply was not used.
 *   2. It displayed `(cartTotal + 3500) / 100`, folding a hardcoded ₹35
 *      delivery fee into the headline figure. The real fee depends on distance,
 *      basket value and the shop's own rules, none of which are known on this
 *      screen — so the bar quoted a number nobody had calculated. It now shows
 *      the basket subtotal and says so.
 *   3. It lived on one screen, so the cart vanished the moment you navigated.
 *
 * Deliberately flat: one accent, a hairline, a soft lift, no glow or gradient.
 * On a product grid the photography should be the brightest thing on screen.
 *
 * @param {() => void} onPress            navigate to checkout
 * @param {string}     [deliveryEstimate] e.g. "12 min" — omitted when unknown
 *                                        rather than guessed
 */
export default function StickyCartBar({ onPress, deliveryEstimate }) {
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const getItemCount = useCartStore((s) => s.getItemCount);
  const getCartTotal = useCartStore((s) => s.getCartTotal);
  const shopName = useCartStore((s) => s.currentShopName);

  const unitCount = getItemCount();
  const subtotal = getCartTotal();
  const visible = items.length > 0;

  // Entrance is a spring off the bottom edge; the bar should feel like it was
  // always there rather than fading in over the content.
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = visible
      ? withSpring(1, { damping: 18, stiffness: 180, mass: 0.6 })
      : withTiming(0, { duration: 160, easing: Easing.in(Easing.quad) });
  }, [visible, progress]);

  // A small pop each time the unit count changes, so adding from the grid is
  // acknowledged without a toast covering the product.
  const pop = useSharedValue(0);
  useEffect(() => {
    if (!unitCount) return;
    pop.value = 0;
    pop.value = withSpring(1, { damping: 12, stiffness: 320 });
    Haptics.selectionAsync().catch(() => {});
  }, [unitCount, pop]);

  const barStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: interpolate(progress.value, [0, 1], [96, 0]) }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(pop.value, [0, 0.5, 1], [1, 1.18, 1]) }],
  }));

  // Unmounted rather than hidden, so it never intercepts taps when empty.
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.wrap,
        // Sit above the home indicator, not under it.
        { paddingBottom: Math.max(insets.bottom, commerce.dock.inset) },
        barStyle,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`Cart: ${unitCount} ${unitCount === 1 ? 'item' : 'items'}, subtotal ₹${subtotal.toFixed(2)}`}
    >
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          onPress?.();
        }}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
        accessibilityRole="button"
        accessibilityLabel="Go to checkout"
      >
        <Animated.View style={[styles.badge, badgeStyle]}>
          <ShoppingBag size={18} color={commerce.actionInk} />
          <View style={styles.count}>
            {/* Singular/plural, and units rather than line entries. */}
            <Text style={styles.countText}>{unitCount}</Text>
          </View>
        </Animated.View>

        <View style={styles.meta}>
          <Text style={styles.subtotal} numberOfLines={1}>
            ₹{subtotal.toFixed(2)}
          </Text>
          <Text style={styles.caption} numberOfLines={1}>
            {/* Never asserts a delivery time or fee the caller did not supply. */}
            {[
              'Subtotal',
              deliveryEstimate ? `${deliveryEstimate} away` : null,
              shopName,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        </View>

        <View style={styles.cta}>
          <Text style={styles.ctaText}>Checkout</Text>
          <ChevronRight size={18} color={commerce.actionInk} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: commerce.gap.row,
    paddingTop: commerce.gap.base,
    backgroundColor: 'transparent',
  },
  bar: {
    minHeight: commerce.dock.height,
    flexDirection: 'row',
    alignItems: 'center',
    gap: commerce.gap.row,
    paddingHorizontal: commerce.gap.block,
    paddingVertical: commerce.gap.row,
    borderRadius: radius.lg,
    backgroundColor: commerce.action,
    // A lift, not a glow.
    ...Platform.select({
      ios: {
        shadowColor: '#18181B',
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    }),
  },
  barPressed: { opacity: 0.92, transform: [{ scale: 0.995 }] },

  badge: { flexDirection: 'row', alignItems: 'center' },
  count: {
    marginLeft: -6,
    marginTop: -12,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: commerce.urgent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: commerce.actionInk,
    fontSize: 11,
    fontWeight: '800',
    // Keeps the badge from reflowing as the count crosses 9 → 10.
    fontVariant: commerce.price.fontVariant,
  },

  meta: { flex: 1 },
  subtotal: {
    color: commerce.actionInk,
    fontSize: 17,
    fontWeight: '800',
    fontVariant: commerce.price.fontVariant,
  },
  caption: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 1,
  },

  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { color: commerce.actionInk, fontSize: 15, fontWeight: '800' },
});
