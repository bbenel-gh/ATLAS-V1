import { StyleSheet, View } from 'react-native';

import { PillButton } from './PillButton';
import { Body } from './Text';
import { spacing } from './theme';

/**
 * A calm error: a plain message and a "Try again" button. No icon, no red,
 * no flash. Keep the message short and in the second person.
 *
 * Usage: <CalmError message="We could not load this video." onRetry={reload} />
 */
export function CalmError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.wrap}>
      <Body accessibilityLiveRegion="polite">{message}</Body>
      <PillButton label="Try again" variant="secondary" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
    alignItems: 'flex-start',
  },
});
