import type { ReactNode, Ref } from 'react';
import { ScrollView, StyleSheet, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewInstance } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from './theme';

/**
 * The page wrapper for every screen: paper background, safe area, scrolling,
 * 16 padding.
 *
 * Usage:
 *   <Screen>
 *     <Heading>Choose a topic</Heading>
 *     <Body>...</Body>
 *   </Screen>
 *
 * A screen with a board video passes `onScroll` (to pause the board when it
 * scrolls off screen, specs/video-board.md P6) and `scrollRef` (to scroll back
 * to the board on "Watch again", P9).
 */
export function Screen({
  children,
  onScroll,
  scrollRef,
}: {
  children: ReactNode;
  onScroll?: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollRef?: Ref<ScrollViewInstance>;
}) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <ScrollView
        ref={scrollRef}
        style={styles.safe}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScroll={onScroll}
        scrollEventThrottle={onScroll ? 100 : undefined}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    flexGrow: 1,
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
