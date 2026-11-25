import { Stack } from 'expo-router';

import { PupilGuard } from '@/components/auth/PupilGuard';
import { colors } from '@/components/common/theme';

/**
 * Every lesson route (home, topic, segment, exam, results) sits in this group,
 * so one guard covers them all, deep links included (runbook S12, FR-4). A
 * pupil without the AI notice, consent or onboarding never sees a lesson
 * screen. The group name does not appear in URLs.
 */
export default function LessonsLayout() {
  return (
    <PupilGuard area="lessons">
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper } }} />
    </PupilGuard>
  );
}
