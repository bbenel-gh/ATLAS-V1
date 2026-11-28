/**
 * S20 item 5: the mapping from tries reducer effects to repository calls,
 * with a fake repository. Written before src/data/segmentEngine.ts.
 *
 * The server raises, notes and clears the stalled flag by trigger (D-29); the
 * phone asks raise-flag as well, which only makes sure the flag is there.
 * Recommended follows segment_status, so the phone only refreshes Home.
 */
import { initialSegmentState, type SegmentState } from '@/domain/tries';

import { applySegmentEvent, type AttemptRecord, type SegmentRepo } from './segmentEngine';

type Call = [string, ...unknown[]];

function fakeRepo(): SegmentRepo & { calls: Call[] } {
  const calls: Call[] = [];
  return {
    calls,
    saveAttempt: async (a) => {
      calls.push(['saveAttempt', a.attempt_id, a.round, a.try_number]);
    },
    startRound: async (segmentCode, round) => {
      calls.push(['startRound', segmentCode, round]);
    },
    raiseFlag: async (f) => {
      calls.push(['raiseFlag', f.kind, f.segmentCode, f.attemptId ?? null]);
    },
    refreshRecommended: async () => {
      calls.push(['refreshRecommended']);
    },
    saveLocal: async (segmentCode, state) => {
      calls.push(['saveLocal', segmentCode, state.phase, state.round, state.triesUsed]);
    },
  };
}

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

const record = (n: number, over: Partial<AttemptRecord> = {}): AttemptRecord => ({
  attempt_id: uuid(n),
  segment_code: '1A',
  question_id: uuid(100 + n),
  version_label: 'a',
  answer_text: 'iron is hard',
  answer_mode: 'typing',
  reason_text: 'it does not bend',
  reason_mode: 'typing',
  sure: true,
  time_taken_ms: 5000,
  changed_answer: false,
  read_back_confirmed: true,
  tap_answer: null,
  tap_reason: null,
  client_created_at: '2026-11-28T10:00:00.000Z',
  ...over,
});

const trying = (over: Partial<SegmentState> = {}): SegmentState => ({
  ...initialSegmentState,
  status: 'in_progress',
  phase: 'trying',
  round: 1,
  ...over,
});

const judged = (n: number, answerCorrect: boolean, reasoningSound: boolean, extra: { codes?: string[]; borderline?: boolean } = {}) => ({
  type: 'attemptJudged' as const,
  attempt: record(n),
  answerCorrect,
  reasoningSound,
  codes: extra.codes ?? [],
  borderline: extra.borderline ?? false,
});

describe('applySegmentEvent', () => {
  it('started: opens round 1 on the server and saves the phone copy', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', initialSegmentState, { type: 'started' });
    expect(r.ok).toBe(true);
    expect(repo.calls).toEqual([
      ['startRound', '1A', 1],
      ['saveLocal', '1A', 'trying', 1, 0],
    ]);
  });

  it('a failed try: the attempt is saved with its round and try number, nothing else', async () => {
    const repo = fakeRepo();
    await applySegmentEvent(repo, '1A', trying({ triesUsed: 1 }), judged(1, false, false, { codes: ['1A-M1'] }));
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(1), 1, 2],
      ['saveLocal', '1A', 'trying', 1, 2],
    ]);
  });

  it('complete on the first try: the attempt is saved, no flag', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', trying(), judged(1, true, true));
    expect(r.ok && r.state.status).toBe('complete');
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(1), 1, 1],
      ['saveLocal', '1A', 'ended', 1, 0],
    ]);
  });

  it('third failed try: raise-flag stalled and Recommended refreshed (FR-24, FR-25)', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', trying({ triesUsed: 2 }), judged(3, false, true));
    expect(r.ok && r.state.status).toBe('moved_on');
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(3), 1, 3],
      ['raiseFlag', 'stalled', '1A', null],
      ['refreshRecommended'],
      ['saveLocal', '1A', 'ended', 1, 3],
    ]);
  });

  it('moved on, then complete in a later round: Recommended refreshed (the server clears the flag)', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', trying({ status: 'moved_on', round: 2 }), judged(4, true, true));
    expect(r.ok && r.effects).toEqual([{ type: 'clearStalledFlag' }]);
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(4), 2, 1],
      ['refreshRecommended'],
      ['saveLocal', '1A', 'ended', 2, 0],
    ]);
  });

  it('moved on, failed again: no second flag (the server adds a note)', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', trying({ status: 'moved_on', round: 2, triesUsed: 2 }), judged(5, false, false));
    expect(r.ok && r.effects).toEqual([{ type: 'noteStalledFlag' }]);
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(5), 2, 3],
      ['saveLocal', '1A', 'ended', 2, 3],
    ]);
  });

  it('lucky guess: logged by the attempt row itself, no extra call (FR-21)', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', trying(), judged(6, true, false, { codes: ['1A-M2'] }));
    expect(r.ok && r.effects).toEqual([{ type: 'logLuckyGuess', codes: ['1A-M2'] }]);
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(6), 1, 1],
      ['saveLocal', '1A', 'trying', 1, 1],
    ]);
  });

  it('a tie-break on an unsure verdict: raise-flag borderline for that attempt, after saving it (FR-22)', async () => {
    const repo = fakeRepo();
    await applySegmentEvent(repo, '1A', trying(), judged(7, false, true, { borderline: true }));
    expect(repo.calls).toEqual([
      ['saveAttempt', uuid(7), 1, 1],
      ['raiseFlag', 'borderline', '1A', uuid(7)],
      ['saveLocal', '1A', 'trying', 1, 1],
    ]);
  });

  it('an attempt with no verdict (safeguarding): saved, no try used, state unchanged (rule 14)', async () => {
    const repo = fakeRepo();
    const before = trying({ triesUsed: 1 });
    const r = await applySegmentEvent(repo, '1A', before, { type: 'attemptUnjudged', attempt: record(8) });
    expect(r).toEqual({ ok: true, state: before, effects: [] });
    expect(repo.calls).toEqual([['saveAttempt', uuid(8), 1, 2]]);
  });

  it('an attempt with no verdict outside an open round is refused, nothing saved', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', initialSegmentState, { type: 'attemptUnjudged', attempt: record(9) });
    expect(r.ok).toBe(false);
    expect(repo.calls).toEqual([]);
  });

  it('moved on (the way forward): only the phone copy changes', async () => {
    const repo = fakeRepo();
    const ended = trying({ status: 'moved_on', phase: 'ended', triesUsed: 3 });
    await applySegmentEvent(repo, '1A', ended, { type: 'movedOn' });
    expect(repo.calls).toEqual([['saveLocal', '1A', 'away', 1, 3]]);
  });

  it('returned later or Relearn: the server opens the next round (D-48)', async () => {
    const repo = fakeRepo();
    const ended = trying({ status: 'complete', phase: 'ended' });
    const r = await applySegmentEvent(repo, '1A', ended, { type: 'returnedLater' });
    expect(r.ok && r.state.round).toBe(2);
    expect(repo.calls).toEqual([
      ['startRound', '1A', 2],
      ['saveLocal', '1A', 'trying', 2, 0],
    ]);
  });

  it('an impossible event makes no call at all', async () => {
    const repo = fakeRepo();
    const r = await applySegmentEvent(repo, '1A', initialSegmentState, judged(10, true, true));
    expect(r.ok).toBe(false);
    expect(repo.calls).toEqual([]);
  });

  it('the attempt id is kept exactly, so a resend never makes a second row', async () => {
    const repo = fakeRepo();
    const ev = judged(11, false, false);
    await applySegmentEvent(repo, '1A', trying(), ev);
    expect(repo.calls[0]).toEqual(['saveAttempt', ev.attempt.attempt_id, 1, 1]);
  });
});
