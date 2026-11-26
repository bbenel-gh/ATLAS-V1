/**
 * Onboarding rules (runbook S14; specs/prd.md FR-5 to FR-7; specs/B3.md; D-41).
 *
 * Pure TypeScript, no imports. Four screens, one question each: name, class,
 * interests, then three "would you rather" choices one at a time. Nothing is
 * right or wrong. Each answer is kept with the time it took, and the next
 * screen is always the first unanswered one, so onboarding resumes where the
 * pupil left off.
 */

/** specs/prd.md FR-5. The same tags the content uses (contentSchema INTEREST_TAGS). */
export const INTERESTS = [
  'football',
  'music',
  'farming',
  'stories',
  'cooking',
  'market',
  'animals',
  'phones and computers',
] as const;
export type Interest = (typeof INTERESTS)[number];
export const MAX_INTERESTS = 4;

/** Basic 7 first: it is preselected. */
export const CLASS_LEVELS = ['Basic 7', 'Basic 8', 'Basic 9'] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

/** The three playful choices and their two options. The words live in copy.ts. */
export const CHOICE_OPTIONS = {
  radio: ['fix', 'why'],
  farm: ['plant', 'sell'],
  song: ['song', 'story'],
} as const;
export type ChoiceId = keyof typeof CHOICE_OPTIONS;
export const CHOICE_IDS = Object.keys(CHOICE_OPTIONS) as ChoiceId[];

export const NAME_MAX = 20;

type Timed<T> = { value: T; ms: number };

export type OnboardingAnswers = {
  /** When this copy last changed, in ms since 1970. The later copy wins (phone or server). */
  updatedAt: number;
  name?: Timed<string>;
  classLevel?: Timed<ClassLevel>;
  interests?: Timed<Interest[]>;
  choices: Partial<Record<ChoiceId, { choice: string; ms: number }>>;
  /** Set when the pupil taps "Go to my lessons". */
  finishedAt?: string;
};

export type OnboardingStep = 'name' | 'class' | 'interests' | `choice:${ChoiceId}` | 'end' | 'done';

export const emptyAnswers = (now: number): OnboardingAnswers => ({ updatedAt: now, choices: {} });

/** The first unanswered screen. */
export function nextStep(a: OnboardingAnswers): OnboardingStep {
  if (!a.name) return 'name';
  if (!a.classLevel) return 'class';
  if (!a.interests || a.interests.value.length === 0) return 'interests';
  for (const id of CHOICE_IDS) if (!a.choices[id]) return `choice:${id}`;
  return a.finishedAt ? 'done' : 'end';
}

/** Which of the 4 quiet progress dots is current (0 to 3). */
export function progressDot(step: OnboardingStep): number {
  if (step === 'name') return 0;
  if (step === 'class') return 1;
  if (step === 'interests') return 2;
  return 3;
}

/** As the pupil types: letters (any alphabet), spaces and hyphens only, at most 20. */
export function filterNameInput(text: string): string {
  return Array.from(text.replace(/[^\p{L} -]/gu, ''))
    .slice(0, NAME_MAX)
    .join('');
}

/** Starts with a letter; letters, spaces and hyphens; 1 to 20 once trimmed. */
export function isValidName(name: string): boolean {
  const t = name.trim();
  return Array.from(t).length <= NAME_MAX && /^\p{L}[\p{L} -]*$/u.test(t);
}

/** Tap an interest. A 5th is refused gently (tooMany) and the 4 are kept. */
export function toggleInterest(current: readonly Interest[], tag: Interest): { value: Interest[]; tooMany: boolean } {
  if (current.includes(tag)) return { value: current.filter((t) => t !== tag), tooMany: false };
  if (current.length >= MAX_INTERESTS) return { value: [...current], tooMany: true };
  return { value: [...current, tag], tooMany: false };
}

/** The profiles columns this answers copy is saved as. */
export type ProfileRow = {
  interests: string[];
  playful_choices: unknown;
  onboarding: unknown;
  onboarded_at: string | null;
};

export function toProfileRow(a: OnboardingAnswers): ProfileRow {
  return {
    interests: a.interests ? [...a.interests.value] : [],
    playful_choices: { ...a.choices },
    onboarding: {
      name_ms: a.name?.ms,
      class_ms: a.classLevel?.ms,
      interests_ms: a.interests?.ms,
      updated_at: a.updatedAt,
    },
    onboarded_at: a.finishedAt ?? null,
  };
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const msOf = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined);

/**
 * Back from the database. A screen counts as answered only when its time was
 * saved, so a name set by the admin still shows the name screen (prefilled).
 * Unknown tags, choices and the seed's placeholder are dropped.
 */
export function fromProfileRow(row: ProfileRow, pupil: { displayName: string; classLevel: string }): OnboardingAnswers {
  const o = isRecord(row.onboarding) ? row.onboarding : {};
  const a = emptyAnswers(msOf(o.updated_at) ?? 0);

  const nameMs = msOf(o.name_ms);
  if (nameMs !== undefined && isValidName(pupil.displayName)) a.name = { value: pupil.displayName.trim(), ms: nameMs };

  const classMs = msOf(o.class_ms);
  if (classMs !== undefined && (CLASS_LEVELS as readonly string[]).includes(pupil.classLevel)) {
    a.classLevel = { value: pupil.classLevel as ClassLevel, ms: classMs };
  }

  const interestsMs = msOf(o.interests_ms);
  const tags = row.interests.filter((t): t is Interest => (INTERESTS as readonly string[]).includes(t)).slice(0, MAX_INTERESTS);
  if (interestsMs !== undefined && tags.length > 0) a.interests = { value: tags, ms: interestsMs };

  if (isRecord(row.playful_choices)) {
    for (const id of CHOICE_IDS) {
      const c = row.playful_choices[id];
      if (!isRecord(c)) continue;
      const ms = msOf(c.ms);
      if (ms !== undefined && typeof c.choice === 'string' && (CHOICE_OPTIONS[id] as readonly string[]).includes(c.choice)) {
        a.choices[id] = { choice: c.choice, ms };
      }
    }
  }

  if (row.onboarded_at) a.finishedAt = row.onboarded_at;
  return a;
}

/** The later of the phone copy and the server copy. */
export function newerAnswers(x: OnboardingAnswers | null, y: OnboardingAnswers | null): OnboardingAnswers | null {
  if (!x) return y;
  if (!y) return x;
  return y.updatedAt > x.updatedAt ? y : x;
}
