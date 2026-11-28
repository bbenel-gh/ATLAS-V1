import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import type { ReactNode } from 'react';

import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { Screen } from '@/components/common/Screen';
import { fetchPupilGate } from '@/data/pupilAuth';
import { guardRoute, type GuardArea } from '@/domain/routeGuard';

export const PUPIL_GATE_KEY = ['pupilGate'] as const;

/** The gate for the signed-in pupil. Read fresh each time a guarded screen opens and when the app comes back. */
export function usePupilGate() {
  return useQuery({ queryKey: PUPIL_GATE_KEY, queryFn: fetchPupilGate, staleTime: 0, retry: false });
}

/**
 * Shows `children` only when the signed-in pupil belongs on this area
 * (src/domain/routeGuard.ts). Otherwise it redirects: to sign-in when no pupil
 * is signed in, or to the one screen nextScreen picks. Every lesson route sits
 * behind it (app/(lessons)/_layout.tsx), so a deep link cannot skip consent.
 */
export function PupilGuard({ area, children }: { area: GuardArea; children: ReactNode }) {
  const gate = usePupilGate();

  // Keep showing the screen during a background refresh; only block on the first read.
  if (gate.isPending) {
    return (
      <Screen>
        <LoadingCalm />
      </Screen>
    );
  }
  // A failed background refresh keeps the last good answer (rule 5: the
  // network never traps a pupil mid-way). Only a first read with no answer
  // at all shows the offline message.
  if (gate.data === undefined) {
    return (
      <Screen>
        <CalmError message={COPY.offline} onRetry={() => void gate.refetch()} />
      </Screen>
    );
  }
  if (gate.data === null) return <Redirect href="/(auth)/sign-in" />;
  const redirect = guardRoute(gate.data, area);
  if (redirect) return <Redirect href={redirect} />;
  return <>{children}</>;
}
