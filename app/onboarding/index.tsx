import { PupilGuard } from '@/components/auth/PupilGuard';
import { RoutePlaceholder } from '@/components/common/RoutePlaceholder';

/** Onboarding (S14). Behind the guard: only with the AI notice seen and consent recorded. */
export default function Onboarding() {
  return (
    <PupilGuard area="onboarding">
      <RoutePlaceholder name="onboarding" />
    </PupilGuard>
  );
}
