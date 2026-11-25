import { useRouter } from 'expo-router';

import { PillButton } from '@/components/common/PillButton';
import { signOutHere } from '@/data/pupilAuth';

/**
 * Dev builds only: sign out on this phone and go back to sign-in, so testers
 * can switch test pupils before S12 adds "Not you?". Renders nothing in a
 * release build.
 */
export function DevSignOut() {
  const router = useRouter();
  if (!__DEV__) return null;
  return (
    <PillButton
      variant="secondary"
      label="Sign out (dev only)"
      onPress={async () => {
        await signOutHere();
        router.replace('/(auth)/sign-in');
      }}
    />
  );
}
