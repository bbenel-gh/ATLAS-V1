import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { AppState } from 'react-native';

import { interpretOverviewReply, OVERVIEW_TEXT_MAX, queueNext, type SendOutcome } from '@/domain/overview';

import { getEnv } from './env';
import { signedInUserId, withTimeout } from './pupilAuth';
import { supabase } from './supabase';

/**
 * Overview answers: on the phone first, then sent to ai-overview (runbook S17
 * items 4 and 5, FR-13, D-49).
 *
 * The pupil sees the thanks message as soon as the answer is on the phone and
 * never waits for the network. Each answer has its own id made here, so
 * sending it twice never makes a second row or a second AI call. Kept per auth
 * user, so a shared phone never sends one pupil's words as another. The rules
 * for keep or drop are in src/domain/overview.ts (queueNext).
 */

export type QueuedOverview = {
  responseId: string;
  topicCode: string;
  summary: string;
  confusing: string;
  clientCreatedAt: string;
  /** AI tries that ended in a fallback. Offline tries do not count. */
  attempts: number;
};

/** Two AI tries of up to 20 seconds each, plus the saves. The pupil is not waiting. */
const SEND_TIMEOUT_MS = 55_000;
const RETRY_MS = 15_000;

const key = (userId: string) => `atlas.overviewQueue.${userId}`;

async function readQueue(userId: string): Promise<QueuedOverview[]> {
  try {
    const text = await AsyncStorage.getItem(key(userId));
    const list = text ? (JSON.parse(text) as unknown) : [];
    return Array.isArray(list) ? (list as QueuedOverview[]).filter((i) => typeof i?.responseId === 'string') : [];
  } catch {
    return [];
  }
}

async function writeQueue(userId: string, list: QueuedOverview[]): Promise<void> {
  if (list.length === 0) await AsyncStorage.removeItem(key(userId));
  else await AsyncStorage.setItem(key(userId), JSON.stringify(list));
}

/** Keeps the answer on the phone, then tries to send it. Resolves once it is safe on the phone. */
export async function queueOverview(topicCode: string, summary: string, confusing: string): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  const item: QueuedOverview = {
    responseId: randomUUID(),
    topicCode,
    summary: summary.trim().slice(0, OVERVIEW_TEXT_MAX),
    confusing: confusing.trim().slice(0, OVERVIEW_TEXT_MAX),
    clientCreatedAt: new Date().toISOString(),
    attempts: 0,
  };
  await writeQueue(userId, [...(await readQueue(userId)), item]);
  void syncOverview();
}

async function sendOne(item: QueuedOverview): Promise<SendOutcome> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return 'offline';
    const userId = data.session?.user.id ?? '';
    const pupil = await withTimeout((signal) =>
      supabase.from('pupils').select('id').eq('user_id', userId).abortSignal(signal).maybeSingle(),
    );
    if (pupil.error || !pupil.data) return 'offline';

    const { supabaseUrl, supabaseAnonKey } = getEnv();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/ai-overview`, {
        method: 'POST',
        headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pupil_id: pupil.data.id,
          topic_code: item.topicCode,
          response_id: item.responseId,
          summary_text: item.summary,
          confusing_text: item.confusing,
          client_created_at: item.clientCreatedAt,
        }),
        signal: controller.signal,
      });
      let body: unknown = null;
      try {
        body = await res.json();
      } catch {
        // interpretOverviewReply reads a missing body as a server error.
      }
      return interpretOverviewReply(res.status, body);
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return 'offline';
  }
}

let inFlight: Promise<void> | null = null;

/** Sends what is waiting, oldest first. Stops at the first offline answer. */
export function syncOverview(): Promise<void> {
  inFlight ??= sendPending().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function sendPending(): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  for (const item of await readQueue(userId)) {
    const outcome = await sendOne(item);
    const step = queueNext(item, outcome);
    // Read again: a new answer may have been queued while this one was on its way.
    const now = await readQueue(userId);
    await writeQueue(
      userId,
      step.action === 'done'
        ? now.filter((i) => i.responseId !== item.responseId)
        : now.map((i) => (i.responseId === item.responseId ? { ...i, attempts: step.attempts } : i)),
    );
    if (outcome === 'offline' || outcome === 'server') return;
  }
}

let started = false;

/** Once per app run: retry every 15 seconds and whenever the app comes back. */
export function startOverviewSync(): void {
  if (started) return;
  started = true;
  setInterval(() => void syncOverview(), RETRY_MS);
  AppState.addEventListener('change', (state) => {
    if (state === 'active') void syncOverview();
  });
  void syncOverview();
}
