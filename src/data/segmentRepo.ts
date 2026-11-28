import AsyncStorage from '@react-native-async-storage/async-storage';

import { labelsFromIds, stateFromServer } from '@/domain/segmentSync';
import type { SegmentState } from '@/domain/tries';

import { queueLessonJob } from './lessonQueue';
import { signedInUserId, withTimeout } from './pupilAuth';
import type { SegmentRepo } from './segmentEngine';
import { supabase } from './supabase';

/**
 * Segment progress on the phone and on the server (runbook S20 item 1, D-54).
 *
 * Reads: segment_status with the pupil's own session (RLS: own rows only),
 * version ids turned into labels, and the codes of the latest judged attempt.
 * Writes never go straight to the database: attempts, round starts and flags
 * are queued (src/data/lessonQueue.ts) and sent to save-attempt,
 * start_segment_round and raise-flag. Pupils cannot insert attempts or flags.
 */

const localKey = (userId: string, segmentCode: string) => `atlas.segment.${userId}.${segmentCode}`;

export async function readLocalSegment(segmentCode: string): Promise<SegmentState | null> {
  const userId = await signedInUserId();
  if (!userId) return null;
  try {
    const text = await AsyncStorage.getItem(localKey(userId, segmentCode));
    if (!text) return null;
    const s = JSON.parse(text) as SegmentState;
    return typeof s.phase === 'string' && Array.isArray(s.versionsSeen) ? s : null;
  } catch {
    return null;
  }
}

async function writeLocalSegment(segmentCode: string, state: SegmentState): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  try {
    await AsyncStorage.setItem(localKey(userId, segmentCode), JSON.stringify(state));
  } catch {
    // The queue still holds the writes; only the phone copy of the state is lost.
  }
}

/** The server's state for this segment, or null when it cannot be read (offline). */
export async function fetchServerSegment(segmentCode: string): Promise<SegmentState | null> {
  try {
    const userId = await signedInUserId();
    if (!userId) return null;
    const pupil = await withTimeout((signal) =>
      supabase.from('pupils').select('id').eq('user_id', userId).abortSignal(signal).maybeSingle(),
    );
    if (pupil.error || !pupil.data) return null;
    const seg = await withTimeout((signal) =>
      supabase.from('segments').select('id, video_versions (id, label)').eq('code', segmentCode).abortSignal(signal).limit(1).maybeSingle(),
    );
    if (seg.error || !seg.data) return null;
    const pupilId = pupil.data.id;
    const segmentId = seg.data.id;
    const versions = seg.data.video_versions;
    const status = await withTimeout((signal) =>
      supabase
        .from('segment_status')
        .select('status, round, tries_used, round_done, versions_seen')
        .eq('pupil_id', pupilId)
        .eq('segment_id', segmentId)
        .abortSignal(signal)
        .maybeSingle(),
    );
    if (status.error) return null;
    if (!status.data) return stateFromServer(null);
    const last = await withTimeout((signal) =>
      supabase
        .from('attempts')
        .select('misconception_codes')
        .eq('pupil_id', pupilId)
        .eq('segment_id', segmentId)
        .not('answer_verdict', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .abortSignal(signal),
    );
    if (last.error) return null;
    return stateFromServer({
      status: status.data.status,
      round: status.data.round,
      triesUsed: status.data.tries_used,
      roundDone: status.data.round_done,
      versionsSeen: labelsFromIds(status.data.versions_seen, versions),
      lastCodes: last.data[0]?.misconception_codes ?? [],
    });
  } catch {
    return null;
  }
}

/** The repository the segment engine writes through. refreshRecommended comes from the screen (React Query). */
export function makeSegmentRepo(refreshRecommended: () => Promise<void>): SegmentRepo {
  return {
    saveAttempt: (attempt) => queueLessonJob({ kind: 'attempt', segmentCode: attempt.segment_code, attempt }),
    startRound: (segmentCode, round) => queueLessonJob({ kind: 'round', segmentCode, round }),
    raiseFlag: (flag) => queueLessonJob({ kind: 'flag', segmentCode: flag.segmentCode, flag }),
    refreshRecommended,
    saveLocal: writeLocalSegment,
  };
}
