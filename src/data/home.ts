import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import type { HomeInput } from '@/domain/home';

import { readHomeCache, writeHomeCache, type HomeSnapshot } from './homeCache';
import { toHomeInput, type ClassTopicRow, type MasteryRow, type SegmentStatusRow, type TopicRow } from './homeData';
import { OfflineError, signedInUserId, withTimeout } from './pupilAuth';
import { supabase } from './supabase';

/**
 * Home data (runbook S15). Every read uses the pupil's own session, so RLS
 * limits it to their own rows and their own class. No AI call anywhere.
 */
export async function fetchHome(userId: string): Promise<HomeSnapshot> {
  const pupil = await withTimeout((signal) =>
    supabase.from('pupils').select('id, display_name, class_id').eq('user_id', userId).abortSignal(signal).maybeSingle(),
  );
  if (pupil.error || !pupil.data) throw new OfflineError('Could not find the pupil');
  const { id: pupilId, display_name: name, class_id: classId } = pupil.data;

  const [topics, classTopics, status, mastery] = await Promise.all([
    withTimeout((signal) =>
      supabase
        .from('topics')
        .select('code, title, subject, class_level, prerequisites, segments (id, code, title, sort_order)')
        .abortSignal(signal),
    ),
    classId
      ? withTimeout((signal) =>
          supabase.from('class_topics').select('set_at, topics (code)').eq('class_id', classId).abortSignal(signal),
        )
      : Promise.resolve({ data: [] as ClassTopicRow[], error: null }),
    withTimeout((signal) =>
      supabase.from('segment_status').select('segment_id, status').eq('pupil_id', pupilId).abortSignal(signal),
    ),
    withTimeout((signal) =>
      supabase
        .from('mastery')
        .select('status, recheck_result, missed_segment_ids, topics (code)')
        .eq('pupil_id', pupilId)
        .abortSignal(signal),
    ),
  ]);
  const failed = topics.error ?? classTopics.error ?? status.error ?? mastery.error;
  if (failed) throw new OfflineError(failed.message);

  const input = toHomeInput({
    name,
    topics: (topics.data ?? []) as TopicRow[],
    classTopics: (classTopics.data ?? []) as ClassTopicRow[],
    segmentStatus: (status.data ?? []) as SegmentStatusRow[],
    mastery: (mastery.data ?? []) as MasteryRow[],
  });
  const snapshot: HomeSnapshot = { pupilId, input, savedAt: Date.now() };
  await writeHomeCache(userId, snapshot);
  return snapshot;
}

export type HomeState =
  | { kind: 'loading' }
  | { kind: 'offline'; retry: () => void }
  | { kind: 'ready'; input: HomeInput; refreshing: boolean };

/**
 * The phone copy first, then a background refresh (runbook S15 item 8). A
 * failed refresh keeps what is on screen. Only a first visit with no phone
 * copy and no network shows the calm offline message.
 */
export function useHome(): HomeState {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [cached, setCached] = useState<HomeSnapshot | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    void (async () => {
      const id = await signedInUserId();
      const copy = id ? await readHomeCache(id) : null;
      if (!live) return;
      setUserId(id);
      setCached(copy);
    })();
    return () => {
      live = false;
    };
  }, []);

  const query = useQuery({
    queryKey: ['home', userId],
    queryFn: () => fetchHome(userId ?? ''),
    enabled: typeof userId === 'string',
    retry: 1,
  });

  const snapshot = query.data ?? cached ?? null;
  if (snapshot) return { kind: 'ready', input: snapshot.input, refreshing: query.isFetching };
  if (userId === undefined || cached === undefined || query.isPending) {
    return userId === null ? { kind: 'offline', retry: () => undefined } : { kind: 'loading' };
  }
  return { kind: 'offline', retry: () => void query.refetch() };
}
