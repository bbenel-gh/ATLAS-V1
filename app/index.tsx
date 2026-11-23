import { StyleSheet, Text, View } from 'react-native';

import { colors, typography } from '@/theme';

/**
 * S00 placeholder. Replaced by the real home screen in S15, which shows
 * "Choose a topic" and "Recommended for you" per specs/framework.md.
 */
export default function Home() {
  return (
    <View style={styles.screen}>
      <Text style={styles.wordmark}>ATLAS</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  wordmark: {
    fontFamily: typography.display.fontFamily,
    fontSize: typography.display.fontSize,
    lineHeight: typography.display.lineHeight,
    letterSpacing: 1,
    color: colors.ink,
  },
});
