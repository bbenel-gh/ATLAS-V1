import { useRouter } from 'expo-router';

import { PillButton } from '@/components/common/PillButton';
import { RoutePlaceholder } from '@/components/common/RoutePlaceholder';

export default function SignIn() {
  const router = useRouter();
  return (
    <RoutePlaceholder name="sign-in">
      {__DEV__ ? (
        <PillButton
          variant="secondary"
          label="Component gallery (dev only)"
          onPress={() => router.push('/dev/components')}
        />
      ) : null}
    </RoutePlaceholder>
  );
}
