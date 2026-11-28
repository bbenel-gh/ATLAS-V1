import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COPY } from '@/components/common/copy';
import { PillButton } from '@/components/common/PillButton';
import { Body, Heading } from '@/components/common/Text';
import { borderWidth, colors, radius, spacing } from '@/components/common/theme';

export type Nudge = {
  /** The topic the pupil chose. */
  topicCode: string;
  /** The first missing prerequisite, offered as the main button. */
  first: { topicCode: string; title: string };
  /** Every missing title, for the reason line. */
  titles: string[];
};

/**
 * The prerequisite nudge (specs/framework.md stage 2, FR-9, runbook S15 item 5).
 * It suggests, it never blocks: "Take me to the class topic anyway" always
 * opens the chosen topic. Tapping outside the sheet or the back button just
 * closes it. No red, no warning tone.
 */
export function NudgeSheet({
  nudge,
  onGoToMissing,
  onAnyway,
  onClose,
}: {
  nudge: Nudge | null;
  onGoToMissing: (topicCode: string) => void;
  onAnyway: (topicCode: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={nudge !== null} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" accessibilityRole="button" />
      {nudge ? (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet} accessibilityViewIsModal>
            <Heading size="heading">{COPY.home.nudgeTitle}</Heading>
            <Body>{COPY.home.nudgeReason(nudge.titles.join(' and '))}</Body>
            <PillButton label={COPY.home.nudgeGo(nudge.first.title)} onPress={() => onGoToMissing(nudge.first.topicCode)} />
            <PillButton variant="secondary" label={COPY.home.nudgeAnyway} onPress={() => onAnyway(nudge.topicCode)} />
          </View>
        </SafeAreaView>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  // A soft ink veil from the palette, not black.
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.ink, opacity: 0.25 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.paper,
    borderColor: colors.line,
    borderWidth,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: spacing.xl,
    gap: spacing.lg,
  },
});
