import { toSegmentList, type SegmentList } from './segmentList';
import { supabase } from './supabase';

/** The Materials topic, as imported by npm run content:import. */
export const MATERIALS_TOPIC = 'B7-MATERIALS';

export type TopicSegments = SegmentList & { title: string; contentVersion: string | null };

/**
 * Reads a topic and its segments. Needs a signed-in user: content is not
 * readable by anon (RLS). Returns null when the topic is not in the database.
 * Gives up after 20 seconds (CLAUDE.md rule 5).
 */
export async function fetchTopicSegments(topicCode: string): Promise<TopicSegments | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  let result;
  try {
    result = await supabase
      .from('topics')
      .select('title, content_version, segments (code, title, sort_order)')
      .eq('code', topicCode)
      .abortSignal(controller.signal)
      .maybeSingle();
  } finally {
    clearTimeout(timer);
  }
  const { data, error } = result;
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { title: data.title, contentVersion: data.content_version, ...toSegmentList(data.segments) };
}
