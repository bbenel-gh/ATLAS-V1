/**
 * What Home shows (specs/framework.md stage 2, specs/prd.md FR-8, runbook S15).
 * Pure TypeScript, no React. src/data/home.ts gathers the input; the Home
 * screen draws the result.
 */
import { checkPrerequisites, topicsDone, type MasteryState } from './prerequisites';

/** The overview segment code (D-34). Not a "part" and never re-taught alone. */
const OVERVIEW_CODE = 'OV';

/** Subjects shown in "Choose a topic" as "Coming soon", not tappable (runbook S15 item 3). */
export const COMING_SOON_SUBJECTS: readonly string[] = ['Mathematics'];

export type SegmentState = 'not_started' | 'in_progress' | 'complete' | 'moved_on';

export type HomeSegment = { id: string; code: string; title: string; sortOrder: number };

export type HomeTopic = {
  code: string;
  title: string;
  subject: string;
  classLevel: string;
  prerequisites: string[];
  /** Every segment, the overview included. */
  segments: HomeSegment[];
};

export type HomeMastery = {
  topicCode: string;
  status: MasteryState;
  recheckResult: 'pass' | 'miss' | null;
  missedSegmentIds: string[];
};

/** A re-check that is due now. S33 fills this in; until then it is always null. */
export type RecheckDue = { topicCode: string };

export type HomeInput = {
  name: string;
  topics: HomeTopic[];
  /** Topic codes the class teacher has set, in the order they were set (class_topics). */
  classTopicCodes: string[];
  /** segment id to state, for this pupil only. */
  segmentStatus: Record<string, SegmentState>;
  mastery: HomeMastery[];
  recheckDue: RecheckDue | null;
};

export type TopicCard = { topicCode: string; title: string; parts: number; done: number };

export type RecommendedItem =
  | { kind: 'recheck'; topicCode: string; title: string }
  | ({ kind: 'topic' } & TopicCard)
  | {
      kind: 'reteach';
      topicCode: string;
      segmentCode: string;
      segmentTitle: string;
      /** moved_on: three tries used. recheck: answered wrongly in a missed re-check. */
      reason: 'moved_on' | 'recheck';
    };

export type SubjectGroup = { name: string; available: boolean; topics: TopicCard[] };

export type HomeView = { name: string; recommended: RecommendedItem[]; subjects: SubjectGroup[] };

const parts = (topic: HomeTopic) =>
  [...topic.segments].filter((s) => s.code !== OVERVIEW_CODE).sort((a, b) => a.sortOrder - b.sortOrder);

/** "5 parts" and how many are complete. Moved on is not complete. */
export function topicProgress(
  topic: HomeTopic,
  status: Readonly<Record<string, SegmentState>>,
): { parts: number; done: number } {
  const list = parts(topic);
  return { parts: list.length, done: list.filter((s) => status[s.id] === 'complete').length };
}

function card(topic: HomeTopic, status: Readonly<Record<string, SegmentState>>): TopicCard {
  return { topicCode: topic.code, title: topic.title, ...topicProgress(topic, status) };
}

export function buildHome(input: HomeInput): HomeView {
  const byCode = new Map(input.topics.map((t) => [t.code, t]));
  const recommended: RecommendedItem[] = [];

  // (c) A due re-check comes first (FR-35: before anything else).
  if (input.recheckDue) {
    const t = byCode.get(input.recheckDue.topicCode);
    if (t) recommended.push({ kind: 'recheck', topicCode: t.code, title: t.title });
  }

  // (a) Topics the class teacher has set.
  const seenTopics = new Set<string>();
  for (const code of input.classTopicCodes) {
    const t = byCode.get(code);
    if (!t || seenTopics.has(code)) continue;
    seenTopics.add(code);
    recommended.push({ kind: 'topic', ...card(t, input.segmentStatus) });
  }

  // (b) Segments waiting to be re-taught, in library and lesson order.
  const missed = new Set(
    input.mastery.filter((m) => m.recheckResult === 'miss').flatMap((m) => m.missedSegmentIds),
  );
  for (const t of input.topics) {
    for (const s of parts(t)) {
      const reason = input.segmentStatus[s.id] === 'moved_on' ? 'moved_on' : missed.has(s.id) ? 'recheck' : null;
      if (!reason) continue;
      recommended.push({ kind: 'reteach', topicCode: t.code, segmentCode: s.code, segmentTitle: s.title, reason });
    }
  }

  // Choose a topic: subjects in the order their first topic appears, then the coming soon ones.
  const groups = new Map<string, TopicCard[]>();
  for (const t of input.topics) {
    const list = groups.get(t.subject) ?? [];
    list.push(card(t, input.segmentStatus));
    groups.set(t.subject, list);
  }
  const subjects: SubjectGroup[] = [...groups].map(([name, topics]) => ({ name, available: true, topics }));
  for (const name of COMING_SOON_SUBJECTS) {
    if (!groups.has(name)) subjects.push({ name, available: false, topics: [] });
  }

  return { name: input.name.trim(), recommended, subjects };
}

/**
 * Dev switch (runbook S15 item 6): the topics with one fake prerequisite added
 * to one topic, so the nudge can be seen on a phone. Never changes its input.
 */
export function withFakePrerequisite(topics: readonly HomeTopic[], topicCode: string, fakeCode: string): HomeTopic[] {
  return topics.map((t) =>
    t.code === topicCode && !t.prerequisites.includes(fakeCode)
      ? { ...t, prerequisites: [...t.prerequisites, fakeCode] }
      : t,
  );
}

/** Titles for the nudge: the library title, else a known extra title, else the code. */
export function missingTopicTitles(
  missing: readonly string[],
  topics: readonly HomeTopic[],
  extraTitles: Readonly<Record<string, string>>,
): { topicCode: string; title: string; inLibrary: boolean }[] {
  return missing.map((code) => {
    const t = topics.find((x) => x.code === code);
    return { topicCode: code, title: t?.title ?? extraTitles[code] ?? code, inLibrary: Boolean(t) };
  });
}

export type OpenDecision =
  | { kind: 'open'; topicCode: string }
  | {
      kind: 'nudge';
      topicCode: string;
      first: { topicCode: string; title: string };
      titles: string[];
    };

/**
 * What happens when the pupil taps a topic, from either Home section (FR-9).
 * Every prerequisite done: open it. Otherwise: the nudge, whose second button
 * still opens it. This never returns "blocked".
 */
export function decideOpen(
  topicCode: string,
  input: Pick<HomeInput, 'topics' | 'mastery'>,
  extraTitles: Readonly<Record<string, string>> = {},
): OpenDecision {
  const topic = input.topics.find((t) => t.code === topicCode);
  if (!topic) return { kind: 'open', topicCode };
  const check = checkPrerequisites(topicsDone(input.mastery), topic.prerequisites, topic.code);
  if (check.ok) return { kind: 'open', topicCode };
  const named = missingTopicTitles(check.missing, input.topics, extraTitles);
  const first = named[0] ?? { topicCode: check.missing[0] ?? '', title: check.missing[0] ?? '' };
  return {
    kind: 'nudge',
    topicCode,
    first: { topicCode: first.topicCode, title: first.title },
    titles: named.map((n) => n.title),
  };
}
