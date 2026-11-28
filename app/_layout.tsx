import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as Sentry from '@sentry/react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { AppState, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PinLock } from '@/components/auth/PinLock';
import { colors } from '@/components/common/theme';
import { getEnv } from '@/data/env';
import { useLockStore } from '@/data/lockStore';
import { startOnboardingSync } from '@/data/onboarding';
import { startOverviewSync } from '@/data/overviewQueue';
import { scrubEvent } from '@/data/scrub';

SplashScreen.preventAutoHideAsync();

// Checks .env before anything else runs. A missing or unsafe value stops the
// app here with a message naming the variable.
const env = getEnv();

Sentry.init({
  dsn: env.sentryDsn,
  environment: env.appEnv,
  sendDefaultPii: false,
  // Strip pupil fields (name, pin, code, answer, reason) before anything leaves the phone.
  beforeSend: (event) => scrubEvent(event),
  beforeBreadcrumb: (breadcrumb) => scrubEvent(breadcrumb),
});

const queryClient = new QueryClient();

// S12: the app going to the background and coming back drives two things.
// 1. TanStack Query refetches on focus (so a withdrawn consent applies on return).
// 2. The PIN lock: more than 5 minutes away asks for the PIN again (lockRule).
// The web handles focus itself.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => sub.remove();
  });
}
AppState.addEventListener('change', (state) => {
  const store = useLockStore.getState();
  if (state === 'active') store.cameBack(Date.now());
  else store.wentToBackground(Date.now());
});

/**
 * The names below must match the values in src/components/common/theme.ts
 * `fonts`, because that is what every style refers to. theme.test.ts checks the
 * set matches runbook S02 exactly.
 *
 * The font files ship inside the app bundle (required from @expo-google-fonts)
 * and are registered at startup, so the app also works in Expo Go.
 */
function RootLayout() {
  const locked = useLockStore((s) => s.locked);
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Fraunces_600SemiBold,
    IBMPlexMono_500Medium,
    Caveat_700Bold,
  });

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // S14: onboarding answers saved offline are sent when the network returns.
  // S17: overview answers saved offline are sent the same way.
  useEffect(() => {
    startOnboardingSync();
    startOverviewSync();
  }, []);

  // Hold the splash screen while the fonts load. If they fail, carry on with
  // the system font rather than trapping the pupil on a blank screen.
  if (!loaded && !error) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        {/* While locked, the app underneath is hidden from screen readers and covered. */}
        <View
          style={styles.fill}
          importantForAccessibility={locked ? 'no-hide-descendants' : 'auto'}
          accessibilityElementsHidden={locked}
        >
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.paper },
            }}
          />
        </View>
        {locked ? (
          <View style={styles.cover}>
            <PinLock />
          </View>
        ) : null}
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  cover: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.paper },
});

export default Sentry.wrap(RootLayout);
