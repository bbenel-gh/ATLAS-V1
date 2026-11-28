import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { AppState } from 'react-native';

import { interpretLessonReply, lessonQueueNext, type LessonSendOutcome } from '@/domain/segmentSync';

import { getEnv } from './env';
import { signedInUserId, withTimeout } from './pupilAuth';
import type { FlagRequest, QueuedAttempt } from './segmentEngine';
import { supabase } from './supabase';

/**
 * Lesson writes: on the phone first, then sent in order (runbook S20 item 4, D-54).
 *
 * Kept per auth user, so a shared phone never sends one pupil's words as
 * another. Jobs go oldest first and the queue stops at the first one that is
 * offline or meets server trouble, so a round always opens before its
 * attempts. Every job is safe to send twice: an attempt carries its id made
 * on the phone, a round start names its round, a flag is checked on the server.
 * A refused job is dropped (and reported without the pupil's words) so the
 * queue never blocks.
 */

export type LessonJob =
  | { kind: 'attempt'; segmentCode: string; attempt: QueuedAttempt; serverErrors: number }
  | { kind: 'round'; segmentCode: string; round: number; serverErrors: number }
  | { kind: 'flag'; segmentCode: string; flag: FlagRequest; serverErrors: number };

export type NewLessonJob =
  | { kind: 'attempt'; segmentCode: string; attempt: QueuedAttempt }
  | { kind: 'round'; segmentCode: string; round: number }
  | { kind: 'flag'; segmentCode: string; flag: FlagRequest };

/** save-attempt may wait on nothing slow, but a weak signal can be slow. The pupil is not waiting. */
const SEND_TIMEOUT_MS = 30_000;
const RETRY_MS = 15_000;

const key = (userId: string) => `atlas.lessonQueue.${userId}`;

async function readQueue(userId: string): Promise<LessonJob[]> {
  try {
    const text = await AsyncStorage.getItem(key(userId));
    const list = text ? (JSON.parse(text) as unknown) : [];
    return Array.isArray(list) ? (list as LessonJob[]).filter((j) => typeof j?.kind === 'string') : [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, list: LessonJob[]): Promise<void> {
  if (list.length === 0) await AsyncStorage.removeItem(key(userId));
  else await AsyncStorage.setItem(key(userId), JSON.stringify(list));
}

const sameJob = (a: LessonJob, b: LessonJob) => JSON.stringify({ ...a, serverErrors: 0 }) === JSON.stringify({ ...b, serverErrors: 0 });

/** Keeps the job on the phone, then tries to send. Resolves once it is safe on the phone. */
export async function queueLessonJob(job: NewLessonJob): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  await writeQueue(userId, [...(await readQueue(userId)), { ...job, serverErrors: 0 } as LessonJob]);
  void syncLessons();
}

/** How many writes for this segment are still on the phone. */
export async function pendingLessonJobs(segmentCode: string): Promise<number> {
  const userId = await signedInUserId();
  if (!userId) return 0;
  return (await readQueue(userId)).filter((j) => j.segmentCode === segmentCode).length;
}

async function post(fn: string, token: string, body: unknown): Promise<LessonSendOutcome> {
  const { supabaseUrl, supabaseAnonKey } = getEnv();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
      method: 'POST',
      headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    let reply: unknown = null;
    try {
      reply = await res.json();
    } catch {
      // A missing body reads as server trouble.
    }
    return interpretLessonReply(res.status, reply);
  } finally {
    clearTimeout(timer);
  }
}

async function sendOne(job: LessonJob): Promise<LessonSendOutcome> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return 'offline';
    const userId = data.session?.user.id ?? '';
    const pupil = await withTimeout((signal) =>
      supabase.from('pupils').select('id').eq('user_id', userId).abortSignal(signal).maybeSingle(),
    );
    if (pupil.error || !pupil.data) return 'offline';
    const pupilId = pupil.data.id;

    if (job.kind === 'attempt') return await post('save-attempt', token, { ...job.attempt, pupil_id: pupilId });
    if (job.kind === 'flag') {
      return await post('raise-flag', token, {
        pupil_id: pupilId,
        kind: job.flag.kind,
        segment_code: job.flag.segmentCode,
        ...(job.flag.attemptId ? { attempt_id: job.flag.attemptId } : {}),
      });
    }

    // A round: the server opens it for the signed-in pupil (D-29, D-48).
    const seg = await withTimeout((signal) =>
      supabase.from('segments').select('id').eq('code', job.segmentCode).abortSignal(signal).limit(1).maybeSingle(),
    );
    if (seg.error) return 'offline';
    if (!seg.data) return 'refused';
    const segmentId = seg.data.id;
    const rpc = await withTimeout((signal) =>
      supabase.rpc('start_segment_round', { p_segment_id: segmentId, p_round: job.round }).abortSignal(signal),
    );
    if (!rpc.error) return 'sent';
    return rpc.error.code === '22023' || rpc.error.code === '42501' ? 'refused' : 'server';
  } catch {
    return 'offline';
  }
}

let inFlight: Promise<void> | null = null;

/** Sends what is waiting, oldest first. Stops at the first job that has to wait. */
export function syncLessons(): Promise<void> {
  inFlight ??= sendPending().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function sendPending(): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  for (const job of await readQueue(userId)) {
    const outcome = await sendOne(job);
    const step = lessonQueueNext(job.serverErrors, outcome);
    if (step.action === 'drop') {
      // Never the pupil's words: only what kind of write it was and why.
      Sentry.captureMessage('Lesson write dropped', { level: 'warning', extra: { kind: job.kind, segment: job.segmentCode, why: step.why } });
    }
    // Read again: a new job may have been queued while this one was on its way.
    const now = await readQueue(userId);
    await writeQueue(
      userId,
      step.action === 'keep' ? now.map((j) => (sameJob(j, job) ? { ...j, serverErrors: step.serverErrors } : j)) : now.filter((j) => !sameJob(j, job)),
    );
    if (step.action === 'keep') return;
  }
}

let started = false;

/** Once per app run: retry every 15 seconds and whenever the app comes back. */
export function startLessonSync(): void {
  if (started) return;
  started = true;
  setInterval(() => void syncLessons(), RETRY_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncLessons();
  });
  void syncLessons();
}
