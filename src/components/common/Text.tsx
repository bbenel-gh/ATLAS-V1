import { StyleSheet, Text, type TextProps } from 'react-native';

import { colors, typography } from './theme';

type HeadingSize = 'display' | 'title' | 'heading';

/**
 * Heading in Fraunces. Announced as a header to screen readers.
 *
 * Usage: <Heading>Materials</Heading> or <Heading size="heading">Segment 1A</Heading>
 * Sizes: display 40, title 28 (default), heading 20.
 */
export function Heading({ size = 'title', style, ...rest }: TextProps & { size?: HeadingSize }) {
  return <Text accessibilityRole="header" style={[styles.ink, typography[size], style]} {...rest} />;
}

/**
 * Body text in Inter 16. Pass `muted` for secondary text in inkSoft.
 *
 * Usage: <Body>Watch the board, then answer below.</Body>
 */
export function Body({ muted = false, style, ...rest }: TextProps & { muted?: boolean }) {
  return <Text style={[muted ? styles.inkSoft : styles.ink, typography.body, style]} {...rest} />;
}

/**
 * Small uppercase label in IBM Plex Mono, inkSoft.
 *
 * Usage: <Label>Segment 1A</Label>
 */
export function Label({ style, ...rest }: TextProps) {
  return <Text style={[styles.inkSoft, typography.label, styles.upper, style]} {...rest} />;
}

const styles = StyleSheet.create({
  ink: { color: colors.ink },
  inkSoft: { color: colors.inkSoft },
  upper: { textTransform: 'uppercase' },
});
