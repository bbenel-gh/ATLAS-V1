/**
 * Overview listening rules (specs/framework.md Stage 3; specs/prd.md FR-10 to
 * FR-13; runbook S17; D-49).
 *
 * Pure TypeScript, zod only. Used by the app (the phone queue) and by the
 * ai-overview Edge Function. Nothing here is ever shown to the pupil as a grade.
 */
import { z } from 'zod';

export const OVERVIEW_MODEL = 'claude-haiku-5-5';
/** Rule 5: an AI call gives up after 20 seconds. */
export const AI_TIMEOUT_MS = 20_000;
/** Rule 13: at most 120 AI calls per pupil per day, across all jobs. */
export const PUPIL_DAILY_AI_CAP = 120;
export const OVERVIEW_TEXT_MAX = 600;
/** AI tries per overview response before the phone stops asking (the row is already saved). */
export const MAX_SEND_ATTEMPTS = 3;
/** How many items the profile keeps, newest first. */
export const PROFILE_CAPS = { keywords: 40, interests: 20, confusions: 20 } as const;

const ITEM_MAX = 80;

/** Word for word from specs/ai-prompts.md (a test checks it). */
export const OVERVIEW_SYSTEM_PROMPT = `You read a pupil's short summary of a lesson overview video inside ATLAS, a learning app for Basic 7 pupils in Ghana.
You never talk to the pupil and never grade. You return JSON only.

You receive: segment_titles (list), pupil_summary, pupil_confusion.

Return exactly:
{"keywords": [string], "interests": [string], "confusions": [string], "segments_mentioned": [string], "safeguarding": boolean}
- keywords: up to 8 topic words the pupil used, in their own words.
- interests: everyday things the pupil mentioned (for example football, cooking, farming), for choosing examples later.
- confusions: up to 3 short phrases for what the pupil found unclear.
- segments_mentioned: titles from segment_titles the pupil touched on.
- safeguarding: same rule as the answer checker.`;

const pupilText = z.string().transform((s) => s.trim()).pipe(z.string().max(OVERVIEW_TEXT_MAX));

/**
 * What the phone sends. Strict: no name, class or anything else about the
 * pupil can ride along (rule 2). response_id is made on the phone, so a resend
 * never makes a second row or a second AI call.
 */
export const overviewInputSchema = z.strictObject({
  pupil_id: z.uuid(),
  topic_code: z.string().min(1).max(40),
  response_id: z.uuid(),
  summary_text: pupilText,
  confusing_text: pupilText,
  client_created_at: z.iso.datetime().optional(),
});
export type OverviewInput = z.infer<typeof overviewInputSchema>;

export const isSkipped = (t: { summary_text: string; confusing_text: string }): boolean =>
  t.summary_text === '' && t.confusing_text === '';

export type SegmentRef = { code: string; title: string };

/** The user message: the segment titles and the pupil's own words, nothing else. */
export function buildOverviewUserMessage(segments: SegmentRef[], summary: string, confusion: string): string {
  return JSON.stringify({
    segment_titles: segments.map((s) => s.title),
    pupil_summary: summary,
    pupil_confusion: confusion,
  });
}

const items = (max: number) =>
  z.array(z.string()).transform((list) =>
    list
      .map((s) => s.trim().slice(0, ITEM_MAX))
      .filter((s) => s.length > 0)
      .slice(0, max),
  );

/** The model's answer, in the prompt's own field names (rule 3). */
export const overviewOutputSchema = z.object({
  keywords: items(8),
  interests: items(PROFILE_CAPS.interests),
  confusions: items(3),
  segments_mentioned: items(20),
  safeguarding: z.boolean(),
});
export type OverviewOutput = z.infer<typeof overviewOutputSchema>;

/**
 * null when the text is not the JSON shape the prompt asks for. Thinking text
 * and a sentence around the JSON are ignored (some stand-in models add them,
 * D-50): the JSON is the text from the first { to the last }.
 */
export function parseOverviewOutput(text: string): OverviewOutput | null {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // A list is not the shape asked for, even with the right object inside.
  if (/^\s*\[/.test(cleaned)) return null;
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  let json: unknown;
  try {
    json = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
  const parsed = overviewOutputSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/** Titles the model returned, as segment codes of this topic. Anything else is dropped. */
export function titlesToCodes(mentioned: string[], segments: SegmentRef[]): string[] {
  const out: string[] = [];
  for (const m of mentioned) {
    const key = norm(m);
    const seg = segments.find((s) => norm(s.title) === key || norm(s.code) === key);
    if (seg && !out.includes(seg.code)) out.push(seg.code);
  }
  return out;
}

export type ProfileWords = { keywords: string[]; interests: string[]; confusions: string[] };

function mergeList(current: string[], added: string[], cap: number): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const s of [...added, ...current]) {
    const key = norm(s);
    if (key === '' || seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out.slice(0, cap);
}

/** The profile after one overview: new words first, no repeats, capped. */
export function mergeProfile(current: ProfileWords, added: ProfileWords): ProfileWords {
  return {
    keywords: mergeList(current.keywords, added.keywords, PROFILE_CAPS.keywords),
    interests: mergeList(current.interests, added.interests, PROFILE_CAPS.interests),
    confusions: mergeList(current.confusions, added.confusions, PROFILE_CAPS.confusions),
  };
}

export type CapResult = 'ok' | 'pupil_cap' | 'global_cap';

/** Rule 13, checked before every AI call. Counts are calls already made today. */
export function capCheck(c: { pupilToday: number; globalToday: number; globalCap: number }): CapResult {
  if (c.pupilToday >= PUPIL_DAILY_AI_CAP) return 'pupil_cap';
  if (c.globalToday >= c.globalCap) return 'global_cap';
  return 'ok';
}

/** The day the caps count over. Ghana is on UTC all year. */
export const startOfUtcDay = (now: Date): Date =>
  new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

/** What the function answers. */
export type OverviewReply =
  | { ok: true }
  | { fallback: true; retry: boolean }
  | { error: 'bad_input' | 'forbidden' | 'server' };

export type SendOutcome = 'ok' | 'fallback_retry' | 'fallback_final' | 'rejected' | 'server' | 'offline';

export function interpretOverviewReply(status: number, body: unknown): Exclude<SendOutcome, 'offline'> {
  const b = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : {};
  if (status === 200 && b.ok === true) return 'ok';
  if (status === 200 && b.fallback === true) return b.retry === true ? 'fallback_retry' : 'fallback_final';
  if (status === 400 || status === 403) return 'rejected';
  return 'server';
}

export type QueueStep = { action: 'done' } | { action: 'keep'; attempts: number };

/**
 * What the phone does with a queued response after one send. Offline and
 * server errors keep it without counting a try (the row may not be saved yet).
 * A fallback means the row is saved but the AI did not answer: try again a
 * few times, then stop.
 */
export function queueNext(item: { attempts: number }, outcome: SendOutcome): QueueStep {
  switch (outcome) {
    case 'ok':
    case 'fallback_final':
    case 'rejected':
      return { action: 'done' };
    case 'offline':
    case 'server':
      return { action: 'keep', attempts: item.attempts };
    case 'fallback_retry': {
      const attempts = item.attempts + 1;
      return attempts >= MAX_SEND_ATTEMPTS ? { action: 'done' } : { action: 'keep', attempts };
    }
  }
}
