import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading } from '@/components/common/Text';
import { spacing } from '@/components/common/theme';
import { useLockStore } from '@/data/lockStore';
import { callPupilSignin, fetchOwnCode, signOutHere, startSession } from '@/data/pupilAuth';

import { PinDots } from './CodeAndPin';
import type { SlotInputHandle } from './SlotInput';

/**
 * The PIN lock on a shared phone (runbook S12). Drawn over the whole app by
 * app/_layout.tsx while useLockStore says locked: after a cold start, or after
 * more than 5 minutes in the background (src/domain/lockRule.ts).
 *
 * The PIN goes through pupil-signin like a normal sign-in, so wrong PINs count
 * towards the 5-try lockout. "Not you?" signs this pupil out on this phone only
 * and opens the code screen for someone else.
 */
export function PinLock() {
  const unlock = useLockStore((s) => s.unlock);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [offline, setOffline] = useState<string | null>(null);
  const input = useRef<SlotInputHandle>(null);

  // Whose PIN? Read the signed-in pupil's own code. No pupil signed in: nothing to lock.
  const own = useQuery({ queryKey: ['lockOwnCode'], queryFn: fetchOwnCode, retry: false, gcTime: 0, staleTime: 0 });
  const nobody = own.isSuccess && own.data === null;
  useEffect(() => {
    if (nobody) unlock();
  }, [nobody, unlock]);

  const submit = async (value: string) => {
    const code = own.data;
    if (!code) return;
    setBusy(true);
    setMessage(null);
    setOffline(null);
    try {
      const result = await callPupilSignin({ code, pin: value });
      switch (result.kind) {
        case 'session':
          await startSession(result.session);
          await queryClient.invalidateQueries();
          unlock();
          return;
        case 'offline':
          setOffline(value);
          break;
        case 'locked':
          setMessage(COPY.signIn.locked(result.minutes));
          break;
        case 'rateLimited':
          setMessage(COPY.signIn.rateLimited);
          break;
        case 'noMatch':
          setMessage(COPY.signIn.wrong);
          break;
        default:
          setMessage(COPY.signIn.failed);
      }
      setPin('');
      input.current?.focus();
    } catch {
      setMessage(COPY.signIn.failed);
      setPin('');
    } finally {
      setBusy(false);
    }
  };

  const notYou = async () => {
    setBusy(true);
    await signOutHere();
    queryClient.clear();
    unlock();
    setBusy(false);
    router.replace('/(auth)/sign-in');
  };

  if (own.isPending || nobody) {
    return (
      <Screen>
        <LoadingCalm />
      </Screen>
    );
  }
  if (own.isError) {
    return (
      <Screen>
        <CalmError message={COPY.offline} onRetry={() => void own.refetch()} />
        <PillButton variant="secondary" label={COPY.lock.notYou} onPress={() => void notYou()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.stack}>
        <Heading size="display">{COPY.signIn.welcome}</Heading>
        <Body>{COPY.signIn.typePin}</Body>
        <PinDots
          ref={input}
          value={pin}
          onChangeText={(v) => {
            setPin(v);
            if (v.length > 0) setMessage(null);
          }}
          onFilled={(v) => void submit(v)}
          accessibilityLabel="Your PIN, 4 digits"
          autoFocus
          disabled={busy}
        />
        {busy ? <LoadingCalm /> : null}
        {message ? <Body accessibilityLiveRegion="polite">{message}</Body> : null}
        {offline ? <CalmError message={COPY.offline} onRetry={() => void submit(offline)} /> : null}
        <PillButton variant="secondary" label={COPY.lock.notYou} onPress={() => void notYou()} disabled={busy} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
});
