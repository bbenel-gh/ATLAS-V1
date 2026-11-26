import { useLocalSearchParams } from 'expo-router';

import { RoutePlaceholder } from '@/components/common/RoutePlaceholder';
import { Body } from '@/components/common/Text';

/** Topic screen. A placeholder until S16 and S17. The id is the topic code (D-44), like B7-MATERIALS. */
export default function Topic() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <RoutePlaceholder name="topic">
      <Body accessibilityLabel={`Topic ${id ?? ''}`}>{id}</Body>
    </RoutePlaceholder>
  );
}
