/**
 * Segment sync rules (runbook S20 items 2 and 4; D-29, D-48, D-54).
 *
 * The server owns progress (segment_status). The phone keeps its own copy so
 * a pupil is never trapped offline (rule 5). While lesson writes are still
 * waiting on the phone, the phone copy is the newer one.
 */
import { initialSegmentState, type SegmentState, type SegmentStatus } from './tries.ts';

/** A segment_status row, with version ids already turned into labels. */
export type ServerProgress = {
  status: SegmentStatus;
  round: number;
  triesUsed: number;
  roundDone: boolean;
  versionsSeen: string[];
  lastCodes: string[];
};

export function stateFromServer(p: ServerProgress | null): SegmentState {
  if (!p || p.status === 'not_started') return { ...initialSegmentState, versionsSeen: [], lastCodes: [] };
  return {
    status: p.status,
    phase: p.roundDone ? 'ended' : 'trying',
    round: p.round,
    triesUsed: p.triesUsed,
    versionsSeen: [...p.versionsSeen],
    lastCodes: [...p.lastCodes],
  };
}

/** segment_status.versions_seen holds ids; the reducer uses labels. Order kept, unknown and repeated ids dropped. */
export function labelsFromIds(ids: readonly string[], versions: readonly { id: string; label: string }[]): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const label = versions.find((v) => v.id === id)?.label;
    if (label && !out.includes(label)) out.push(label);
  }
  return out;
}

/**
 * Which state to show. Writes waiting: the phone copy. Nothing waiting: the
 * server, keeping the phone's "away" (the pupil already took the way forward)
 * when the server says that same round ended.
 */
export function chooseSegmentState(local: SegmentState | null, server: SegmentState | null, pending: number): SegmentState {
  if (pending > 0 && local) return local;
  if (!server) return local ?? { ...initialSegmentState, versionsSeen: [], lastCodes: [] };
  if (local?.phase === 'away' && server.phase === 'ended' && local.round === server.round) return { ...server, phase: 'away' };
  return server;
}

export type LessonSendOutcome = 'sent' | 'offline' | 'server' | 'refused';

/** Reads a save-attempt, raise-flag or round reply. */
export function interpretLessonReply(status: number, body: unknown): LessonSendOutcome {
  if (status === 200) {
    return body !== null && typeof body === 'object' && (body as { ok?: unknown }).ok === true ? 'sent' : 'server';
  }
  if (status === 401) return 'offline';
  if (status === 400 || status === 403 || status === 409) return 'refused';
  return 'server';
}

/** Server errors in a row before a queued write is given up (reported, never silently). */
export const LESSON_SEND_MAX_SERVER_ERRORS = 10;

export type LessonQueueStep =
  | { action: 'done' }
  | { action: 'keep'; serverErrors: number }
  | { action: 'drop'; why: 'server' | 'refused' };

export function lessonQueueNext(serverErrors: number, outcome: LessonSendOutcome): LessonQueueStep {
  switch (outcome) {
    case 'sent':
      return { action: 'done' };
    case 'offline':
      return { action: 'keep', serverErrors };
    case 'refused':
      return { action: 'drop', why: 'refused' };
    case 'server':
      return serverErrors + 1 >= LESSON_SEND_MAX_SERVER_ERRORS ? { action: 'drop', why: 'server' } : { action: 'keep', serverErrors: serverErrors + 1 };
  }
}
