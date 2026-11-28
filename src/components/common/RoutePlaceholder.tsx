import type { ReactNode } from 'react';

import { DevSignOut } from '@/components/auth/DevSignOut';

import { Screen } from './Screen';
import { Body, Heading, Label } from './Text';

/**
 * Placeholder for a route that a later session builds. Uses Screen and
 * Heading so the ATLAS look shows on every route from S02 on.
 *
 * Usage: <RoutePlaceholder name="home" />
 */
export function RoutePlaceholder({ name, children }: { name: string; children?: ReactNode }) {
  return (
    <Screen>
      <Label>Placeholder</Label>
      <Heading>{name}</Heading>
      <Body muted>This screen is built in a later session.</Body>
      {children}
      <DevSignOut />
    </Screen>
  );
}
