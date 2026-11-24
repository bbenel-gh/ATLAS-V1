import { StyleSheet, View, type ViewProps } from 'react-native';

import { borderWidth, colors, radius, spacing } from './theme';

/**
 * Card: card background, 1px line border, radius 16, no shadow.
 *
 * Usage: <Card><Heading size="heading">Segment 1A</Heading><Body>...</Body></Card>
 */
export function Card({ style, ...rest }: ViewProps) {
  return <View style={[styles.card, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth,
    borderRadius: radius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
});
