import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { focusRing } from './focusRing';
import { Label } from './Text';
import { borderWidth, colors, radius, spacing, typography } from './theme';

type Props = Omit<TextInputProps, 'style' | 'accessibilityLabel'> & {
  /** Required: what a screen reader says for this field. */
  accessibilityLabel: string;
  /** Optional visible label above the field, in IBM Plex Mono. */
  label?: string;
};

/**
 * Pill-shaped text input with a 1px line border and a teal focus ring.
 *
 * Usage:
 *   <TextField label="Your first name" accessibilityLabel="Your first name"
 *     value={name} onChangeText={setName} />
 */
export function TextField({ label, accessibilityLabel, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Label>{label}</Label> : null}
      <TextInput
        accessibilityLabel={accessibilityLabel}
        placeholderTextColor={colors.inkSoft}
        selectionColor={colors.teal}
        cursorColor={colors.ink}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.input, rest.multiline && styles.multiline, focused && styles.inputFocused, focused && focusRing]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  input: {
    ...typography.body,
    color: colors.ink,
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth,
    borderRadius: radius.pill,
  },
  inputFocused: { borderColor: colors.teal },
  // Several lines of writing: card corners, and the text starts at the top.
  multiline: { borderRadius: radius.card, minHeight: 96, paddingHorizontal: spacing.lg, textAlignVertical: 'top' },
});
