/**
 * The tries rule for one segment (specs/prd.md FR-19 to FR-26a,
 * specs/framework.md stages 4 and 5, specs/B6.md with the D-48 amendment).
 * Pure TypeScript, no React.
 *
 * KEEP IN STEP (BL-14): the server applies the same rule in SQL, in
 * public.attempts_sync_segment_status
 * (supabase/migrations/20261124220000_server_owned_progress.sql). The server
 * owns progress (D-29); this reducer lets the app show the right next step.
 * Any change to the rule is made in both places. The SQL has no rounds yet
 * (Relearn rounds come with the S20 migration).
 *
 * Verdicts arrive already resolved to yes or no: the "unsure" tie-break
 * (FR-22) happens before this reducer (S22).
 */

export const MAX_TRIES = 3;

/** Best status so far. It never goes down (D-48). */
export type SegmentStatus = 'not_started' | 'in_progress' | 'complete' | 'moved_on';

/**
 * Where the pupil is in the current round.
 * before: not started. trying: a round is open. ended: the round finished
 * (complete, or 3 failed tries) and the end screen shows. away: the pupil
 * took the way forward.
 */
export type RoundPhase = 'before' | 'trying' | 'ended' | 'away';

export type SegmentState = {
  status: SegmentStatus;
  phase: RoundPhase;
  /** 1 for the first round; each Relearn or return adds one. 0 before starting. */
  round: number;
  /** Tries used in the current round, 0 to 3. */
  triesUsed: number;
  /** Version labels shown in any round, in order, without duplicates. */
  versionsSeen: string[];
  /** Misconception codes of the last judged attempt, without duplicates. */
  lastCodes: string[];
};

export type SegmentEvent =
  | { type: 'started' }
  | {
      type: 'attemptJudged';
      /** null for a worked-example try (no video shown). */
      versionLabel: string | null;
      answerCorrect: boolean;
      reasoningSound: boolean;
      codes: readonly string[];
    }
  | { type: 'movedOn' }
  | { type: 'returnedLater' };

export type TriesEffect =
  | { type: 'raiseStalledFlag' }
  /** A failed round on a moved-on segment adds a note to the open flag (FR-26a). */
  | { type: 'noteStalledFlag' }
  | { type: 'clearStalledFlag' }
  /** Right answer, wrong reason (FR-21). */
  | { type: 'logLuckyGuess'; codes: string[] };

export type TriesResult = { ok: true; state: SegmentState; effects: TriesEffect[] } | { ok: false; reason: string };

export const initialSegmentState: SegmentState = {
  status: 'not_started',
  phase: 'before',
  round: 0,
  triesUsed: 0,
  versionsSeen: [],
  lastCodes: [],
};

/** The try number of the next attempt, or null when no round is open. */
export function currentTry(state: SegmentState): number | null {
  return state.phase === 'trying' ? state.triesUsed + 1 : null;
}

const reject = (reason: string): TriesResult => ({ ok: false, reason });

function dedupe(codes: readonly string[]): string[] {
  return codes.filter((c, i) => codes.indexOf(c) === i);
}

export function reduceSegment(state: SegmentState, event: SegmentEvent): TriesResult {
  switch (event.type) {
    case 'started':
      if (state.phase !== 'before') return reject('The segment has already started.');
      return {
        ok: true,
        state: { ...state, status: 'in_progress', phase: 'trying', round: 1 },
        effects: [],
      };

    case 'attemptJudged': {
      if (state.phase !== 'trying') return reject('No round is open, so no attempt can be judged.');
      const lastCodes = dedupe(event.codes);
      const versionsSeen =
        event.versionLabel === null || state.versionsSeen.includes(event.versionLabel)
          ? [...state.versionsSeen]
          : [...state.versionsSeen, event.versionLabel];
      const base = { ...state, versionsSeen, lastCodes };

      if (event.answerCorrect && event.reasoningSound) {
        const effects: TriesEffect[] = state.status === 'moved_on' ? [{ type: 'clearStalledFlag' }] : [];
        return {
          ok: true,
          state: { ...base, status: 'complete', phase: 'ended' },
          effects,
        };
      }

      const effects: TriesEffect[] = event.answerCorrect ? [{ type: 'logLuckyGuess', codes: lastCodes }] : [];
      const triesUsed = state.triesUsed + 1;
      if (triesUsed < MAX_TRIES) return { ok: true, state: { ...base, triesUsed }, effects };

      let status = state.status;
      if (status === 'in_progress') {
        status = 'moved_on';
        effects.push({ type: 'raiseStalledFlag' });
      } else if (status === 'moved_on') {
        effects.push({ type: 'noteStalledFlag' });
      }
      return {
        ok: true,
        state: { ...base, triesUsed, status, phase: 'ended' },
        effects,
      };
    }

    case 'movedOn':
      if (state.phase !== 'ended') return reject('Moving on is only possible at the end of a round.');
      return { ok: true, state: { ...state, phase: 'away' }, effects: [] };

    case 'returnedLater':
      if (state.phase !== 'ended' && state.phase !== 'away') {
        return reject('A new round can only start after a round has ended.');
      }
      return {
        ok: true,
        state: {
          ...state,
          phase: 'trying',
          round: state.round + 1,
          triesUsed: 0,
        },
        effects: [],
      };

    default:
      return reject('Unknown event.');
  }
}
