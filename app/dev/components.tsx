import * as Sentry from '@sentry/react-native';
import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { CalmError } from '@/components/common/CalmError';
import { Card } from '@/components/common/Card';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading, Label } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { board, colors, fonts, spacing } from '@/components/common/theme';
import { useReducedMotion } from '@/components/common/useReducedMotion';
import { checkSupabaseHealth, type HealthResult } from '@/data/health';

/**
 * Dev-only gallery of every shared component. In a release build __DEV__ is
 * false and this route sends the person back to the start.
 */
export default function DevComponentsRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <DevComponents />;
}

function DevComponents() {
  const [text, setText] = useState('');
  const [presses, setPresses] = useState(0);
  const reduceMotion = useReducedMotion();

  return (
    <Screen>
      <Label>Dev only</Label>
      <Heading size="display">Components</Heading>
      <Body muted>Reduced motion is {reduceMotion ? 'on' : 'off'}.</Body>

      <Section title="atlas-dev and Sentry">
        <HealthCheck />
        <TestError />
      </Section>

      <Section title="Text">
        <Heading size="title">Heading title, Fraunces 28</Heading>
        <Heading size="heading">Heading heading, Fraunces 20</Heading>
        <Body>Body text, Inter 16. Calm, short sentences in the second person.</Body>
        <Body muted>Body muted, inkSoft.</Body>
        <Label>Label, IBM Plex Mono</Label>
      </Section>

      <Section title="PillButton">
        <PillButton label={`Primary, pressed ${presses}`} onPress={() => setPresses((n) => n + 1)} />
        <PillButton
          variant="secondary"
          label="Secondary"
          onPress={() => setPresses((n) => n + 1)}
        />
        <PillButton label="Disabled" disabled onPress={() => undefined} />
      </Section>

      <Section title="Card">
        <Card>
          <Heading size="heading">Segment 1A</Heading>
          <Body>Card background, 1px line border, radius 16, no shadow.</Body>
        </Card>
      </Section>

      <Section title="TextField">
        <TextField
          label="Your answer"
          accessibilityLabel="Your answer"
          placeholder="Type here"
          value={text}
          onChangeText={setText}
        />
      </Section>

      <Section title="CalmError">
        <CalmError message="We could not load this video." onRetry={() => undefined} />
      </Section>

      <Section title="LoadingCalm">
        <LoadingCalm />
      </Section>

      <Section title="Board fonts">
        <View style={styles.board}>
          <Body style={styles.hand}>Your turn</Body>
        </View>
      </Section>
    </Screen>
  );
}

/** Calls the atlas-dev auth health endpoint. Shows the project ref to compare with the dashboard. */
function HealthCheck() {
  const [state, setState] = useState<'idle' | 'checking' | HealthResult>('idle');

  const run = async () => {
    setState('checking');
    setState(await checkSupabaseHealth());
  };

  return (
    <View style={styles.stack}>
      <PillButton variant="secondary" label="Check connection" onPress={run} />
      {state === 'checking' ? <LoadingCalm /> : null}
      {typeof state === 'object' && state.ok ? (
        <Body>Connected to atlas-dev. Project ref {state.projectRef}.</Body>
      ) : null}
      {typeof state === 'object' && !state.ok ? (
        <CalmError message="We could not reach atlas-dev." onRetry={run} />
      ) : null}
    </View>
  );
}

/**
 * Throws a test error and sends it to Sentry with fake pupil fields attached.
 * In Sentry, the event should show `segment` but not `name` or `answer`.
 */
function TestError() {
  const [sent, setSent] = useState<string | null>(null);

  const send = () => {
    try {
      throw new Error('ATLAS test error from the dev screen');
    } catch (error) {
      const id = Sentry.captureException(error, {
        extra: { name: 'Test Pupil', answer: 'test answer', segment: '1A' },
      });
      setSent(id);
    }
  };

  return (
    <View style={styles.stack}>
      <PillButton variant="secondary" label="Send test error" onPress={send} />
      {sent ? <Body muted>Test error sent. Event id {sent}.</Body> : null}
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Label>{title}</Label>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stack: { gap: spacing.sm },
  board: {
    backgroundColor: board.board,
    padding: spacing.lg,
  },
  hand: {
    fontFamily: fonts.hand,
    fontSize: 28,
    lineHeight: 36,
    color: board.boardInk,
  },
});
