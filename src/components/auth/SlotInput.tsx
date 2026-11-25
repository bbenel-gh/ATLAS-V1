import { forwardRef, useImperativeHandle, useRef, useState, type ComponentRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';

import { focusRing } from '@/components/common/focusRing';
import { borderWidth, colors, fonts, radius, spacing } from '@/components/common/theme';

type Props = {
  value: string;
  length: number;
  /** Called with what was typed, already passed through `filter`. */
  onChangeText: (value: string) => void;
  filter: (raw: string) => string;
  /** What a box shows for a typed character: the character, or a dot for a PIN. */
  show: (char: string) => string;
  accessibilityLabel: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'characters';
  autoFocus?: boolean;
  disabled?: boolean;
  /** Called once the last box is filled. */
  onFilled?: (value: string) => void;
};

export type SlotInputHandle = { focus: () => void };

/**
 * A row of big boxes over one real, invisible text field (runbook S11). The
 * field takes the phone keyboard or number pad, paste and screen readers; the
 * boxes only show what is in it. Tap anywhere on the row to type.
 */
export const SlotInput = forwardRef<SlotInputHandle, Props>(function SlotInput(
  { value, length, onChangeText, filter, show, accessibilityLabel, keyboardType = 'default', autoCapitalize = 'none', autoFocus, disabled, onFilled },
  ref,
) {
  const input = useRef<ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => ({ focus: () => input.current?.focus() }), []);

  const change = (raw: string) => {
    const next = filter(raw);
    onChangeText(next);
    if (next.length === length && value.length < length) onFilled?.(next);
  };

  const active = Math.min(value.length, length - 1);

  return (
    <Pressable onPress={() => input.current?.focus()} disabled={disabled} accessible={false} style={styles.row}>
      {Array.from({ length }, (_, i) => {
        const char = value[i];
        return (
          <View
            key={i}
            importantForAccessibility="no-hide-descendants"
            accessibilityElementsHidden
            style={[styles.box, focused && i === active && styles.boxActive, focused && i === active && focusRing]}
          >
            <Text style={styles.char}>{char ? show(char) : ''}</Text>
          </View>
        );
      })}
      <TextInput
        ref={input}
        value={value}
        onChangeText={change}
        accessibilityLabel={accessibilityLabel}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        importantForAutofill="no"
        caretHidden
        contextMenuHidden={false}
        editable={!disabled}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  box: {
    width: 48,
    height: 60,
    borderRadius: radius.card / 2,
    borderWidth,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxActive: { borderColor: colors.teal },
  char: {
    fontFamily: fonts.label,
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  // Covers the boxes so a tap lands on it, but cannot be seen.
  hidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: Platform.OS === 'web' ? 0 : 0.011,
    color: 'transparent',
  },
});
