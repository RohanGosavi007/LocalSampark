/**
 * Appearance control — Light / System / Dark.
 *
 * The app shipped with no way to change theme, because there was no theme to
 * change. This is the user-facing half of src/context/ThemeContext.js.
 *
 * Laid out as a segmented row rather than a Switch on purpose: a switch can only
 * express two states, and "follow my phone" has to be reachable or a user who
 * once tapped dark can never get back to matching their OS.
 *
 * Each segment is at least 48pt tall — the comfortable target from the shared
 * tokens, not the 44 minimum, because this sits in a scrolling list where a
 * mis-tap costs a theme change.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

const OPTIONS = [
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'system', label: 'System', Icon: Smartphone },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

export default function AppearanceSetting({ style, showTitle = true }) {
  const { preference, setTheme, theme } = useTheme();
  const { colors, radii, typography, touch } = theme;

  return (
    <View style={[styles.block, { backgroundColor: colors.surface1, borderColor: colors.border, borderRadius: radii.lg }, style]}>
      {showTitle && (
        <View style={styles.heading}>
          <Text style={[styles.title, { color: colors.text, fontSize: typography.size.base }]}>Appearance</Text>
          <Text style={[styles.hint, { color: colors.textMuted, fontSize: typography.size.sm }]}>
            System follows your phone&apos;s display setting.
          </Text>
        </View>
      )}

      <View style={[styles.row, { backgroundColor: colors.sunken, borderRadius: radii.base }]}>
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = preference === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${label} theme`}
              onPress={() => setTheme(value)}
              android_ripple={{ color: colors.accentQuiet, borderless: false }}
              style={[
                styles.segment,
                { minHeight: touch.comfortable, borderRadius: radii.base },
                active && { backgroundColor: colors.surface1, borderColor: colors.borderAccent, borderWidth: 1 },
              ]}
            >
              <Icon size={18} color={active ? colors.accentText : colors.textMuted} />
              <Text
                style={[
                  styles.segmentLabel,
                  {
                    color: active ? colors.text : colors.textMuted,
                    fontSize: typography.size.sm,
                    fontWeight: active ? typography.weight.semibold : typography.weight.medium,
                  },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Only layout lives here. Every colour comes from the theme above, so this
// sheet does not need to be rebuilt when the mode changes.
const styles = StyleSheet.create({
  block: { borderWidth: 1, padding: 16, gap: 12 },
  heading: { gap: 2 },
  title: { fontWeight: '700' },
  hint: { lineHeight: 18 },
  row: { flexDirection: 'row', padding: 4, gap: 4 },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  segmentLabel: {},
});
