import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { PUPIL_GATE_KEY } from '@/components/auth/PupilGuard';
import { CalmError } from '@/components/common/CalmError';
import { COPY } from '@/components/common/copy';
import { LoadingCalm } from '@/components/common/LoadingCalm';
import { PillButton } from '@/components/common/PillButton';
import { Body, Heading } from '@/components/common/Text';
import { TextField } from '@/components/common/TextField';
import { spacing } from '@/components/common/theme';
import { loadOnboarding, saveOnboarding, syncOnboarding, type OnboardingStart } from '@/data/onboarding';
import type { PupilGate } from '@/domain/nextScreen';
import {
  CHOICE_OPTIONS,
  CLASS_LEVELS,
  filterNameInput,
  INTERESTS,
  isValidName,
  nextStep,
  progressDot,
  toggleInterest,
  type ChoiceId,
  type ClassLevel,
  type Interest,
  type OnboardingAnswers,
} from '@/domain/onboarding';

import { ChoicePill } from './ChoicePill';
import { ProgressDots } from './ProgressDots';

const O = COPY.onboarding;

/**
 * Onboarding (runbook S14; specs/prd.md FR-5 to FR-7). One question per screen.
 * The screen shown is always the first unanswered one (src/domain/onboarding.ts),
 * so closing the app and coming back resumes in the same place. Each answer is
 * kept on the phone first, then sent (src/data/onboarding.ts). No score, no
 * timer on screen, nothing right or wrong.
 */
export function OnboardingFlow() {
  const start = useQuery({ queryKey: ['onboardingStart'], queryFn: loadOnboarding, retry: false, staleTime: Infinity, gcTime: 0 });
  if (start.isPending) return <LoadingCalm />;
  if (start.isError) return <CalmError message={COPY.offline} onRetry={() => void start.refetch()} />;
  return <Steps start={start.data} />;
}

function Steps({ start }: { start: OnboardingStart }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<OnboardingAnswers>(start.answers);
  const step = nextStep(answers);

  // Time taken per screen: from when it shows to the answer. Set by the effect
  // below when each screen first shows.
  const shownAt = useRef(0);
  useEffect(() => {
    shownAt.current = Date.now();
  }, [step]);
  const elapsed = () => Math.max(0, Date.now() - shownAt.current);

  const record = (change: (a: OnboardingAnswers) => OnboardingAnswers) => {
    const next = { ...change({ ...answers, choices: { ...answers.choices } }), updatedAt: Date.now() };
    setAnswers(next);
    void saveOnboarding(start, next);
  };

  const finish = async () => {
    const next = { ...answers, finishedAt: new Date().toISOString(), updatedAt: Date.now() };
    setAnswers(next);
    await saveOnboarding(start, next); // safe on the phone from here
    // Tell the gate now, so home opens even before the server has the answers.
    queryClient.setQueryData<PupilGate | null>(PUPIL_GATE_KEY, (old) => (old ? { ...old, onboardingDone: true } : old));
    void syncOnboarding();
    router.replace('/home');
  };

  useEffect(() => {
    if (step === 'done') router.replace('/home');
  }, [step, router]);
  if (step === 'done') return <LoadingCalm />;

  return (
    <View style={styles.page}>
      <ProgressDots current={progressDot(step)} />
      {step === 'name' ? (
        <NameStep initial={answers.name?.value ?? start.prefillName} onNext={(value) => record((a) => ({ ...a, name: { value, ms: elapsed() } }))} />
      ) : step === 'class' ? (
        <ClassStep onNext={(value) => record((a) => ({ ...a, classLevel: { value, ms: elapsed() } }))} />
      ) : step === 'interests' ? (
        <InterestsStep onNext={(value) => record((a) => ({ ...a, interests: { value, ms: elapsed() } }))} />
      ) : step === 'end' ? (
        <View style={styles.block}>
          <Heading accessibilityRole="header">{O.thanks(answers.name?.value ?? '')}</Heading>
          <PillButton label={O.go} onPress={() => void finish()} />
        </View>
      ) : (
        <ChoiceStep
          key={step}
          id={step.slice('choice:'.length) as ChoiceId}
          onChoose={(id, choice) => record((a) => ({ ...a, choices: { ...a.choices, [id]: { choice, ms: elapsed() } } }))}
        />
      )}
    </View>
  );
}

function NameStep({ initial, onNext }: { initial: string; onNext: (name: string) => void }) {
  const [name, setName] = useState(initial);
  const ok = isValidName(name);
  return (
    <View style={styles.block}>
      <Heading accessibilityRole="header">{O.nameQuestion}</Heading>
      <TextField
        accessibilityLabel={O.nameLabel}
        value={name}
        onChangeText={(t) => setName(filterNameInput(t))}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="off"
        returnKeyType="next"
        onSubmitEditing={() => ok && onNext(name.trim())}
        maxLength={20}
      />
      <PillButton label={O.next} disabled={!ok} onPress={() => onNext(name.trim())} />
    </View>
  );
}

function ClassStep({ onNext }: { onNext: (level: ClassLevel) => void }) {
  const [level, setLevel] = useState<ClassLevel>('Basic 7');
  return (
    <View style={styles.block}>
      <Heading accessibilityRole="header">{O.classQuestion}</Heading>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {CLASS_LEVELS.map((l) => (
          <ChoicePill key={l} kind="radio" label={l} selected={l === level} onPress={() => setLevel(l)} />
        ))}
      </View>
      <PillButton label={O.next} onPress={() => onNext(level)} />
    </View>
  );
}

function InterestsStep({ onNext }: { onNext: (tags: Interest[]) => void }) {
  const [picked, setPicked] = useState<Interest[]>([]);
  const [tooMany, setTooMany] = useState(false);
  return (
    <View style={styles.block}>
      <Heading accessibilityRole="header">{O.interestsQuestion}</Heading>
      <View style={styles.wrap}>
        {INTERESTS.map((tag) => (
          <ChoicePill
            key={tag}
            kind="checkbox"
            label={O.interestLabels[tag]}
            selected={picked.includes(tag)}
            onPress={() => {
              const r = toggleInterest(picked, tag);
              setPicked(r.value);
              setTooMany(r.tooMany);
            }}
          />
        ))}
      </View>
      {tooMany ? <Body accessibilityLiveRegion="polite">{O.tooMany}</Body> : null}
      <PillButton label={O.next} disabled={picked.length === 0} onPress={() => onNext(picked)} />
    </View>
  );
}

function ChoiceStep({ id, onChoose }: { id: ChoiceId; onChoose: (id: ChoiceId, choice: string) => void }) {
  const c = O.choices[id];
  const labels = c.options as Record<string, string>;
  return (
    <View style={styles.block}>
      <Heading accessibilityRole="header">{c.question}</Heading>
      {CHOICE_OPTIONS[id].map((option) => (
        <ChoicePill key={option} kind="button" label={labels[option] ?? option} selected={false} onPress={() => onChoose(id, option)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: spacing.xl },
  block: { gap: spacing.lg },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
