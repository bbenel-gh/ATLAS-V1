import type { HomeInput, HomeMastery, HomeTopic, SegmentState } from '@/domain/home';

/**
 * Turns the rows Home reads into the input src/domain/home.ts expects
 * (runbook S15). Pure, no network, so it is tested in Jest.
 */

export type TopicRow = {
  code: string;
  title: string;
  subject: string;
  class_level: string;
  prerequisites: string[] | null;
  segments: { id: string; code: string; title: string; sort_order: number }[] | null;
};
export type ClassTopicRow = { set_at: string; topics: { code: string } | null };
export type SegmentStatusRow = { segment_id: string; status: SegmentState };
export type MasteryRow = {
  status: HomeMastery['status'];
  recheck_result: 'pass' | 'miss' | null;
  missed_segment_ids: string[] | null;
  topics: { code: string } | null;
};

export function toHomeInput(rows: {
  name: string;
  topics: TopicRow[];
  classTopics: ClassTopicRow[];
  segmentStatus: SegmentStatusRow[];
  mastery: MasteryRow[];
}): HomeInput {
  const topics: HomeTopic[] = [...rows.topics]
    .sort((a, b) => a.subject.localeCompare(b.subject) || a.class_level.localeCompare(b.class_level) || a.title.localeCompare(b.title))
    .map((t) => ({
      code: t.code,
      title: t.title,
      subject: t.subject,
      classLevel: t.class_level,
      prerequisites: t.prerequisites ?? [],
      segments: (t.segments ?? []).map((s) => ({ id: s.id, code: s.code, title: s.title, sortOrder: s.sort_order })),
    }));
  const classTopicCodes = [...rows.classTopics]
    .sort((a, b) => a.set_at.localeCompare(b.set_at))
    .flatMap((r) => (r.topics ? [r.topics.code] : []));
  const segmentStatus: Record<string, SegmentState> = {};
  for (const r of rows.segmentStatus) segmentStatus[r.segment_id] = r.status;
  const mastery: HomeMastery[] = rows.mastery.flatMap((m) =>
    m.topics
      ? [{ topicCode: m.topics.code, status: m.status, recheckResult: m.recheck_result, missedSegmentIds: m.missed_segment_ids ?? [] }]
      : [],
  );
  // recheckDue: S33 fills this slot in.
  return { name: rows.name, topics, classTopicCodes, segmentStatus, mastery, recheckDue: null };
}
