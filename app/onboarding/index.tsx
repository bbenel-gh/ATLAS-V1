import { PupilGuard } from '@/components/auth/PupilGuard';
import { Screen } from '@/components/common/Screen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';

/** Onboarding (runbook S14). Behind the guard: only with the AI notice seen and consent recorded. */
export default function Onboarding() {
  return (
    <PupilGuard area="onboarding">
      <Screen>
        <OnboardingFlow />
      </Screen>
    </PupilGuard>
  );
}
