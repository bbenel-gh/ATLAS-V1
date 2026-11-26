import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { DevSignOut } from '@/components/auth/DevSignOut';
import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Screen } from '@/components/common/Screen';
import { Body, Heading, Label } from '@/components/common/Text';
import { borderWidth, colors, radius, spacing } from '@/components/common/theme';
import { NoteCard, TopicCard } from '@/components/home/HomeCards';
import { NudgeSheet, type Nudge } from '@/components/home/NudgeSheet';
import { ChoicePill } from '@/components/onboarding/ChoicePill';
import { FAKE_PREREQ, useDevFlags } from '@/data/devFlags';
import { useHome } from '@/data/home';
import { buildHome, decideOpen, withFakePrerequisite, type HomeInput, type RecommendedItem } from '@/domain/home';

/**
 * Home (runbook S15, specs/framework.md stage 2, FR-8, FR-9).
 * "Recommended for you" and "Choose a topic". Tapping a topic from either
 * section goes through the same prerequisite rule; the nudge never blocks.
 */
export default function Home() {
  const state = useHome();
  if (state.kind === 'loading') {
    return (
      <Screen>
        <LoadingCalm />
      </Screen>
    );
  }
  if (state.kind === 'offline') {
    return (
      <Screen>
        <CalmError message={COPY.offline} onRetry={state.retry} />
        <DevSignOut />
      </Screen>
    );
  }
  return <HomeView input={state.input} />;
}

function HomeView({ input: serverInput }: { input: HomeInput }) {
  const router = useRouter();
  const fakePrerequisite = useDevFlags((s) => s.fakePrerequisite);
  const input = useMemo(
    () =>
      __DEV__ && fakePrerequisite
        ? { ...serverInput, topics: withFakePrerequisite(serverInput.topics, FAKE_PREREQ.topicCode, FAKE_PREREQ.code) }
        : serverInput,
    [serverInput, fakePrerequisite],
  );
  const view = useMemo(() => buildHome(input), [input]);
  const [subject, setSubject] = useState<string | null>(null);
  const [nudge, setNudge] = useState<Nudge | null>(null);

  const available = view.subjects.filter((s) => s.available);
  const chosen = available.find((s) => s.name === subject) ?? available[0];

  const goToTopic = (topicCode: string) => {
    setNudge(null);
    router.push({ pathname: '/topic/[id]', params: { id: topicCode } });
  };
  const openTopic = (topicCode: string) => {
    const decision = decideOpen(topicCode, input, { [FAKE_PREREQ.code]: FAKE_PREREQ.title });
    if (decision.kind === 'open') goToTopic(topicCode);
    else setNudge({ topicCode: decision.topicCode, first: decision.first, titles: decision.titles });
  };

  return (
    <Screen>
      <Heading size="display">{COPY.home.greeting(view.name)}</Heading>

      <View style={styles.section}>
        <Heading size="heading">{COPY.home.recommended}</Heading>
        {view.recommended.length === 0 ? (
          <Body muted>{COPY.home.recommendedEmpty}</Body>
        ) : (
          view.recommended.map((item) => (
            <RecommendedCard key={itemKey(item)} item={item} onOpen={openTopic} />
          ))
        )}
      </View>

      <View style={styles.section}>
        <Heading size="heading">{COPY.home.choose}</Heading>
        <View style={styles.subjects} accessibilityRole="radiogroup">
          {view.subjects.map((s) =>
            s.available ? (
              <ChoicePill
                key={s.name}
                kind="radio"
                label={s.name}
                selected={s.name === chosen?.name}
                onPress={() => setSubject(s.name)}
              />
            ) : (
              <View
                key={s.name}
                style={styles.soon}
                accessible
                accessibilityLabel={`${s.name}. ${COPY.home.comingSoon}`}
                accessibilityState={{ disabled: true }}
              >
                <Body muted>{s.name}</Body>
                <Label>{COPY.home.comingSoon}</Label>
              </View>
            ),
          )}
        </View>
        {chosen?.topics.map((t) => (
          <TopicCard key={t.topicCode} title={t.title} parts={t.parts} done={t.done} onPress={() => openTopic(t.topicCode)} />
        ))}
      </View>

      {__DEV__ ? (
        <View style={styles.dev}>
          <Label>Dev only</Label>
          <PillButton variant="secondary" label="Dev tools" onPress={() => router.push('/dev/components')} />
          <DevSignOut />
        </View>
      ) : null}

      <NudgeSheet nudge={nudge} onGoToMissing={goToTopic} onAnyway={goToTopic} onClose={() => setNudge(null)} />
    </Screen>
  );
}

function itemKey(item: RecommendedItem): string {
  return item.kind === 'reteach' ? `reteach-${item.topicCode}-${item.segmentCode}` : `${item.kind}-${item.topicCode}`;
}

/** A re-teach or re-check card opens its topic for now (D-44); S18 and S33 take them further. */
function RecommendedCard({ item, onOpen }: { item: RecommendedItem; onOpen: (topicCode: string) => void }) {
  const open = () => onOpen(item.topicCode);
  switch (item.kind) {
    case 'topic':
      return <TopicCard label={COPY.home.setByTeacher} title={item.title} parts={item.parts} done={item.done} onPress={open} />;
    case 'reteach':
      return <NoteCard label={COPY.home.reteachLabel(item.segmentCode)} title={item.segmentTitle} body={COPY.home.reteach} onPress={open} />;
    case 'recheck':
      return <NoteCard label={COPY.home.recheckLabel} title={item.title} body={COPY.home.recheck(item.title)} onPress={open} />;
  }
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  subjects: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  soon: {
    minHeight: 48,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth,
    borderColor: colors.line,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dev: { gap: spacing.sm, paddingTop: spacing.xl },
});
