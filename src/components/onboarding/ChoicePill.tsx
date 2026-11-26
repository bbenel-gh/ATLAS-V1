import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { focusRing } from '@/components/common/focusRing';
import { borderWidth, colors, radius, spacing, typography } from '@/components/common/theme';

/**
 * A pill the pupil picks: one of a set (class level, would-you-rather) or a
 * toggle (interests). Selected is ink with paper text; not selected is card
 * with a 1px line. At least 48 tall. Never red, never marked right or wrong.
 */
export function ChoicePill({
  label,
  selected,
  onPress,
  kind,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  /** radio: one of a set. checkbox: a toggle. button: tapping it answers. */
  kind: 'radio' | 'checkbox' | 'button';
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole={kind}
      accessibilityLabel={label}
      accessibilityState={kind === 'button' ? undefined : kind === 'radio' ? { selected } : { checked: selected }}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.base, selected ? styles.on : styles.off, pressed && styles.pressed, focused && focusRing]}
    >
      <Text style={[typography.bodyStrong, selected ? styles.onText : styles.offText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  on: { backgroundColor: colors.ink, borderColor: colors.ink },
  off: { backgroundColor: colors.card, borderColor: colors.line },
  onText: { color: colors.paper },
  offText: { color: colors.ink },
  pressed: { opacity: 0.85 },
});
