import React, { useCallback } from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Plus, Minus } from 'lucide-react-native';
import tokens from '../../theme/design-tokens';

const { commerce, radius } = tokens;

/**
 * ADD → stepper, in place, on the product tile.
 *
 * The pattern quick-commerce is built on: the first tap adds, and the button
 * becomes − 1 + without moving, opening a sheet, or navigating. A basket of ten
 * things costs ten taps rather than ten round trips through a product page.
 *
 * Deliberate details:
 *   - The control keeps a fixed width across both states, so a grid does not
 *     reflow when one tile switches to the stepper.
 *   - Tap targets meet the 44pt minimum even though the control looks compact.
 *   - Haptics differ by direction: a light tick on increment, a softer one on
 *     decrement, so the hand can tell them apart without looking.
 *   - Quantity uses tabular figures — 9 → 10 must not shift the layout.
 *
 * @param {number}   quantity      current quantity in the cart (0 = not added)
 * @param {Function} onAdd         first add
 * @param {Function} onIncrement
 * @param {Function} onDecrement
 * @param {boolean}  [disabled]    out of stock
 * @param {string}   [label]       accessible product name
 */
function QuickAddStepper({
  quantity = 0,
  onAdd,
  onIncrement,
  onDecrement,
  disabled = false,
  label = 'item',
}) {
  const scale = useSharedValue(1);
  const inCart = quantity > 0;

  const press = useCallback(() => {
    scale.value = withSpring(0.93, { damping: 14, stiffness: 420 }, () => {
      scale.value = withSpring(1, { damping: 12, stiffness: 320 });
    });
  }, [scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const widthStyle = useAnimatedStyle(() => ({
    // Both states share one width so the grid never reflows mid-interaction.
    width: withTiming(inCart ? 92 : 72, { duration: 140 }),
  }));

  const handleAdd = () => {
    if (disabled) return;
    press();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAdd?.();
  };

  const handleIncrement = () => {
    press();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onIncrement?.();
  };

  const handleDecrement = () => {
    press();
    Haptics.selectionAsync().catch(() => {});
    onDecrement?.();
  };

  if (!inCart) {
    return (
      <Animated.View style={[animStyle, widthStyle]}>
        <Pressable
          onPress={handleAdd}
          disabled={disabled}
          hitSlop={8}
          style={[styles.addBtn, disabled && styles.addBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel={disabled ? `${label} is out of stock` : `Add ${label} to cart`}
          accessibilityState={{ disabled }}
        >
          <Text style={[styles.addText, disabled && styles.addTextDisabled]}>
            {disabled ? 'OUT' : 'ADD'}
          </Text>
          {!disabled && <Plus size={13} color={commerce.action} strokeWidth={3} />}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.stepper, animStyle, widthStyle]}>
      <Pressable
        onPress={handleDecrement}
        hitSlop={10}
        style={styles.stepBtn}
        accessibilityRole="button"
        accessibilityLabel={quantity === 1 ? `Remove ${label} from cart` : `Decrease ${label} quantity`}
      >
        <Minus size={15} color={commerce.actionInk} strokeWidth={3} />
      </Pressable>

      <View style={styles.qtyWrap}>
        <Text style={styles.qty} accessibilityLiveRegion="polite">
          {quantity}
        </Text>
      </View>

      <Pressable
        onPress={handleIncrement}
        hitSlop={10}
        style={styles.stepBtn}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label} quantity`}
      >
        <Plus size={15} color={commerce.actionInk} strokeWidth={3} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    height: commerce.tap.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: commerce.action,
    backgroundColor: commerce.surface,
  },
  addBtnDisabled: {
    borderColor: commerce.hairline,
    backgroundColor: commerce.surfaceSunken,
  },
  addText: {
    color: commerce.action,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  addTextDisabled: { color: commerce.inkFaint },

  stepper: {
    height: commerce.tap.min,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.sm,
    backgroundColor: commerce.action,
    paddingHorizontal: 2,
  },
  stepBtn: {
    width: 30,
    height: commerce.tap.min,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyWrap: { minWidth: 22, alignItems: 'center' },
  qty: {
    color: commerce.actionInk,
    fontSize: 15,
    fontWeight: '800',
    fontVariant: commerce.price.fontVariant,
  },
});

// Re-renders on every cart mutation otherwise, across a whole grid.
export default React.memo(QuickAddStepper);
