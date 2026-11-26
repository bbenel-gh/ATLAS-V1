import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { COPY } from '@/components/common/copy';
import { focusRing } from '@/components/common/focusRing';
import { Body, Heading, Label } from '@/components/common/Text';
import { borderWidth, colors, radius, spacing } from '@/components/common/theme';

/**
 * Home cards (runbook S15). Rounded card, 1px line border, no shadow. The
 * whole card is one button, at least 48 tall, with the teal focus ring.
 */
function CardButton({
  onPress,
  accessibilityLabel,
  children,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, focused && focusRing]}
    >
      {children}
    </Pressable>
  );
}

/**
 * The quiet progress line: one short bar per part, done parts in teal, the
 * rest in the line colour. No numbers, no percentage on screen. A screen
 * reader hears "2 of 5 parts done".
 */
export function PartsLine({ parts, done }: { parts: number; done: number }) {
  if (parts === 0) return null;
  return (
    <View
      style={styles.line}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={COPY.home.progress(done, parts)}
      accessibilityValue={{ min: 0, max: parts, now: done }}
    >
      {Array.from({ length: parts }, (_, i) => (
        <View key={i} style={[styles.bar, i < done ? styles.barDone : styles.barTodo]} />
      ))}
    </View>
  );
}

export function TopicCard({
  title,
  parts,
  done,
  label,
  onPress,
}: {
  title: string;
  parts: number;
  done: number;
  /** A small label above the title, like "From your class". */
  label?: string;
  onPress: () => void;
}) {
  return (
    <CardButton onPress={onPress} accessibilityLabel={`${title}. ${COPY.home.parts(parts)}. ${COPY.home.progress(done, parts)}`}>
      {label ? <Label>{label}</Label> : null}
      <Heading size="heading">{title}</Heading>
      <Body muted>{COPY.home.parts(parts)}</Body>
      <PartsLine parts={parts} done={done} />
    </CardButton>
  );
}

export function NoteCard({
  label,
  title,
  body,
  onPress,
}: {
  label: string;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <CardButton onPress={onPress} accessibilityLabel={`${label}. ${title}. ${body}`}>
      <Label>{label}</Label>
      <Heading size="heading">{title}</Heading>
      <Body muted>{body}</Body>
    </CardButton>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 48,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.85 },
  line: { flexDirection: 'row', gap: spacing.xs, paddingTop: spacing.xs },
  bar: { flex: 1, height: 4, borderRadius: 2, maxWidth: 48 },
  barDone: { backgroundColor: colors.teal },
  barTodo: { backgroundColor: colors.line },
});
