import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { focusRing } from './focusRing';
import { borderWidth, colors, radius, spacing, typography } from './theme';

type Variant = 'primary' | 'secondary';

type Props = {
  /** The visible text. */
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** What a screen reader says. Defaults to `label`; set it when the label alone is unclear. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
};

/**
 * Pill button. Primary is ink with paper text; secondary is card with a 1px
 * line border. At least 48 tall and 48 wide. Shows a teal focus ring when
 * focused by keyboard or switch access.
 *
 * Usage: <PillButton label="Continue" onPress={next} />
 *        <PillButton variant="secondary" label="Watch again" onPress={replay} />
 */
export function PillButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
}: Props) {
  const [focused, setFocused] = useState(false);
  const primary = variant === 'primary';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        focused && focusRing,
      ]}
    >
      <Text style={[typography.bodyStrong, primary ? styles.primaryText : styles.secondaryText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    minWidth: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    borderWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  secondary: {
    backgroundColor: colors.card,
    borderColor: colors.line,
  },
  primaryText: { color: colors.paper },
  secondaryText: { color: colors.ink },
  // An instant change, not an animation, so it is fine under reduced motion.
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.4 },
});
