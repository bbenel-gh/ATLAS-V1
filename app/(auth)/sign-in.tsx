import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Heading, Label } from '@/components/common/Text';

/**
 * S04 placeholder: "Hello ATLAS" and the installed version, so a tester can
 * see at a glance which build is on the phone. B2 replaces it with sign-in.
 */
export default function SignIn() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? 'unknown';
  const build = Constants.expoConfig?.android?.versionCode;

  return (
    <Screen>
      <Heading size="display">Hello ATLAS</Heading>
      <Label>
        Version {version}
        {build ? ` (build ${build})` : ''}
      </Label>
      {__DEV__ ? (
        <>
          <PillButton
            variant="secondary"
            label="Component gallery (dev only)"
            onPress={() => router.push('/dev/components')}
          />
          <PillButton
            variant="secondary"
            label="Materials segments (dev only)"
            onPress={() => router.push('/dev/segments')}
          />
        </>
      ) : null}
    </Screen>
  );
}
