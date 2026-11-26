import { StyleSheet, View } from 'react-native';

import { Heading, Label } from '@/components/common/Text';
import { spacing } from '@/components/common/theme';

/**
 * P10: above the board, the breadcrumb (for example "Basic 7 Science · Materials"),
 * the title and the journey label (for example "Overview" or "Part 1A").
 */
export function BoardHeader({ breadcrumb, title, journey }: { breadcrumb: string; title: string; journey: string }) {
  return (
    <View style={styles.wrap}>
      <Label>{breadcrumb}</Label>
      <Heading size="title">{title}</Heading>
      <Label>{journey}</Label>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
});
