import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PUPIL_GATE_KEY, PupilGuard } from '@/components/auth/PupilGuard';
import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading } from '@/components/common/Text';
import { spacing } from '@/components/common/theme';
import { markNoticeSeen } from '@/data/pupilAuth';

/**
 * The AI notice (FR-3, runbook S12). Shown once per pupil: "I understand"
 * saves ai_notice_seen_at on the pupil's own row, then the guard moves them on
 * to the consent wait, onboarding or home. Wording lives in copy.ts.
 */
export default function NoticeRoute() {
  return (
    <PupilGuard area="notice">
      <Notice />
    </PupilGuard>
  );
}

function Notice() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<'idle' | 'saving' | 'offline'>('idle');

  const accept = async () => {
    setState('saving');
    try {
      await markNoticeSeen();
      // The guard reads the gate again and redirects to the next screen.
      await queryClient.invalidateQueries({ queryKey: PUPIL_GATE_KEY });
    } catch {
      setState('offline');
    }
  };

  return (
    <Screen>
      <View style={styles.stack}>
        <Heading>{COPY.notice.title}</Heading>
        <Body>{COPY.notice.body}</Body>
        {state === 'saving' ? <LoadingCalm /> : null}
        {state === 'offline' ? <CalmError message={COPY.offline} onRetry={() => void accept()} /> : null}
        {state === 'idle' ? <PillButton label={COPY.notice.button} onPress={() => void accept()} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
});
