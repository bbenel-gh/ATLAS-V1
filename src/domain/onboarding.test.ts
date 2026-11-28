import { INTEREST_TAGS } from '../data/contentSchema';
import {
  CHOICE_IDS,
  CLASS_LEVELS,
  emptyAnswers,
  filterNameInput,
  fromProfileRow,
  INTERESTS,
  isValidName,
  MAX_INTERESTS,
  newerAnswers,
  nextStep,
  progressDot,
  toggleInterest,
  toProfileRow,
  type OnboardingAnswers,
} from './onboarding';

const T = 1_764_000_000_000;

function answered(upTo: 'name' | 'class' | 'interests' | 'a' | 'b' | 'c' | 'finished'): OnboardingAnswers {
  const a = emptyAnswers(T);
  const order = ['name', 'class', 'interests', 'a', 'b', 'c', 'finished'];
  const n = order.indexOf(upTo);
  if (n >= 0) a.name = { value: 'Ama', ms: 4000 };
  if (n >= 1) a.classLevel = { value: 'Basic 7', ms: 2000 };
  if (n >= 2) a.interests = { value: ['football', 'music'], ms: 9000 };
  if (n >= 3) a.choices.radio = { choice: 'fix', ms: 3000 };
  if (n >= 4) a.choices.farm = { choice: 'sell', ms: 2500 };
  if (n >= 5) a.choices.song = { choice: 'story', ms: 2100 };
  if (n >= 6) a.finishedAt = new Date(T).toISOString();
  return a;
}

describe('lists', () => {
  it('has the eight interests from the PRD, the same tags the content uses', () => {
    expect([...INTERESTS]).toEqual([...INTEREST_TAGS]);
  });

  it('offers Basic 7, 8 and 9, Basic 7 first (preselected)', () => {
    expect([...CLASS_LEVELS]).toEqual(['Basic 7', 'Basic 8', 'Basic 9']);
  });

  it('has three playful choices', () => {
    expect(CHOICE_IDS).toHaveLength(3);
  });
});

describe('nextStep (resume)', () => {
  it.each([
    [undefined, 'name'],
    ['name', 'class'],
    ['class', 'interests'],
    ['interests', 'choice:radio'],
    ['a', 'choice:farm'],
    ['b', 'choice:song'],
    ['c', 'end'],
    ['finished', 'done'],
  ] as const)('after %s, goes to %s', (upTo, step) => {
    expect(nextStep(upTo ? answered(upTo) : emptyAnswers(T))).toBe(step);
  });

  it('goes to the first unanswered screen even if a later one is answered', () => {
    const a = answered('c');
    delete a.classLevel;
    expect(nextStep(a)).toBe('class');
  });

  it('treats an empty interest list as unanswered', () => {
    const a = answered('interests');
    a.interests = { value: [], ms: 1 };
    expect(nextStep(a)).toBe('interests');
  });
});

describe('progressDot', () => {
  it('shows 4 dots: one per screen, all three choices on the fourth', () => {
    expect(progressDot('name')).toBe(0);
    expect(progressDot('class')).toBe(1);
    expect(progressDot('interests')).toBe(2);
    expect(progressDot('choice:radio')).toBe(3);
    expect(progressDot('choice:song')).toBe(3);
    expect(progressDot('end')).toBe(3);
  });
});

describe('name', () => {
  it('keeps letters, spaces and hyphens, at most 20', () => {
    expect(filterNameInput('Ama!! 2')).toBe('Ama ');
    expect(filterNameInput('Kofi-Boateng')).toBe('Kofi-Boateng');
    expect(filterNameInput('Abcdefghijklmnopqrstuvwxyz')).toBe('Abcdefghijklmnopqrst');
    expect(filterNameInput('Akosua_O\'Neil')).toBe('AkosuaONeil');
  });

  it('accepts letters with accents', () => {
    expect(filterNameInput('Adwoa Ɛsi')).toBe('Adwoa Ɛsi');
    expect(isValidName('Adwoa Ɛsi')).toBe(true);
  });

  it.each([
    ['Ama', true],
    ['Kofi-Boateng', true],
    ['  Ama  ', true],
    ['', false],
    ['   ', false],
    ['-Ama', false],
    ['Ama2', false],
    ['A'.repeat(21), false],
  ])('"%s" valid: %s', (name, ok) => {
    expect(isValidName(name)).toBe(ok);
  });
});

describe('toggleInterest', () => {
  it('adds and removes', () => {
    expect(toggleInterest([], 'music')).toEqual({ value: ['music'], tooMany: false });
    expect(toggleInterest(['music', 'farming'], 'music')).toEqual({ value: ['farming'], tooMany: false });
  });

  it('refuses a 5th gently and keeps the 4', () => {
    const four = ['football', 'music', 'farming', 'stories'] as const;
    expect(MAX_INTERESTS).toBe(4);
    expect(toggleInterest([...four], 'market')).toEqual({ value: [...four], tooMany: true });
  });

  it('still lets a pupil with 4 take one away', () => {
    expect(toggleInterest(['football', 'music', 'farming', 'stories'], 'music')).toEqual({
      value: ['football', 'farming', 'stories'],
      tooMany: false,
    });
  });
});

describe('profile row mapping', () => {
  it('round-trips every answer and time', () => {
    const a = answered('finished');
    const row = toProfileRow(a);
    expect(row.interests).toEqual(['football', 'music']);
    expect(row.playful_choices).toEqual({
      radio: { choice: 'fix', ms: 3000 },
      farm: { choice: 'sell', ms: 2500 },
      song: { choice: 'story', ms: 2100 },
    });
    expect(row.onboarding).toEqual({ name_ms: 4000, class_ms: 2000, interests_ms: 9000, updated_at: T });
    expect(row.onboarded_at).toBe(a.finishedAt);
    expect(fromProfileRow(row, { displayName: 'Ama', classLevel: 'Basic 7' })).toEqual(a);
  });

  it('leaves unanswered screens unanswered (no name time means the name screen comes first)', () => {
    const a = fromProfileRow(
      { interests: [], playful_choices: {}, onboarding: {}, onboarded_at: null },
      { displayName: 'Ama Test', classLevel: 'Basic 7' },
    );
    expect(nextStep(a)).toBe('name');
  });

  it('ignores the seed or unknown values in stored choices', () => {
    const a = fromProfileRow(
      { interests: ['football', 'not-a-tag'], playful_choices: { seed: true, radio: { choice: 'fix', ms: 5 } }, onboarding: null, onboarded_at: null },
      { displayName: 'Ama', classLevel: 'Basic 12' },
    );
    expect(a.choices).toEqual({ radio: { choice: 'fix', ms: 5 } });
    expect(a.interests).toBeUndefined();
  });
});

describe('newerAnswers', () => {
  it('keeps the later of the phone copy and the server copy', () => {
    const phone = answered('b');
    phone.updatedAt = T + 10;
    const server = answered('a');
    server.updatedAt = T + 5;
    expect(newerAnswers(phone, server)).toBe(phone);
    expect(newerAnswers(server, phone)).toBe(phone);
    expect(newerAnswers(null, server)).toBe(server);
    expect(newerAnswers(phone, null)).toBe(phone);
  });
});
