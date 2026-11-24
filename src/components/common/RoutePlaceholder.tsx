import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

/**
 * S01 placeholder: shows only the route name in plain text.
 * Each route replaces it with its real screen in a later session.
 */
export function RoutePlaceholder({ name }: { name: string }) {
  return (
    <View style={styles.screen}>
      <Text style={styles.text}>{name}</Text>
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
  text: {
    fontSize: 16,
    color: colors.ink,
  },
});
