import { Caveat_700Bold } from '@expo-google-fonts/caveat';
import { Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono';
import { Inter_400Regular, Inter_600SemiBold } from '@expo-google-fonts/inter';
import * as Sentry from '@sentry/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { colors } from '@/components/common/theme';
import { getEnv } from '@/data/env';
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

/**
 * The names below must match the values in src/components/common/theme.ts
 * `fonts`, because that is what every style refers to. theme.test.ts checks the
 * set matches runbook S02 exactly.
 *
 * The font files ship inside the app bundle (required from @expo-google-fonts)
 * and are registered at startup, so the app also works in Expo Go.
 */
function RootLayout() {
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

  // Hold the splash screen while the fonts load. If they fail, carry on with
  // the system font rather than trapping the pupil on a blank screen.
  if (!loaded && !error) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
