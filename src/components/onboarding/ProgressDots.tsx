import { StyleSheet, View } from 'react-native';

import { COPY } from '@/components/common/copy';
import { colors, spacing } from '@/components/common/theme';

/**
 * The quiet progress line for onboarding (runbook S14): 4 small dots, no
 * numbers and no percentage on screen. A screen reader hears "Step 2 of 4".
 */
export function ProgressDots({ current }: { current: number }) {
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={COPY.onboarding.progress(current)}
      accessibilityValue={{ min: 1, max: 4, now: current + 1 }}
    >
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={[styles.dot, i <= current ? styles.done : styles.todo]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'center', paddingVertical: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4 },
  done: { backgroundColor: colors.ink },
  todo: { backgroundColor: colors.line },
});
