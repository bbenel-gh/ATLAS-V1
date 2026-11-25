/**
 * The shape of content/materials.json (runbook S08, specs/B1.md, specs/prd.md
 * section 7, specs/framework.md stage 4, specs/video-board.md section 5).
 *
 * Two layers:
 *   1. Shape: every field, count and format. Objects are strict, so a misspelt
 *      field is an error rather than silently ignored.
 *   2. Cross-field rules (superRefine), which run once the shape is right:
 *      misconception codes, reason options, tap options, version labels,
 *      segment codes in order (any number of segments, D-33), worked example length, scheme marks, and no exclamation mark or em
 *      dash anywhere (CLAUDE.md rule 7).
 *
 * Text limits match the database columns (S06), so a file that passes here
 * also imports (S09).
 *
 * Plain TypeScript, imports only zod: also run by scripts/validateContent.ts
 * under Node type stripping.
 */
import { z } from 'zod';

// Building blocks ----------------------------------------------------------------

/**
 * A topic has as many segments as it needs (D-33): at least 1, no fixed upper
 * limit. Codes are the topic number then letters, in order with no gaps:
 * 1A, 1B ... 1Z, then 1AA, 1AB ... The database allows 4 characters per code
 * (S06), so a topic can hold up to 702 segments.
 */
export function segmentCodeFor(prefix: string, index: number): string {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    letters = String.fromCharCode(65 + r) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return `${prefix}${letters}`;
}

/** specs/prd.md and runbook S08. "phones and computers" is one tag. */
export const INTEREST_TAGS = [
  'football',
  'music',
  'farming',
  'stories',
  'cooking',
  'market',
  'animals',
  'phones and computers',
] as const;

export const WORKED_EXAMPLE_MAX_WORDS = 119; // "under 120 words"
export const MAX_VIDEO_SECONDS = 180;

const text = (max: number) => z.string().trim().min(1).max(max);
const httpsUrl = z.string().regex(/^https:\/\/\S+$/, 'must be a web address starting with https://');
const topicId = z.string().regex(/^[A-Z0-9-]{2,24}$/, 'must be 2 to 24 capital letters, digits or dashes, like B7-MATERIALS');
const misconceptionCode = z.string().regex(/^[0-9]{1,2}[A-Z]{1,2}-M[0-9]{1,3}$/, 'must be a misconception code like 1B-M1');
const segmentCode = z.string().regex(/^[0-9]{1,2}[A-Z]{1,2}$/, 'must be a segment code like 1A: the topic number, then letters');

const videoVersionSchema = z.strictObject({
  label: z.string().regex(/^[a-e]$/, 'must be one small letter from a to e'),
  url360: httpsUrl,
  url480: httpsUrl,
  posterUrl: httpsUrl,
  captionsUrl: httpsUrl,
  boardColour: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'must be a colour written as # and 6 hex digits, like the board token'),
  durationSeconds: z.number().int().min(1).max(MAX_VIDEO_SECONDS),
  exampleWorld: text(120),
  misconceptionTags: z.array(misconceptionCode),
  interestTags: z.array(z.enum(INTEREST_TAGS)),
});

const reasonOptionSchema = z.strictObject({
  text: text(300),
  sound: z.boolean(),
  misconceptionCode: misconceptionCode.optional(),
});

const checkQuestionSchema = z.strictObject({
  question: text(600),
  acceptedAnswers: z.array(text(300)).min(1),
  tapOptions: z.array(text(200)).length(3),
  reasonOptions: z.array(reasonOptionSchema).length(3),
  referenceReasoning: text(600),
});

const segmentSchema = z.strictObject({
  code: segmentCode,
  title: text(120),
  objective: text(600),
  referenceMeaning: text(1200),
  misconceptions: z.array(z.strictObject({ code: misconceptionCode, text: text(300) })).min(1),
  versions: z.array(videoVersionSchema).min(2).max(5),
  checkQuestions: z.array(checkQuestionSchema).length(3),
  workedExample: z.strictObject({ text: text(1200), photoUrl: httpsUrl }),
});

const objectiveItemSchema = z.strictObject({
  question: text(1200),
  options: z.array(text(300)).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

const theoryItemSchema = z.strictObject({
  question: text(1200),
  marks: z.number().int().min(1).max(20),
  schemePoints: z.array(z.strictObject({ point: text(600), marks: z.number().int().min(1).max(20) })).min(1),
});

const paperSchema = z.strictObject({
  durationMinutes: z.number().int().min(1).max(180),
  objective: z.array(objectiveItemSchema).length(10),
  theory: z.array(theoryItemSchema).length(3),
});

const recheckItemSchema = z.strictObject({
  segmentCode,
  question: text(600),
  acceptedAnswers: z.array(text(300)).min(1),
  tapOptions: z.array(text(200)).length(3),
});

const shapeSchema = z.strictObject({
  topic: z.strictObject({
    id: topicId,
    subject: text(80),
    level: text(40),
    title: text(120),
    prerequisites: z.array(topicId),
    overview: videoVersionSchema,
  }),
  segments: z.array(segmentSchema).min(1),
  exam: z.strictObject({ paperA: paperSchema, paperB: paperSchema }),
  recheck: z.array(recheckItemSchema).length(3),
});

// Cross-field rules ----------------------------------------------------------------

type Path = (string | number)[];

/** Compares answers the way a pupil's tap is matched: case and spacing ignored. */
export const normaliseAnswer = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase();

const EXCLAMATION = String.fromCharCode(0x21);
const EM_DASH = String.fromCharCode(0x2014);

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

export const contentSchema = shapeSchema.superRefine((content, ctx) => {
  const add = (path: Path, message: string) => ctx.addIssue({ code: 'custom', path, message });

  // No exclamation mark and no em dash in any text (CLAUDE.md rule 7). Built
  // from char codes so this file itself passes the copy guard (copy.test.ts).
  const walk = (value: unknown, path: Path) => {
    if (typeof value === 'string') {
      if (value.includes(EXCLAMATION)) add(path, 'must not contain an exclamation mark (CLAUDE.md rule 7)');
      if (value.includes(EM_DASH)) add(path, 'must not contain an em dash (CLAUDE.md rule 7)');
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => walk(v, [...path, i]));
    } else if (value !== null && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, [...path, k]);
    }
  };
  walk(content, []);

  content.topic.prerequisites.forEach((p, i) => {
    if (p === content.topic.id) add(['topic', 'prerequisites', i], 'must not be the topic itself');
  });

  // Segment codes in order with no gaps, all with the first segment's topic number.
  const prefix = content.segments[0]?.code.match(/^[0-9]+/)?.[0] ?? '1';
  content.segments.forEach((s, i) => {
    const expected = segmentCodeFor(prefix, i);
    if (s.code !== expected) {
      add(['segments', i, 'code'], `must be ${expected} (segments go ${prefix}A, ${prefix}B, ${prefix}C in order, no gaps or repeats)`);
    }
  });
  const segmentCodes = new Set(content.segments.map((s) => s.code));

  const allCodes = new Set(content.segments.flatMap((s) => s.misconceptions.map((m) => m.code)));

  content.segments.forEach((s, si) => {
    const at = (...rest: Path): Path => ['segments', si, ...rest];
    const codes = new Set<string>();
    s.misconceptions.forEach((m, mi) => {
      if (!m.code.startsWith(`${s.code}-`)) add(at('misconceptions', mi, 'code'), `must start with ${s.code}-, the code of its segment`);
      if (codes.has(m.code)) add(at('misconceptions', mi, 'code'), `${m.code} is listed twice in segment ${s.code}`);
      codes.add(m.code);
    });
    const known = (code: string) => codes.has(code) && code.startsWith(`${s.code}-`);

    s.versions.forEach((v, vi) => {
      const expected = String.fromCharCode(97 + vi);
      if (v.label !== expected) add(at('versions', vi, 'label'), `must be "${expected}" (versions are labelled a, b, c in order, no gaps or repeats)`);
      v.misconceptionTags.forEach((tag, ti) => {
        if (!known(tag)) add(at('versions', vi, 'misconceptionTags', ti), `${tag} is not in the misconception list of segment ${s.code}`);
      });
    });

    s.checkQuestions.forEach((q, qi) => {
      const sound = q.reasonOptions.filter((o) => o.sound).length;
      if (sound !== 1) add(at('checkQuestions', qi, 'reasonOptions'), `must have exactly 1 sound reason (it has ${sound})`);
      q.reasonOptions.forEach((o, oi) => {
        const path = at('checkQuestions', qi, 'reasonOptions', oi, 'misconceptionCode');
        if (o.sound && o.misconceptionCode !== undefined) add(path, 'must be left out on the sound reason');
        if (!o.sound && o.misconceptionCode === undefined) add(path, 'is missing. Each unsound reason needs the misconception code it shows');
        if (!o.sound && o.misconceptionCode !== undefined && !known(o.misconceptionCode)) {
          add(path, `${o.misconceptionCode} is not in the misconception list of segment ${s.code}`);
        }
      });
      checkTapOptions(q.tapOptions, q.acceptedAnswers, at('checkQuestions', qi, 'tapOptions'), add);
    });

    const words = wordCount(s.workedExample.text);
    if (words > WORKED_EXAMPLE_MAX_WORDS) add(at('workedExample', 'text'), `must be under 120 words (it has ${words})`);
  });

  content.topic.overview.misconceptionTags.forEach((tag, ti) => {
    if (!allCodes.has(tag)) add(['topic', 'overview', 'misconceptionTags', ti], `${tag} is not in the misconception list of any segment`);
  });

  (['paperA', 'paperB'] as const).forEach((paper) => {
    content.exam[paper].theory.forEach((item, ii) => {
      const total = item.schemePoints.reduce((n, p) => n + p.marks, 0);
      if (total < item.marks) {
        add(['exam', paper, 'theory', ii, 'schemePoints'], `must offer at least ${item.marks} marks in total, the marks of the question (they offer ${total})`);
      }
    });
  });

  content.recheck.forEach((item, ri) => {
    if (!segmentCodes.has(item.segmentCode)) add(['recheck', ri, 'segmentCode'], `${item.segmentCode} is not a segment in this file`);
    checkTapOptions(item.tapOptions, item.acceptedAnswers, ['recheck', ri, 'tapOptions'], add);
  });
});

/** The 3 tap options are different, and exactly one of them is an accepted answer. */
function checkTapOptions(tapOptions: string[], accepted: string[], path: Path, add: (path: Path, message: string) => void) {
  const normalised = tapOptions.map(normaliseAnswer);
  if (new Set(normalised).size !== normalised.length) add(path, 'must be 3 different options');
  const acceptedSet = new Set(accepted.map(normaliseAnswer));
  const right = normalised.filter((t) => acceptedSet.has(t)).length;
  if (right !== 1) add(path, `must include exactly 1 accepted answer (it has ${right})`);
}

export type Content = z.infer<typeof contentSchema>;
export type ContentSegment = Content['segments'][number];
export type ContentVideoVersion = Content['topic']['overview'];
export type ContentCheckQuestion = ContentSegment['checkQuestions'][number];

// Plain-English errors ----------------------------------------------------------------

export type ContentError = { path: string; message: string };

/** segments[1].versions[0].misconceptionTags[0] */
export function formatPath(path: readonly PropertyKey[]): string {
  return path.reduce<string>((out, key) => {
    if (typeof key === 'number') return `${out}[${key}]`;
    return out === '' ? String(key) : `${out}.${String(key)}`;
  }, '');
}

const KIND: Record<string, string> = {
  string: 'text',
  number: 'a number',
  boolean: 'true or false',
  array: 'a list',
  object: 'an object',
};

const kindOf = (v: unknown) => (Array.isArray(v) ? 'a list' : v === null ? 'empty (null)' : (KIND[typeof v] ?? typeof v));

function valueAt(root: unknown, path: readonly PropertyKey[]): unknown {
  let v: unknown = root;
  for (const key of path) {
    if (v === null || typeof v !== 'object') return undefined;
    v = (v as Record<PropertyKey, unknown>)[key];
  }
  return v;
}

function describeIssue(issue: z.core.$ZodIssue, input: unknown): string {
  const value = valueAt(input, issue.path);
  switch (issue.code) {
    case 'invalid_type':
      return value === undefined
        ? `is missing. It must be ${KIND[issue.expected] ?? issue.expected}`
        : `must be ${KIND[issue.expected] ?? issue.expected}, not ${kindOf(value)}`;
    case 'too_big': {
      const max = Number(issue.maximum);
      if (issue.origin === 'array') {
        const n = Array.isArray(value) ? value.length : '?';
        return issue.exact ? `must have exactly ${max} items (it has ${n})` : `must have at most ${max} items (it has ${n})`;
      }
      if (issue.origin === 'string') return `must be at most ${max} characters long (it has ${String(value ?? '').length})`;
      return `must be ${max} or less (it is ${String(value)})`;
    }
    case 'too_small': {
      const min = Number(issue.minimum);
      if (issue.origin === 'array') {
        const n = Array.isArray(value) ? value.length : '?';
        return issue.exact ? `must have exactly ${min} items (it has ${n})` : `must have at least ${min} item${min === 1 ? '' : 's'} (it has ${n})`;
      }
      if (issue.origin === 'string') return min === 1 ? 'must not be empty' : `must be at least ${min} characters long`;
      return `must be ${min} or more (it is ${String(value)})`;
    }
    case 'invalid_value':
      return `must be one of: ${issue.values.map((v) => `"${String(v)}"`).join(', ')} (it is "${String(value)}")`;
    case 'unrecognized_keys':
      return `has a field the content file does not use: ${issue.keys.map((k) => `"${k}"`).join(', ')}. Check the spelling`;
    case 'invalid_format':
      return issue.format === 'regex' ? issue.message : `must be a valid ${issue.format}`;
    default:
      return issue.message;
  }
}

export function formatContentIssues(issues: readonly z.core.$ZodIssue[], input: unknown): ContentError[] {
  return issues.map((issue) => ({ path: formatPath(issue.path) || '(the whole file)', message: describeIssue(issue, input) }));
}

export type ContentResult = { ok: true; content: Content } | { ok: false; errors: ContentError[] };

export function validateContent(input: unknown): ContentResult {
  const result = contentSchema.safeParse(input);
  return result.success ? { ok: true, content: result.data } : { ok: false, errors: formatContentIssues(result.error.issues, input) };
}
