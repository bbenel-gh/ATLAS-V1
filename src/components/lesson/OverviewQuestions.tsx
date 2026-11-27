import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { COPY } from '@/components/common/copy';
import { PillButton } from '@/components/common/PillButton';
import { Body } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { spacing } from '@/components/common/theme';
import { useReducedMotion } from '@/components/common/useReducedMotion';
import { OVERVIEW_TEXT_MAX } from '@/domain/overview';

export type OverviewAnswers = { summary: string; confusing: string };

/**
 * The two overview questions under the board (runbook S17 item 2, FR-11).
 * Controlled by the parent, so "Watch again" keeps what the pupil typed.
 * After Send or Skip: only the thanks message (FR-12). Nothing here is a mark.
 */
export function OverviewQuestions({
  answers,
  onChange,
  sent,
  onSend,
  onSkip,
  onNext,
}: {
  answers: OverviewAnswers;
  onChange: (next: OverviewAnswers) => void;
  sent: boolean;
  onSend: () => void;
  onSkip: () => void;
  onNext: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const fade = reduceMotion ? undefined : FadeIn.duration(400);

  if (sent) {
    return (
      <Animated.View entering={fade} style={styles.stack}>
        <Body accessibilityLiveRegion="polite">{COPY.overview.thanks}</Body>
        <PillButton label={COPY.overview.next} onPress={onNext} />
      </Animated.View>
    );
  }

  const hasText = answers.summary.trim() !== '' || answers.confusing.trim() !== '';
  return (
    <Animated.View entering={fade} style={styles.stack}>
      <TextField
        label={COPY.overview.tellFriend}
        accessibilityLabel={COPY.overview.tellFriend}
        value={answers.summary}
        onChangeText={(summary) => onChange({ ...answers, summary })}
        multiline
        maxLength={OVERVIEW_TEXT_MAX}
      />
      <TextField
        label={COPY.overview.confusing}
        accessibilityLabel={COPY.overview.confusing}
        value={answers.confusing}
        onChangeText={(confusing) => onChange({ ...answers, confusing })}
        multiline
        maxLength={OVERVIEW_TEXT_MAX}
      />
      <View style={styles.row}>
        <PillButton label={COPY.overview.send} onPress={onSend} disabled={!hasText} />
        <Pressable accessibilityRole="button" onPress={onSkip} style={styles.quiet} hitSlop={8}>
          <Body muted>{COPY.overview.skip}</Body>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg, alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  quiet: { minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
});
