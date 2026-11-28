/**
 * Runs one segment event through the tries reducer (S18) and turns the result
 * into repository calls (runbook S20 items 2 and 5, D-54).
 *
 * What the server does by itself (D-29), so the phone sends nothing more:
 * moving on raises the stalled flag, a failed round on a moved-on segment
 * notes it, completing clears it (triggers on attempts and segment_status).
 * A lucky guess is the attempt row itself (answer yes, reason no). Recommended
 * follows segment_status, so the phone only refreshes Home.
 * The phone still asks raise-flag for a stalled flag: it only makes sure the
 * flag exists, so a missed trigger can never hide a stalled pupil.
 */
import type { SaveAttemptInput } from '@/domain/attempt';
import { currentTry, reduceSegment, type SegmentState, type TriesResult } from '@/domain/tries';

/** An attempt as the phone queues it. Round, try and pupil id are added when it is saved and sent. */
export type AttemptRecord = Omit<SaveAttemptInput, 'pupil_id' | 'round' | 'try_number'>;
export type QueuedAttempt = Omit<SaveAttemptInput, 'pupil_id'>;

export type FlagRequest = { kind: 'stalled' | 'borderline'; segmentCode: string; attemptId?: string };

export type SegmentRepo = {
  saveAttempt(a: QueuedAttempt): Promise<void>;
  startRound(segmentCode: string, round: number): Promise<void>;
  raiseFlag(f: FlagRequest): Promise<void>;
  refreshRecommended(): Promise<void>;
  saveLocal(segmentCode: string, state: SegmentState): Promise<void>;
};

export type EngineEvent =
  | { type: 'started' }
  | {
      type: 'attemptJudged';
      attempt: AttemptRecord;
      /** Final verdicts, after the tie-break (resolveAttempt). */
      answerCorrect: boolean;
      reasoningSound: boolean;
      codes: string[];
      /** An unsure AI verdict was settled by a tap: the admin reviews it (FR-22). */
      borderline: boolean;
    }
  /** Saved with no verdict (safeguarding, or nothing to judge it by): no try used. */
  | { type: 'attemptUnjudged'; attempt: AttemptRecord }
  | { type: 'movedOn' }
  | { type: 'returnedLater' };

export async function applySegmentEvent(
  repo: SegmentRepo,
  segmentCode: string,
  state: SegmentState,
  event: EngineEvent,
): Promise<TriesResult> {
  if (event.type === 'attemptUnjudged') {
    const tryNumber = currentTry(state);
    if (tryNumber === null) return { ok: false, reason: 'No round is open, so no attempt can be saved.' };
    await repo.saveAttempt({ ...event.attempt, round: state.round, try_number: tryNumber });
    return { ok: true, state, effects: [] };
  }

  const tryNumber = currentTry(state);
  const result = reduceSegment(
    state,
    event.type === 'attemptJudged'
      ? {
          type: 'attemptJudged',
          versionLabel: event.attempt.version_label,
          answerCorrect: event.answerCorrect,
          reasoningSound: event.reasoningSound,
          codes: event.codes,
        }
      : event,
  );
  if (!result.ok) return result;

  if (event.type === 'started' || event.type === 'returnedLater') {
    await repo.startRound(segmentCode, result.state.round);
  }

  if (event.type === 'attemptJudged' && tryNumber !== null) {
    await repo.saveAttempt({ ...event.attempt, round: state.round, try_number: tryNumber });
    if (event.borderline) await repo.raiseFlag({ kind: 'borderline', segmentCode, attemptId: event.attempt.attempt_id });
  }

  let refresh = false;
  for (const effect of result.effects) {
    if (effect.type === 'raiseStalledFlag') {
      await repo.raiseFlag({ kind: 'stalled', segmentCode });
      refresh = true;
    } else if (effect.type === 'clearStalledFlag') {
      refresh = true;
    }
    // noteStalledFlag: the server notes the open flag. logLuckyGuess: the attempt row is the record.
  }
  if (refresh) await repo.refreshRecommended();

  await repo.saveLocal(segmentCode, result.state);
  return result;
}
