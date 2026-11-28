import type { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CalmError } from '@/components/common/CalmError';
import { Card } from '@/components/common/Card';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading, Label } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { spacing } from '@/components/common/theme';
import { fetchTopicSegments, MATERIALS_TOPIC } from '@/data/segments';
import { supabase } from '@/data/supabase';

/**
 * Temporary dev screen (specs/B1.md task 6): lists the segments of the
 * Materials topic from atlas-dev, to prove the content import (S09).
 * Content is readable only when signed in (RLS), and pupil sign-in comes in
 * S10, so this screen signs in with a fake test user from .env.test.
 * Release builds never show it. S15 replaces it with the real home screen.
 */
export default function DevSegmentsRoute() {
  if (!__DEV__) {
    return <Redirect href="/" />;
  }
  return <DevSegments />;
}

function DevSegments() {
  const [session, setSession] = useState<Session | null | 'loading'>('loading');

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Screen>
      <Label>Dev only</Label>
      <Heading size="display">Materials segments</Heading>
      {session === 'loading' ? <LoadingCalm /> : session ? <SegmentList email={session.user.email ?? ''} /> : <TestSignIn />}
    </Screen>
  );
}

function TestSignIn() {
  const [email, setEmail] = useState('test-p1@atlas-dev.invalid');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'failed'>('idle');

  const signIn = async () => {
    setState('busy');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setState(error ? 'failed' : 'idle');
  };

  return (
    <View style={styles.stack}>
      <Body muted>
        Sign in with a test user to read the content. The passwords are in .env.test on the shared computer. Test users
        only, never a real pupil.
      </Body>
      <TextField
        label="Test user email"
        accessibilityLabel="Test user email"
        autoCapitalize="none"
        autoCorrect={false}
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Password"
        accessibilityLabel="Password"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {state === 'busy' ? <LoadingCalm /> : <PillButton label="Sign in as a test user" onPress={signIn} />}
      {state === 'failed' ? <Body>That email and password did not work. Check them in .env.test and try again.</Body> : null}
    </View>
  );
}

function SegmentList({ email }: { email: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ['dev', 'segments', MATERIALS_TOPIC, email], queryFn: () => fetchTopicSegments(MATERIALS_TOPIC) });

  const signOut = async () => {
    await supabase.auth.signOut();
    queryClient.removeQueries({ queryKey: ['dev', 'segments'] });
  };

  return (
    <View style={styles.stack}>
      <Label>Signed in as {email}</Label>
      {query.isPending ? <LoadingCalm /> : null}
      {query.isError ? <CalmError message="We could not load the segments." onRetry={() => void query.refetch()} /> : null}
      {query.isSuccess && query.data === null ? (
        <Body>The Materials topic is not in atlas-dev yet. Run npm run content:import on the shared computer.</Body>
      ) : null}
      {query.isSuccess && query.data ? (
        <View style={styles.stack}>
          <Heading size="title">{query.data.title}</Heading>
          <Label>Content version {query.data.contentVersion ?? 'not set'}</Label>
          {query.data.overview ? (
            <Card>
              <Label>{query.data.overview.code}</Label>
              <Body>{query.data.overview.title}</Body>
            </Card>
          ) : null}
          {query.data.segments.map((s) => (
            <Card key={s.code}>
              <Label>{s.code}</Label>
              <Body>{s.title}</Body>
            </Card>
          ))}
          <Body muted>
            {query.data.segments.length} segment{query.data.segments.length === 1 ? '' : 's'}.
          </Body>
        </View>
      ) : null}
      <PillButton variant="secondary" label="Sign out" onPress={signOut} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.md },
});
