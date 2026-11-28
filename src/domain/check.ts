/**
 * Answer and reason check rules (runbook S19; specs/prd.md FR-17;
 * specs/framework.md "The AI check" and "The reasoning check").
 *
 * Pure TypeScript, zod only. Used by the ai-check Edge Function and the app.
 * Rule 2: only the question, the references, the misconception list and the
 * pupil's two texts ever reach the AI. Tap answers and tap reasons are judged
 * here, without AI; two taps make no AI call at all.
 */
import { z } from 'zod';

import { READ_BACK_MAX, cleanReadBack, type CheckResult, type Verdict } from './aiSchemas.ts';

export const CHECK_MODEL = 'claude-sonnet-5-5';
export const CHECK_TEXT_MAX = 600;

/** Word for word from specs/ai-prompts.md (a test checks it). */
export const CHECK_SYSTEM_PROMPT = `You check answers inside ATLAS, a learning app for Basic 7 pupils in Ghana, aged about 11 to 14.
You never talk to the pupil. You return JSON only, with no other text.

You receive: question, reference_meaning, reference_reasoning, misconceptions (list of {code, description}), pupil_answer, pupil_reason.

Rules:
- Judge the idea, not spelling, grammar or length. Judge the meaning.
- answer_correct: "yes" if the answer carries the reference meaning; "no" if it contradicts it or leaves it out; "unsure" if you cannot tell.
- reasoning_sound: "yes" if the reason shows the idea in reference_reasoning in any words; "no" if it shows a misconception, is circular, or is missing; "unsure" if you cannot tell.
- misconception_codes: only codes from the list that the answer or reason clearly shows. Never invent a code. Empty list if none.
- read_back: one short sentence in simple English that restates what the pupil meant, starting "You said that". No judgement. Never include the correct answer.
- safeguarding: true only if the text suggests the pupil may be in danger, being harmed, or in serious distress. Otherwise false.
- If the text is not an attempt at the question (jokes, insults, random letters), answer_correct and reasoning_sound are "no".

Return exactly:
{"answer_correct": "yes"|"no"|"unsure", "reasoning_sound": "yes"|"no"|"unsure", "misconception_codes": [string], "read_back": string, "safeguarding": boolean}`;

const pupilText = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().max(CHECK_TEXT_MAX));
const mode = z.enum(['typing', 'tap']);

/** What the phone sends. Strict: no name, class or anything else about the pupil (rule 2). */
export const checkInputSchema = z.strictObject({
  pupil_id: z.uuid(),
  segment_code: z.string().regex(/^[0-9]{1,2}[A-Z]{1,2}$/),
  try_number: z.number().int().min(1).max(3),
  question_id: z.uuid(),
  answer_text: pupilText.pipe(z.string().min(1)),
  answer_mode: mode,
  reason_text: pupilText,
  reason_mode: mode,
});
export type CheckInput = z.infer<typeof checkInputSchema>;

/** A check_items row, as the function loads it. reason_options code is null for the sound reason. */
export type ReasonOption = { text: string; code: string | null };
export type CheckItem = {
  question: string;
  acceptedAnswers: string[];
  tapOptions: string[];
  reasonOptions: ReasonOption[];
  referenceReasoning: string;
};
export type CheckSegment = { code: string; referenceMeaning: string; misconceptions: { code: string; text: string }[] };

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A tap answer is correct when it equals an accepted answer. It must be one of
 * the tap options: anything else is "invalid", so a typed answer can never skip
 * the AI by calling itself a tap.
 */
export function judgeTapAnswer(text: string, tapOptions: string[], accepted: string[]): Verdict | 'invalid' {
  const key = norm(text);
  if (!tapOptions.some((o) => norm(o) === key)) return 'invalid';
  return accepted.some((a) => norm(a) === key) ? 'yes' : 'no';
}

export type TapReason = { sound: boolean; code: string | null };

/** A tap reason maps straight to sound, or to its misconception code. */
export function judgeTapReason(text: string, options: ReasonOption[]): TapReason | 'invalid' {
  const key = norm(text);
  const option = options.find((o) => norm(o.text) === key);
  if (!option) return 'invalid';
  return { sound: option.code === null, code: option.code };
}

/** The user message for the model: the prompt's inputs and nothing else (rule 2). */
export function buildCheckUserMessage(item: CheckItem, segment: CheckSegment, answer: string, reason: string): string {
  return JSON.stringify({
    question: item.question,
    reference_meaning: segment.referenceMeaning,
    reference_reasoning: item.referenceReasoning,
    misconceptions: segment.misconceptions.map((m) => ({ code: m.code, description: m.text })),
    pupil_answer: answer,
    pupil_reason: reason,
  });
}

/** Only this segment's codes go on. Unknown ones are dropped and logged by the caller. */
export function filterCodes(codes: string[], allowed: string[]): { kept: string[]; dropped: string[] } {
  const kept: string[] = [];
  const dropped: string[] = [];
  for (const c of codes) {
    const list = allowed.includes(c) ? kept : dropped;
    if (!list.includes(c)) list.push(c);
  }
  return { kept, dropped };
}

const stripEnd = (s: string) => s.trim().replace(/[.!?]+$/, '');

/** The read-back for two taps, built from the chosen texts: one sentence within 200 characters. */
export function tapReadBack(answer: string, reason: string): string {
  const r = stripEnd(reason);
  // Lower-case only an ordinary first word ("It is" to "it is"); keep "I", names and capitals.
  const because = /^(?!I\b)[A-Z][a-z]*\b/.test(r) ? r.charAt(0).toLowerCase() + r.slice(1) : r;
  let body = `You said "${stripEnd(answer)}" because ${because}`;
  if (body.length + 1 > READ_BACK_MAX) {
    const cut = body.slice(0, READ_BACK_MAX - 1);
    const space = cut.lastIndexOf(' ');
    body = (space > READ_BACK_MAX / 2 ? cut.slice(0, space) : cut).replace(/[\s,]+$/, '');
  }
  return cleanReadBack(`${body}.`);
}

/**
 * The final result. Two taps: no AI, built from the fixed verdicts (no
 * safeguarding, the texts are ours). One tap: the AI result with that side
 * replaced by its fixed verdict; a tap reason's code is added.
 */
export function combineCheck(c: {
  ai: CheckResult | null;
  tapAnswer?: Verdict;
  tapReason?: TapReason;
  readBack?: string;
}): CheckResult {
  const reasonVerdict = c.tapReason ? (c.tapReason.sound ? 'yes' : 'no') : undefined;
  const tapCode = c.tapReason?.code ?? null;
  if (!c.ai) {
    if (!c.tapAnswer || !reasonVerdict || c.readBack === undefined) {
      throw new Error('Without an AI result both the answer and the reason must be taps.');
    }
    return {
      answerCorrect: c.tapAnswer,
      reasoningSound: reasonVerdict,
      misconceptionCodes: tapCode ? [tapCode] : [],
      readBack: c.readBack,
      safeguarding: false,
    };
  }
  const codes = [...c.ai.misconceptionCodes];
  if (tapCode && !codes.includes(tapCode)) codes.push(tapCode);
  return {
    ...c.ai,
    answerCorrect: c.tapAnswer ?? c.ai.answerCorrect,
    reasoningSound: reasonVerdict ?? c.ai.reasoningSound,
    misconceptionCodes: codes,
  };
}
