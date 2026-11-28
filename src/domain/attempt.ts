/**
 * Attempt saving rules (runbook S20; specs/prd.md FR-15 to FR-23; D-29, D-52, D-54).
 *
 * Pure TypeScript, zod only. Used by the save-attempt Edge Function and the app.
 *
 * The server decides every verdict (D-29). Each side of an attempt (answer,
 * reason) is decided, in order, by:
 *   1. the pupil's own tap, judged here against the stored options;
 *   2. the stored AI check (ai-check with the attempt id), when it says yes or no;
 *   3. a tie-break tap (FR-22) or a fallback tap (rule 5), judged here;
 *   4. nothing: the side is not judged (null), and no try is used.
 * A safeguarding check gives no verdict at all (rule 14).
 */
import { z } from 'zod';

import type { CheckResult, Verdict } from './aiSchemas.ts';
import { judgeTapAnswer, judgeTapReason, mode, pupilText, type CheckItem, type PhoneMode } from './check.ts';

/** One day. Anything longer is a clock fault, not a pupil thinking. */
export const ATTEMPT_TIME_MAX_MS = 86_400_000;

/** What the phone sends to save-attempt. Strict: no name, no verdicts (rules 2, D-29). */
export const saveAttemptInputSchema = z.strictObject({
  attempt_id: z.uuid(),
  pupil_id: z.uuid(),
  segment_code: z.string().regex(/^[0-9]{1,2}[A-Z]{1,2}$/),
  round: z.number().int().min(1).max(10_000),
  try_number: z.number().int().min(1).max(3),
  question_id: z.uuid(),
  /** null for a worked-example try (no video shown). */
  version_label: z.string().regex(/^[a-z]$/).nullable(),
  answer_text: pupilText.pipe(z.string().min(1)),
  answer_mode: mode,
  reason_text: pupilText,
  reason_mode: mode,
  sure: z.boolean(),
  time_taken_ms: z.number().int().min(0).max(ATTEMPT_TIME_MAX_MS),
  changed_answer: z.boolean(),
  /** true: "Yes" to the read-back. false: "Not quite", then edited. null: no read-back shown. */
  read_back_confirmed: z.boolean().nullable(),
  /** The tap that decided an unsure or unchecked answer (tie-break or fallback). */
  tap_answer: pupilText.nullable(),
  tap_reason: pupilText.nullable(),
  client_created_at: z.iso.datetime({ offset: true }),
});
export type SaveAttemptInput = z.infer<typeof saveAttemptInputSchema>;

/** The phone says "typing"; the database input_mode says "typed" (D-52). */
export function toInputMode(m: PhoneMode): 'typed' | 'tap' {
  return m === 'typing' ? 'typed' : 'tap';
}

export type CheckedTexts = { answerText: string; answerMode: PhoneMode; reasonText: string; reasonMode: PhoneMode };

/** A stored check counts only for the exact texts and modes being saved. */
export function checkMatchesAttempt(stored: CheckedTexts, attempt: CheckedTexts): boolean {
  return (
    stored.answerText.trim() === attempt.answerText.trim() &&
    stored.reasonText.trim() === attempt.reasonText.trim() &&
    stored.answerMode === attempt.answerMode &&
    stored.reasonMode === attempt.reasonMode
  );
}

export type ResolveInput = CheckedTexts & {
  item: CheckItem;
  /** The latest stored check that matches these texts, or null (AI failed, offline, or never asked). */
  check: CheckResult | null;
  tapAnswer: string | null;
  tapReason: string | null;
};

export type Resolved =
  | {
      ok: true;
      /** Final verdicts: yes, no, or null when not judged. Never "unsure". */
      answerVerdict: Exclude<Verdict, 'unsure'> | null;
      reasoningVerdict: Exclude<Verdict, 'unsure'> | null;
      codes: string[];
      aiFallback: boolean;
      borderline: boolean;
      safeguarding: boolean;
      judged: boolean;
    }
  | { ok: false; reason: 'bad_tap' };

type YesNo = 'yes' | 'no';
const firm = (v: Verdict | undefined): YesNo | null => (v === 'yes' || v === 'no' ? v : null);

export function resolveAttempt(input: ResolveInput): Resolved {
  const { item, check } = input;
  if (check?.safeguarding) {
    return {
      ok: true,
      answerVerdict: null,
      reasoningVerdict: null,
      codes: [],
      aiFallback: false,
      borderline: false,
      safeguarding: true,
      judged: false,
    };
  }

  const codes: string[] = [...(check?.misconceptionCodes ?? [])];
  const addCode = (c: string | null) => {
    if (c && !codes.includes(c)) codes.push(c);
  };

  // Answer side.
  let answerVerdict: YesNo | null;
  if (input.answerMode === 'tap') {
    const v = judgeTapAnswer(input.answerText, item.tapOptions, item.acceptedAnswers);
    if (v === 'invalid') return { ok: false, reason: 'bad_tap' };
    answerVerdict = firm(v);
  } else {
    answerVerdict = firm(check?.answerCorrect);
    if (answerVerdict === null && input.tapAnswer !== null) {
      const v = judgeTapAnswer(input.tapAnswer, item.tapOptions, item.acceptedAnswers);
      if (v === 'invalid') return { ok: false, reason: 'bad_tap' };
      answerVerdict = firm(v);
    }
  }

  // Reason side.
  let reasoningVerdict: YesNo | null;
  if (input.reasonMode === 'tap') {
    const v = judgeTapReason(input.reasonText, item.reasonOptions);
    if (v === 'invalid') return { ok: false, reason: 'bad_tap' };
    reasoningVerdict = v.sound ? 'yes' : 'no';
    addCode(v.code);
  } else {
    reasoningVerdict = firm(check?.reasoningSound);
    if (reasoningVerdict === null && input.tapReason !== null) {
      const v = judgeTapReason(input.tapReason, item.reasonOptions);
      if (v === 'invalid') return { ok: false, reason: 'bad_tap' };
      reasoningVerdict = v.sound ? 'yes' : 'no';
      addCode(v.code);
    }
  }

  const typedSide = input.answerMode === 'typing' || input.reasonMode === 'typing';
  const borderline =
    check !== null &&
    ((input.answerMode === 'typing' && check.answerCorrect === 'unsure') ||
      (input.reasonMode === 'typing' && check.reasoningSound === 'unsure'));

  return {
    ok: true,
    answerVerdict,
    reasoningVerdict,
    codes,
    aiFallback: check === null && typedSide,
    borderline,
    safeguarding: false,
    judged: answerVerdict !== null && reasoningVerdict !== null,
  };
}
