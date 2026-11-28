/**
 * S18 tries rule tests (specs/prd.md FR-19 to FR-26a; specs/framework.md
 * stage 4 "The reasoning check" and stage 5; specs/B6.md D-48 amendment).
 * Written before src/domain/tries.ts.
 */
import {
  MAX_TRIES,
  currentTry,
  initialSegmentState,
  reduceSegment,
  type SegmentEvent,
  type SegmentState,
  type TriesEffect,
} from './tries';

const started: SegmentEvent = { type: 'started' };
const movedOn: SegmentEvent = { type: 'movedOn' };
const returnedLater: SegmentEvent = { type: 'returnedLater' };
const judged = (
  answerCorrect: boolean,
  reasoningSound: boolean,
  codes: string[] = [],
  versionLabel: string | null = 'a',
): SegmentEvent => ({ type: 'attemptJudged', versionLabel, answerCorrect, reasoningSound, codes });
const pass = (label: string | null = 'a') => judged(true, true, [], label);
const fail = (codes: string[] = ['1B-M1'], label: string | null = 'a') => judged(false, false, codes, label);

/** Runs events in order, failing the test if any is rejected. Returns the last state and every effect. */
function run(events: SegmentEvent[], from: SegmentState = initialSegmentState) {
  let state = from;
  const effects: TriesEffect[] = [];
  for (const event of events) {
    const result = reduceSegment(state, event);
    if (!result.ok) throw new Error(`rejected ${event.type}: ${result.reason}`);
    state = result.state;
    effects.push(...result.effects);
  }
  return { state, effects };
}

const types = (effects: TriesEffect[]) => effects.map((e) => e.type);

describe('initial state and start', () => {
  it('allows 3 tries per round', () => {
    expect(MAX_TRIES).toBe(3);
  });

  it('starts not started, with no round, tries, versions or codes', () => {
    expect(initialSegmentState).toEqual({
      status: 'not_started',
      phase: 'before',
      round: 0,
      triesUsed: 0,
      versionsSeen: [],
      lastCodes: [],
    });
    expect(currentTry(initialSegmentState)).toBeNull();
  });

  it('started opens round 1 in progress on try 1 with no effects', () => {
    const { state, effects } = run([started]);
    expect(state).toMatchObject({ status: 'in_progress', phase: 'trying', round: 1, triesUsed: 0 });
    expect(currentTry(state)).toBe(1);
    expect(effects).toEqual([]);
  });
});

describe('completing a segment', () => {
  it('completes on try 1 with a correct answer and sound reasoning', () => {
    const { state, effects } = run([started, pass()]);
    expect(state).toMatchObject({ status: 'complete', phase: 'ended', triesUsed: 0 });
    expect(currentTry(state)).toBeNull();
    expect(effects).toEqual([]);
  });

  it('completes on try 2', () => {
    const { state, effects } = run([started, fail(), pass('b')]);
    expect(state).toMatchObject({ status: 'complete', phase: 'ended', triesUsed: 1, versionsSeen: ['a', 'b'] });
    expect(effects).toEqual([]);
  });

  it('completes on try 3', () => {
    const { state, effects } = run([started, fail(), fail(['1B-M2'], 'b'), pass('c')]);
    expect(state).toMatchObject({ status: 'complete', phase: 'ended', triesUsed: 2 });
    expect(effects).toEqual([]);
  });
});

describe('using tries', () => {
  it('a wrong answer with wrong reasoning uses one try', () => {
    const { state } = run([started, fail()]);
    expect(state).toMatchObject({ status: 'in_progress', phase: 'trying', triesUsed: 1 });
    expect(currentTry(state)).toBe(2);
  });

  it('a wrong answer with sound reasoning uses one try and is not a lucky guess', () => {
    const { state, effects } = run([started, judged(false, true, ['1B-M1'])]);
    expect(state.triesUsed).toBe(1);
    expect(effects).toEqual([]);
  });

  it('a right answer with a wrong reason uses one try and logs a lucky guess with its codes', () => {
    const { state, effects } = run([started, judged(true, false, ['1B-M2'])]);
    expect(state).toMatchObject({ status: 'in_progress', triesUsed: 1, lastCodes: ['1B-M2'] });
    expect(effects).toEqual([{ type: 'logLuckyGuess', codes: ['1B-M2'] }]);
  });

  it('keeps the codes of the last judged attempt, without duplicates', () => {
    const { state } = run([started, fail(['1B-M1']), fail(['1B-M2', '1B-M3', '1B-M2'], 'b')]);
    expect(state.lastCodes).toEqual(['1B-M2', '1B-M3']);
  });

  it('adds each version shown once, and none for a worked-example try', () => {
    const { state } = run([started, fail(['1B-M1'], 'a'), fail(['1B-M1'], 'a'), pass(null)]);
    expect(state.versionsSeen).toEqual(['a']);
  });
});

describe('three failed tries', () => {
  it('moves on after the third failed try and requires a stalled flag', () => {
    const { state, effects } = run([started, fail(), fail(['1B-M1'], 'b'), fail(['1B-M1'], null)]);
    expect(state).toMatchObject({ status: 'moved_on', phase: 'ended', triesUsed: 3 });
    expect(currentTry(state)).toBeNull();
    expect(effects).toEqual([{ type: 'raiseStalledFlag' }]);
  });

  it('logs the lucky guess before the stalled flag when the third try is a lucky guess', () => {
    const { effects } = run([started, fail(), fail(), judged(true, false, ['1B-M4'])]);
    expect(types(effects)).toEqual(['logLuckyGuess', 'raiseStalledFlag']);
  });

  it('movedOn after the round ends leaves the segment with no effects', () => {
    const { state, effects } = run([started, fail(), fail(), fail(), movedOn]);
    expect(state).toMatchObject({ status: 'moved_on', phase: 'away' });
    expect(types(effects)).toEqual(['raiseStalledFlag']);
  });

  it('movedOn after completing leaves the segment complete', () => {
    const { state } = run([started, pass(), movedOn]);
    expect(state).toMatchObject({ status: 'complete', phase: 'away' });
  });
});

describe('returning later (Relearn, D-48)', () => {
  const stalled = run([started, fail(['1B-M1'], 'a'), fail(['1B-M2'], 'b'), fail(['1B-M3'], null), movedOn]).state;

  it('starts a fresh round of 3 tries and keeps the versions seen and the last codes', () => {
    const { state, effects } = run([returnedLater], stalled);
    expect(state).toEqual({
      status: 'moved_on',
      phase: 'trying',
      round: 2,
      triesUsed: 0,
      versionsSeen: ['a', 'b'],
      lastCodes: ['1B-M3'],
    });
    expect(currentTry(state)).toBe(1);
    expect(effects).toEqual([]);
  });

  it('may return straight from the end of a round without moving on first', () => {
    const ended = run([started, fail(), fail(), fail()]).state;
    expect(run([returnedLater], ended).state).toMatchObject({ round: 2, phase: 'trying', triesUsed: 0 });
  });

  it('returning later then completing makes it complete and clears the stalled flag', () => {
    const { state, effects } = run([returnedLater, fail(['1B-M1'], 'c'), pass('d')], stalled);
    expect(state).toMatchObject({ status: 'complete', phase: 'ended', round: 2, triesUsed: 1 });
    expect(effects).toEqual([{ type: 'clearStalledFlag' }]);
  });

  it('returning later and failing again keeps it moved on and the flag open, adding a note', () => {
    const { state, effects } = run([returnedLater, fail(), fail(), fail()], stalled);
    expect(state).toMatchObject({ status: 'moved_on', phase: 'ended', round: 2, triesUsed: 3 });
    expect(effects).toEqual([{ type: 'noteStalledFlag' }]);
    expect(types(effects)).not.toContain('clearStalledFlag');
    expect(types(effects)).not.toContain('raiseStalledFlag');
  });

  it('a third round after two failed rounds still clears the flag when the pupil gets it', () => {
    const { state, effects } = run([returnedLater, fail(), fail(), fail(), movedOn, returnedLater, pass()], stalled);
    expect(state).toMatchObject({ status: 'complete', round: 3 });
    expect(types(effects)).toEqual(['noteStalledFlag', 'clearStalledFlag']);
  });

  it('relearning a complete segment and failing keeps it complete with no flag', () => {
    const complete = run([started, pass(), movedOn]).state;
    const { state, effects } = run([returnedLater, fail(), fail(), fail()], complete);
    expect(state).toMatchObject({ status: 'complete', phase: 'ended', round: 2, triesUsed: 3 });
    expect(effects).toEqual([]);
  });

  it('relearning a complete segment and passing has no flag effect', () => {
    const complete = run([started, pass()]).state;
    expect(run([returnedLater, pass('b')], complete).effects).toEqual([]);
  });

  it('a lucky guess in a relearn round is still logged', () => {
    const { effects } = run([returnedLater, judged(true, false, ['1B-M2'])], stalled);
    expect(effects).toEqual([{ type: 'logLuckyGuess', codes: ['1B-M2'] }]);
  });
});

describe('impossible events are rejected', () => {
  const trying = run([started]).state;
  const ended = run([started, pass()]).state;
  const away = run([started, pass(), movedOn]).state;

  const cases: [string, SegmentState, SegmentEvent][] = [
    ['an attempt before the segment started', initialSegmentState, pass()],
    ['an attempt after the segment completed', ended, pass()],
    ['an attempt after moving on', away, fail()],
    ['a fourth attempt in a round', run([started, fail(), fail(), fail()]).state, fail()],
    ['started twice', trying, started],
    ['started on a finished segment', ended, started],
    ['movedOn before the segment started', initialSegmentState, movedOn],
    ['movedOn in the middle of a round', trying, movedOn],
    ['movedOn twice', away, movedOn],
    ['returnedLater before the segment started', initialSegmentState, returnedLater],
    ['returnedLater in the middle of a round', run([started, fail()]).state, returnedLater],
    ['an unknown event', trying, { type: 'skipped' } as unknown as SegmentEvent],
  ];

  it.each(cases)('rejects %s and leaves the state alone', (_name, state, event) => {
    const before = JSON.stringify(state);
    const result = reduceSegment(state, event);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/\S/);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('purity', () => {
  it('never changes the state it is given', () => {
    const state = run([started, fail(['1B-M1'], 'a')]).state;
    const before = JSON.stringify(state);
    reduceSegment(state, fail(['1B-M2'], 'b'));
    reduceSegment(state, pass('b'));
    expect(JSON.stringify(state)).toBe(before);
  });
});
