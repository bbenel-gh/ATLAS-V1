/**
 * AI shapes shared by the app and the Edge Functions (runbook S19 item 5,
 * CLAUDE.md rule 3: every AI output is parsed with zod). Pure TypeScript, zod only.
 */
import { z } from 'zod';

export const VERDICTS = ['yes', 'no', 'unsure'] as const;
export type Verdict = (typeof VERDICTS)[number];

/** The read-back is shown to the pupil: one sentence, at most 200 characters. */
export const READ_BACK_MAX = 200;

/**
 * The JSON object in a model's text, or null. Thinking text, code fences and a
 * sentence around the JSON are ignored (some stand-in models add them, D-50):
 * the object is the text from the first { to the last }. A list is not an object.
 */
export function extractJsonObject(text: string): unknown {
  const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  if (/^\s*\[/.test(cleaned)) return null;
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

/** Em dash (U+2014) and en dash (U+2013), built from char codes so no dash sits in the source (copy guard). */
const DASHES = new RegExp(`\\s*[${String.fromCharCode(0x2014, 0x2013)}]\\s*`, 'g');

/** One line, and the copy rules (rule 7): no em or en dashes, no exclamation marks. */
export function cleanReadBack(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(DASHES, ', ')
    .replace(/!/g, '.')
    .trim();
}

const readBack = z
  .string()
  .transform(cleanReadBack)
  .pipe(
    z
      .string()
      .min(1)
      .max(READ_BACK_MAX)
      .regex(/^You (think|said)\b/, 'must start with "You think" or "You said"'),
  );

const verdict = z.enum(VERDICTS);

/** What ai-check returns to the app. */
export const checkResultSchema = z.strictObject({
  answerCorrect: verdict,
  reasoningSound: verdict,
  misconceptionCodes: z.array(z.string()),
  readBack,
  safeguarding: z.boolean(),
});
export type CheckResult = z.infer<typeof checkResultSchema>;

/** The model's answer, in the prompt's own field names (specs/ai-prompts.md ai-check). */
export const checkModelOutputSchema = z.object({
  answer_correct: verdict,
  reasoning_sound: verdict,
  misconception_codes: z.array(z.string()),
  read_back: readBack,
  safeguarding: z.boolean(),
});

/** The model's text as the app shape, or null when it is not the shape the prompt asks for. */
export function parseCheckOutput(text: string): CheckResult | null {
  const parsed = checkModelOutputSchema.safeParse(extractJsonObject(text));
  if (!parsed.success) return null;
  const o = parsed.data;
  return {
    answerCorrect: o.answer_correct,
    reasoningSound: o.reasoning_sound,
    misconceptionCodes: o.misconception_codes,
    readBack: o.read_back,
    safeguarding: o.safeguarding,
  };
}

/**
 * What the ai-check function answers.
 * fallback: no AI verdict (the AI failed twice, or a daily cap is reached); the
 * app offers tap options (rule 5).
 */
export const checkReplySchema = z.union([
  z.strictObject({ ok: z.literal(true), result: checkResultSchema }),
  z.strictObject({ fallback: z.literal(true), reason: z.enum(['ai', 'cap']) }),
  z.strictObject({ error: z.enum(['bad_input', 'forbidden', 'server']) }),
]);
export type CheckReply = z.infer<typeof checkReplySchema>;
