import type { TopicMedia } from '@/domain/videoPlan';

import { OfflineError, withTimeout } from './pupilAuth';
import { readManifest } from './videoCache';
import { supabase } from './supabase';

type Row = {
  code: string;
  title?: string;
  subject?: string;
  class_level?: string;
  content_version: string | null;
  segments:
    | {
        code: string;
        sort_order: number;
        video_versions:
          | {
              id: string;
              label: string;
              url_360: string;
              url_480: string;
              poster_url: string | null;
              captions_url: string | null;
              board_colour: string;
              duration_seconds: number;
            }[]
          | null;
      }[]
    | null;
};

/** Pure: the database rows as TopicMedia, overview first, then lesson order, then version label. */
export function toTopicMedia(row: Row): TopicMedia {
  const segments = [...(row.segments ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  return {
    topicCode: row.code,
    contentVersion: row.content_version,
    ...(row.title ? { title: row.title } : {}),
    ...(row.subject ? { subject: row.subject } : {}),
    ...(row.class_level ? { classLevel: row.class_level } : {}),
    versions: segments.flatMap((s) =>
      [...(s.video_versions ?? [])]
        .sort((a, b) => a.label.localeCompare(b.label))
        .map((v) => ({
          id: v.id,
          segmentCode: s.code,
          label: v.label,
          url360: v.url_360,
          url480: v.url_480,
          posterUrl: v.poster_url,
          captionsUrl: v.captions_url,
          boardColour: v.board_colour,
          durationSeconds: v.duration_seconds,
        })),
    ),
  };
}

/**
 * Every video version of a topic, read with the pupil's session (content is
 * readable by any signed-in pupil). null when the topic is not in the database.
 * Throws OfflineError when the network fails; callers then use the copy kept
 * in the media manifest (src/data/videoCache.ts).
 */
export async function fetchTopicMedia(topicCode: string): Promise<TopicMedia | null> {
  const res = await withTimeout((signal) =>
    supabase
      .from('topics')
      .select(
        'code, title, subject, class_level, content_version, segments (code, sort_order, video_versions (id, label, url_360, url_480, poster_url, captions_url, board_colour, duration_seconds))',
      )
      .eq('code', topicCode)
      .abortSignal(signal)
      .maybeSingle(),
  );
  if (res.error) throw new OfflineError(res.error.message);
  return res.data ? toTopicMedia(res.data as Row) : null;
}

export type TopicMediaResult = { kind: 'ok'; media: TopicMedia } | { kind: 'missing' } | { kind: 'offline' };

/** The server copy when online, else the copy kept with the downloaded files (works in airplane mode). */
export async function loadTopicMedia(topicCode: string): Promise<TopicMediaResult> {
  try {
    const media = await fetchTopicMedia(topicCode);
    return media ? { kind: 'ok', media } : { kind: 'missing' };
  } catch {
    const manifest = await readManifest(topicCode);
    return manifest ? { kind: 'ok', media: manifest.media } : { kind: 'offline' };
  }
}
