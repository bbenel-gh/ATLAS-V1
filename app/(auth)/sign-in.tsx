import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';

import { CodeBoxes, PinDots } from '@/components/auth/CodeAndPin';
import type { SlotInputHandle } from '@/components/auth/SlotInput';
import { CalmError } from '@/components/common/CalmError';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading, Label } from '@/components/common/Text';
import { spacing } from '@/components/common/theme';
import { callPupilSignin, fetchPupilGate, OfflineError, startSession, type SigninResult } from '@/data/pupilAuth';
import { CODE_LENGTH, type SigninSession } from '@/domain/auth';
import { nextScreen, ROUTES } from '@/domain/nextScreen';

/**
 * Pupil sign-in (runbook S11, specs/prd.md 6.1). One route with four steps, so
 * the code never sits in a URL:
 *   code        "Welcome to ATLAS", 6 boxes, Next
 *   choosePin   first time: "Choose a 4-digit PIN. Keep it secret."
 *   confirmPin  "Type it again."
 *   pin         "Type your PIN."
 * On success the session is saved (AsyncStorage) and src/domain/nextScreen.ts
 * picks the next screen. Copy is from the runbook; new lines are listed in D-37.
 */

type Step = 'code' | 'choosePin' | 'confirmPin' | 'pin';

const COPY = {
  welcome: 'Welcome to ATLAS',
  typeCode: 'Type the code your teacher gave you.',
  next: 'Next',
  choosePin: 'Choose a 4-digit PIN. Keep it secret.',
  again: 'Type it again.',
  noMatchTwice: 'Those did not match. Try again.',
  typePin: 'Type your PIN.',
  wrong: 'That code and PIN did not match. Try again.',
  offline: 'No connection. Check the data and try again.',
  rateLimited: 'Too many tries. Please wait a minute and try again.',
  failed: 'Something went wrong on our side. Try again.',
  changeCode: 'Change code',
  locked: (minutes: number) =>
    `Too many tries. Please wait ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}, or ask your teacher.`,
};

export default function SignIn() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('code');
  const [code, setCode] = useState('');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  // A retry for "No connection": repeats exactly the call that failed.
  const [retry, setRetry] = useState<(() => void) | null>(null);
  const pinInput = useRef<SlotInputHandle>(null);

  const toCode = useCallback(() => {
    setStep('code');
    setPin('');
    setFirstPin('');
    setMessage(null);
    setRetry(null);
  }, []);

  // Android back button: from a PIN step, back to the code. On the code step, normal back.
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (step === 'code' || busy) return false;
        toCode();
        return true;
      });
      return () => sub.remove();
    }, [step, busy, toCode]),
  );

  /** After a session: save it, then go where nextScreen says. */
  const finish = async (session: SigninSession | null) => {
    setBusy(true);
    setMessage(null);
    setRetry(null);
    try {
      if (session) await startSession(session);
      const gate = await fetchPupilGate();
      if (!gate) {
        setMessage(COPY.failed);
        return;
      }
      router.replace(ROUTES[nextScreen(gate)]);
    } catch (e) {
      if (e instanceof OfflineError) setRetry(() => () => void finish(null));
      else setMessage(COPY.failed);
    } finally {
      setBusy(false);
    }
  };

  /** Shows the outcome of a pupil-signin call. Returns true when handled here. */
  const show = (result: SigninResult, again: () => void): boolean => {
    switch (result.kind) {
      case 'offline':
        setRetry(() => again);
        return true;
      case 'locked':
        setMessage(COPY.locked(result.minutes));
        return true;
      case 'rateLimited':
        setMessage(COPY.rateLimited);
        return true;
      case 'failed':
        setMessage(COPY.failed);
        return true;
      default:
        return false;
    }
  };

  const call = async (input: { code: string; pin?: string; setPin?: boolean }, again: () => void) => {
    setBusy(true);
    setMessage(null);
    setRetry(null);
    try {
      const result = await callPupilSignin(input);
      return show(result, again) ? null : result;
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async () => {
    if (code.length !== CODE_LENGTH || busy) return;
    const result = await call({ code }, () => void submitCode());
    if (!result) return;
    if (result.kind === 'needsPin') setStep('choosePin');
    else setStep('pin'); // askPin, and anything else: the PIN step answers it.
    setPin('');
  };

  const choose = (value: string) => {
    setFirstPin(value);
    setPin('');
    setMessage(null);
    setStep('confirmPin');
  };

  const confirm = async (value: string) => {
    if (value !== firstPin) {
      setFirstPin('');
      setPin('');
      setMessage(COPY.noMatchTwice);
      setStep('choosePin');
      return;
    }
    const result = await call({ code, pin: value, setPin: true }, () => void confirm(value));
    if (!result) return;
    if (result.kind === 'session') return void finish(result.session);
    // Someone set a PIN on another phone first: sign in with it instead.
    setFirstPin('');
    setPin('');
    setMessage(COPY.wrong);
    setStep('pin');
  };

  const enterPin = async (value: string) => {
    const result = await call({ code, pin: value }, () => void enterPin(value));
    if (!result) {
      setPin('');
      return;
    }
    if (result.kind === 'session') return void finish(result.session);
    if (result.kind === 'needsPin') {
      setPin('');
      setStep('choosePin');
      return;
    }
    setPin('');
    setMessage(COPY.wrong);
    pinInput.current?.focus();
  };

  const status = (
    <>
      {busy ? <LoadingCalm /> : null}
      {message ? <Body accessibilityLiveRegion="polite">{message}</Body> : null}
      {retry ? <CalmError message={COPY.offline} onRetry={retry} /> : null}
    </>
  );

  return (
    <Screen>
      <View style={styles.top}>
        <Heading size="display">{COPY.welcome}</Heading>

        {step === 'code' ? (
          <View style={styles.stack}>
            <Body>{COPY.typeCode}</Body>
            <CodeBoxes value={code} onChangeText={setCode} autoFocus disabled={busy} />
            {status}
            <PillButton label={COPY.next} onPress={() => void submitCode()} disabled={code.length !== CODE_LENGTH || busy} />
          </View>
        ) : (
          <View style={styles.stack}>
            <Label>{code}</Label>
            <Body>{step === 'choosePin' ? COPY.choosePin : step === 'confirmPin' ? COPY.again : COPY.typePin}</Body>
            <PinDots
              // A new key per step clears and refocuses the field.
              key={step}
              ref={pinInput}
              value={pin}
              onChangeText={(v) => {
                setPin(v);
                if (v.length > 0 && message && !retry) setMessage(null);
              }}
              onFilled={(v) => {
                if (step === 'choosePin') choose(v);
                else if (step === 'confirmPin') void confirm(v);
                else void enterPin(v);
              }}
              accessibilityLabel={step === 'choosePin' ? 'Your new PIN, 4 digits' : step === 'confirmPin' ? 'Your new PIN again' : 'Your PIN, 4 digits'}
              autoFocus
              disabled={busy}
            />
            {status}
            <PillButton variant="secondary" label={COPY.changeCode} onPress={toCode} disabled={busy} />
          </View>
        )}
      </View>

      <DevFooter />
    </Screen>
  );
}

/** Version for testers, and the dev-only screens. Release builds show the version only. */
function DevFooter() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const build = Constants.expoConfig?.android?.versionCode;
  return (
    <View style={styles.footer}>
      <Label>
        Version {version}
        {build ? ` (build ${build})` : ''}
      </Label>
      {__DEV__ ? (
        <>
          <PillButton variant="secondary" label="Component gallery (dev only)" onPress={() => router.push('/dev/components')} />
          <PillButton variant="secondary" label="Materials segments (dev only)" onPress={() => router.push('/dev/segments')} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.xl },
  stack: { gap: spacing.lg },
  footer: { marginTop: 'auto', gap: spacing.sm, paddingTop: spacing.xxl },
});
