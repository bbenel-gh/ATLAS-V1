import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from './theme';
import { useReducedMotion } from './useReducedMotion';

/**
 * A quiet loading state: "One moment" with a small spinner in inkSoft.
 * With reduced motion on, the spinner is left out and only the text shows.
 *
 * Usage: if (isLoading) return <LoadingCalm />;
 */
export function LoadingCalm() {
  const reduceMotion = useReducedMotion();

  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="One moment"
      accessibilityState={{ busy: true }}
    >
      {reduceMotion ? null : <ActivityIndicator size="small" color={colors.inkSoft} />}
      <Text style={[typography.small, styles.text]}>One moment</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  text: { color: colors.inkSoft },
});
