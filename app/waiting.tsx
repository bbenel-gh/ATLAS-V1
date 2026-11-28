import { StyleSheet, View } from 'react-native';

import { DevSignOut } from '@/components/auth/DevSignOut';
import { PupilGuard, usePupilGate } from '@/components/auth/PupilGuard';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading } from '@/components/common/Text';
import { spacing } from '@/components/common/theme';

/**
 * The consent wait (FR-4, runbook S12). No link to any lesson: the only way on
 * is "Check again", which reads the gate; once consent is recorded the guard
 * moves the pupil to onboarding or home.
 */
export default function WaitingRoute() {
  return (
    <PupilGuard area="waiting">
      <Waiting />
    </PupilGuard>
  );
}

function Waiting() {
  const gate = usePupilGate();

  return (
    <Screen>
      <View style={styles.stack}>
        <Heading>{COPY.signIn.welcome}</Heading>
        <Body>{COPY.waiting.body}</Body>
        {gate.isFetching ? (
          <LoadingCalm />
        ) : (
          <PillButton variant="secondary" label={COPY.waiting.button} onPress={() => void gate.refetch()} />
        )}
        <DevSignOut />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.xl },
});
