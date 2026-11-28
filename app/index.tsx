import { useQuery } from '@tanstack/react-query';
import { Redirect } from 'expo-router';

import { CalmError } from '@/components/common/CalmError';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { Screen } from '@/components/common/Screen';
import { fetchPupilGate, OfflineError } from '@/data/pupilAuth';
import { supabase } from '@/data/supabase';
import { nextScreen, ROUTES } from '@/domain/nextScreen';

const SIGN_IN = '/(auth)/sign-in' as const;

/** Where to start: a pupil with a saved session goes where nextScreen says; anyone else to sign-in. */
async function startRoute() {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return SIGN_IN;
  try {
    const gate = await fetchPupilGate();
    return gate ? ROUTES[nextScreen(gate)] : SIGN_IN;
  } catch (e) {
    if (e instanceof OfflineError) throw e;
    return SIGN_IN;
  }
}

/**
 * App start (runbook S11). Closing and reopening the app keeps a pupil signed
 * in: the session is saved by the Supabase client. No connection: a calm
 * message and "Try again", never a crash.
 */
export default function Index() {
  const start = useQuery({ queryKey: ['startRoute'], queryFn: startRoute, retry: false, gcTime: 0, staleTime: 0 });

  if (start.isSuccess) return <Redirect href={start.data} />;
  return (
    <Screen>
      {start.isError ? (
        <CalmError message="No connection. Check the data and try again." onRetry={() => void start.refetch()} />
      ) : (
        <LoadingCalm />
      )}
    </Screen>
  );
}
