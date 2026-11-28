/**
 * S20 segment sync rules (runbook S20 items 2 and 4; D-29, D-48).
 * Written before src/domain/segmentSync.ts.
 *
 * The server owns progress. The phone keeps its own copy so a pupil is never
 * trapped offline (rule 5); while the phone still has lesson writes waiting,
 * its copy is newer than the server's.
 */
import { initialSegmentState, type SegmentState } from './tries';
import {
  LESSON_SEND_MAX_SERVER_ERRORS,
  chooseSegmentState,
  interpretLessonReply,
  labelsFromIds,
  lessonQueueNext,
  stateFromServer,
  type ServerProgress,
} from './segmentSync';

const progress = (over: Partial<ServerProgress> = {}): ServerProgress => ({
  status: 'in_progress',
  round: 1,
  triesUsed: 1,
  roundDone: false,
  versionsSeen: ['a'],
  lastCodes: ['1A-M1'],
  ...over,
});

describe('stateFromServer', () => {
  it('no row: the segment has not started', () => {
    expect(stateFromServer(null)).toEqual(initialSegmentState);
  });

  it('a not_started row is before the first round', () => {
    expect(stateFromServer(progress({ status: 'not_started', triesUsed: 0, versionsSeen: [], lastCodes: [] }))).toEqual(initialSegmentState);
  });

  it('an open round is trying, with tries, versions and codes', () => {
    expect(stateFromServer(progress())).toEqual({
      status: 'in_progress',
      phase: 'trying',
      round: 1,
      triesUsed: 1,
      versionsSeen: ['a'],
      lastCodes: ['1A-M1'],
    });
  });

  it('a finished round is ended: complete', () => {
    expect(stateFromServer(progress({ status: 'complete', roundDone: true }))).toMatchObject({ status: 'complete', phase: 'ended' });
  });

  it('a finished round is ended: moved on after 3 tries', () => {
    expect(stateFromServer(progress({ status: 'moved_on', triesUsed: 3, roundDone: true }))).toMatchObject({
      status: 'moved_on',
      phase: 'ended',
      triesUsed: 3,
    });
  });

  it('a Relearn round on a complete segment is trying, status stays complete', () => {
    expect(stateFromServer(progress({ status: 'complete', round: 2, triesUsed: 0, roundDone: false }))).toMatchObject({
      status: 'complete',
      phase: 'trying',
      round: 2,
      triesUsed: 0,
    });
  });

  it('copies the lists so the caller cannot change them', () => {
    const p = progress();
    const s = stateFromServer(p);
    s.versionsSeen.push('z');
    expect(p.versionsSeen).toEqual(['a']);
  });
});

describe('labelsFromIds', () => {
  const versions = [
    { id: 'v-a', label: 'a' },
    { id: 'v-b', label: 'b' },
    { id: 'v-c', label: 'c' },
  ];

  it('keeps the order seen and drops unknown ids', () => {
    expect(labelsFromIds(['v-c', 'gone', 'v-a'], versions)).toEqual(['c', 'a']);
  });

  it('drops repeats', () => {
    expect(labelsFromIds(['v-b', 'v-b'], versions)).toEqual(['b']);
  });
});

describe('chooseSegmentState', () => {
  const local: SegmentState = { ...initialSegmentState, status: 'in_progress', phase: 'trying', round: 1, triesUsed: 2 };
  const server: SegmentState = { ...initialSegmentState, status: 'in_progress', phase: 'trying', round: 1, triesUsed: 1 };

  it('while writes are waiting on the phone, the phone copy wins', () => {
    expect(chooseSegmentState(local, server, 1)).toBe(local);
  });

  it('with nothing waiting, the server wins', () => {
    expect(chooseSegmentState(local, server, 0)).toBe(server);
  });

  it('offline with no server copy: the phone copy, else not started', () => {
    expect(chooseSegmentState(local, null, 0)).toBe(local);
    expect(chooseSegmentState(null, null, 0)).toEqual(initialSegmentState);
  });

  it('writes waiting but no phone copy: the server copy', () => {
    expect(chooseSegmentState(null, server, 2)).toBe(server);
  });

  it('keeps "away" from the phone when the server says the same round ended', () => {
    const away: SegmentState = { ...local, status: 'moved_on', phase: 'away', triesUsed: 3 };
    const ended: SegmentState = { ...server, status: 'moved_on', phase: 'ended', triesUsed: 3 };
    expect(chooseSegmentState(away, ended, 0)).toEqual({ ...ended, phase: 'away' });
  });

  it('does not keep "away" from an older round', () => {
    const away: SegmentState = { ...local, phase: 'away', round: 1 };
    const ended: SegmentState = { ...server, status: 'complete', phase: 'ended', round: 2 };
    expect(chooseSegmentState(away, ended, 0)).toBe(ended);
  });
});

describe('interpretLessonReply', () => {
  it('200 with ok is sent', () => {
    expect(interpretLessonReply(200, { ok: true })).toBe('sent');
    expect(interpretLessonReply(200, { ok: true, duplicate: true })).toBe('sent');
  });

  it('401 means the session is gone: try again later', () => {
    expect(interpretLessonReply(401, { error: 'forbidden' })).toBe('offline');
  });

  it('400, 403 and 409 are refused: retrying will never help', () => {
    expect(interpretLessonReply(400, { error: 'bad_input' })).toBe('refused');
    expect(interpretLessonReply(403, { error: 'forbidden' })).toBe('refused');
    expect(interpretLessonReply(409, { error: 'wrong_round' })).toBe('refused');
  });

  it('429, 5xx, a missing body or a 200 without ok are server trouble', () => {
    expect(interpretLessonReply(429, null)).toBe('server');
    expect(interpretLessonReply(500, { error: 'server' })).toBe('server');
    expect(interpretLessonReply(502, null)).toBe('server');
    expect(interpretLessonReply(200, null)).toBe('server');
    expect(interpretLessonReply(200, { fallback: true })).toBe('server');
  });
});

describe('lessonQueueNext', () => {
  it('sent: done', () => {
    expect(lessonQueueNext(0, 'sent')).toEqual({ action: 'done' });
  });

  it('offline: keep, the count does not grow', () => {
    expect(lessonQueueNext(2, 'offline')).toEqual({ action: 'keep', serverErrors: 2 });
  });

  it('server trouble: keep and count, then drop after the limit', () => {
    expect(lessonQueueNext(0, 'server')).toEqual({ action: 'keep', serverErrors: 1 });
    expect(lessonQueueNext(LESSON_SEND_MAX_SERVER_ERRORS - 2, 'server')).toEqual({
      action: 'keep',
      serverErrors: LESSON_SEND_MAX_SERVER_ERRORS - 1,
    });
    expect(lessonQueueNext(LESSON_SEND_MAX_SERVER_ERRORS - 1, 'server')).toEqual({ action: 'drop', why: 'server' });
  });

  it('refused: drop at once so the queue is never blocked', () => {
    expect(lessonQueueNext(0, 'refused')).toEqual({ action: 'drop', why: 'refused' });
  });
});
