/**
 * S20 attempt rules (runbook S20; specs/prd.md FR-15 to FR-23; D-29, D-52).
 * Written before src/domain/attempt.ts.
 *
 * The server decides every verdict (D-29). Each side of the attempt (answer,
 * reason) is decided by, in order: the pupil's own tap, the stored AI check
 * when it says yes or no, a tie-break or fallback tap judged on the server.
 * Nothing else. "unsure" with no tap stays not judged.
 */
import type { CheckResult } from './aiSchemas';
import type { CheckItem } from './check';
import {
  ATTEMPT_TIME_MAX_MS,
  checkMatchesAttempt,
  resolveAttempt,
  saveAttemptInputSchema,
  toInputMode,
  type ResolveInput,
} from './attempt';

const item: CheckItem = {
  question: 'Why is iron used for nails?',
  acceptedAnswers: ['It is hard'],
  tapOptions: ['It is hard', 'It is shiny', 'It is heavy'],
  reasonOptions: [
    { text: 'Hard things keep their shape when hit', code: null },
    { text: 'Heavy things are always strong', code: '1B-M1' },
    { text: 'Shiny things are metal', code: '1B-M2' },
  ],
  referenceReasoning: 'Hard materials resist being dented.',
};

const ai = (over: Partial<CheckResult> = {}): CheckResult => ({
  answerCorrect: 'yes',
  reasoningSound: 'yes',
  misconceptionCodes: [],
  readBack: 'You think iron is hard.',
  safeguarding: false,
  ...over,
});

const typed = (over: Partial<ResolveInput> = {}): ResolveInput => ({
  item,
  answerText: 'iron is hard',
  answerMode: 'typing',
  reasonText: 'it does not bend',
  reasonMode: 'typing',
  check: ai(),
  tapAnswer: null,
  tapReason: null,
  ...over,
});

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const validInput = {
  attempt_id: uuid(1),
  pupil_id: uuid(2),
  segment_code: '1A',
  round: 1,
  try_number: 1,
  question_id: uuid(3),
  version_label: 'a',
  answer_text: 'iron is hard',
  answer_mode: 'typing',
  reason_text: 'it does not bend',
  reason_mode: 'typing',
  sure: true,
  time_taken_ms: 12_345,
  changed_answer: false,
  read_back_confirmed: true,
  tap_answer: null,
  tap_reason: null,
  client_created_at: '2026-11-28T10:00:00.000Z',
};

describe('saveAttemptInputSchema', () => {
  it('accepts a full attempt with every FR-23 field', () => {
    expect(saveAttemptInputSchema.safeParse(validInput).success).toBe(true);
  });

  it('accepts a worked-example try (no version shown) and no read-back yet', () => {
    const r = saveAttemptInputSchema.safeParse({ ...validInput, version_label: null, read_back_confirmed: null });
    expect(r.success).toBe(true);
  });

  it('trims the texts', () => {
    const r = saveAttemptInputSchema.parse({ ...validInput, answer_text: '  hard  ', tap_reason: '  x ' });
    expect(r.answer_text).toBe('hard');
    expect(r.tap_reason).toBe('x');
  });

  it('allows an empty reason but not an empty answer', () => {
    expect(saveAttemptInputSchema.safeParse({ ...validInput, reason_text: '' }).success).toBe(true);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, answer_text: '   ' }).success).toBe(false);
  });

  it('refuses any extra field, a name above all (rule 2)', () => {
    expect(saveAttemptInputSchema.safeParse({ ...validInput, name: 'Ama' }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, answer_verdict: 'yes' }).success).toBe(false);
  });

  it('refuses a missing FR-23 field', () => {
    for (const key of ['sure', 'time_taken_ms', 'changed_answer', 'version_label', 'round', 'try_number'] as const) {
      const rest: Record<string, unknown> = { ...validInput };
      delete rest[key];
      expect(saveAttemptInputSchema.safeParse(rest).success).toBe(false);
    }
  });

  it('refuses texts over 600 characters', () => {
    expect(saveAttemptInputSchema.safeParse({ ...validInput, reason_text: 'x'.repeat(601) }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, tap_answer: 'x'.repeat(601) }).success).toBe(false);
  });

  it('refuses a try outside 1 to 3, a round below 1 and a bad version label', () => {
    expect(saveAttemptInputSchema.safeParse({ ...validInput, try_number: 4 }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, try_number: 0 }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, round: 0 }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, version_label: 'ab' }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, version_label: 'A' }).success).toBe(false);
  });

  it('refuses a negative or absurd time taken', () => {
    expect(saveAttemptInputSchema.safeParse({ ...validInput, time_taken_ms: -1 }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, time_taken_ms: 1.5 }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, time_taken_ms: ATTEMPT_TIME_MAX_MS + 1 }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, time_taken_ms: ATTEMPT_TIME_MAX_MS }).success).toBe(true);
  });

  it('refuses a bad id or date', () => {
    expect(saveAttemptInputSchema.safeParse({ ...validInput, attempt_id: 'abc' }).success).toBe(false);
    expect(saveAttemptInputSchema.safeParse({ ...validInput, client_created_at: 'yesterday' }).success).toBe(false);
  });
});

describe('toInputMode', () => {
  it('maps the phone modes to the database input_mode (D-52)', () => {
    expect(toInputMode('typing')).toBe('typed');
    expect(toInputMode('tap')).toBe('tap');
  });
});

describe('checkMatchesAttempt', () => {
  const stored = { answerText: 'iron is hard', answerMode: 'typing', reasonText: 'it does not bend', reasonMode: 'typing' } as const;

  it('matches the same texts and modes, ignoring outer spaces', () => {
    expect(checkMatchesAttempt(stored, { ...stored, answerText: ' iron is hard ' })).toBe(true);
  });

  it('does not match an edited reason or another mode', () => {
    expect(checkMatchesAttempt(stored, { ...stored, reasonText: 'it is strong' })).toBe(false);
    expect(checkMatchesAttempt(stored, { ...stored, answerMode: 'tap' })).toBe(false);
    expect(checkMatchesAttempt(stored, { ...stored, reasonMode: 'tap' })).toBe(false);
    expect(checkMatchesAttempt(stored, { ...stored, answerText: 'iron is soft' })).toBe(false);
  });
});

describe('resolveAttempt', () => {
  it('takes yes and yes from the AI check', () => {
    expect(resolveAttempt(typed())).toEqual({
      ok: true,
      answerVerdict: 'yes',
      reasoningVerdict: 'yes',
      codes: [],
      aiFallback: false,
      borderline: false,
      safeguarding: false,
      judged: true,
    });
  });

  it('keeps the AI codes on a wrong reason (lucky guess)', () => {
    const r = resolveAttempt(typed({ check: ai({ reasoningSound: 'no', misconceptionCodes: ['1B-M1'] }) }));
    expect(r).toMatchObject({ answerVerdict: 'yes', reasoningVerdict: 'no', codes: ['1B-M1'], judged: true });
  });

  it('judges a tap answer on the server, whatever the check says', () => {
    const r = resolveAttempt(typed({ answerMode: 'tap', answerText: 'It is shiny', check: ai({ answerCorrect: 'yes' }) }));
    expect(r).toMatchObject({ answerVerdict: 'no', reasoningVerdict: 'yes' });
  });

  it('judges a tap reason on the server and adds its code', () => {
    const r = resolveAttempt(typed({ reasonMode: 'tap', reasonText: 'Heavy things are always strong', check: ai({ reasoningSound: 'yes' }) }));
    expect(r).toMatchObject({ reasoningVerdict: 'no', codes: ['1B-M1'] });
  });

  it('judges two taps with no check at all, and that is not a fallback', () => {
    const r = resolveAttempt(
      typed({ answerMode: 'tap', answerText: 'It is hard', reasonMode: 'tap', reasonText: 'Hard things keep their shape when hit', check: null }),
    );
    expect(r).toMatchObject({ answerVerdict: 'yes', reasoningVerdict: 'yes', aiFallback: false, judged: true, codes: [] });
  });

  it('refuses a tap that is not one of the options', () => {
    expect(resolveAttempt(typed({ answerMode: 'tap', answerText: 'It is wood' }))).toEqual({ ok: false, reason: 'bad_tap' });
    expect(resolveAttempt(typed({ reasonMode: 'tap', reasonText: 'Because' }))).toEqual({ ok: false, reason: 'bad_tap' });
    expect(resolveAttempt(typed({ check: null, tapAnswer: 'It is wood', tapReason: 'Hard things keep their shape when hit' }))).toEqual({
      ok: false,
      reason: 'bad_tap',
    });
    expect(resolveAttempt(typed({ check: null, tapAnswer: 'It is hard', tapReason: 'Because' }))).toEqual({ ok: false, reason: 'bad_tap' });
  });

  it('AI fallback: the fallback taps decide, the typed words are kept, ai_fallback is set', () => {
    const r = resolveAttempt(typed({ check: null, tapAnswer: 'It is hard', tapReason: 'Shiny things are metal' }));
    expect(r).toEqual({
      ok: true,
      answerVerdict: 'yes',
      reasoningVerdict: 'no',
      codes: ['1B-M2'],
      aiFallback: true,
      borderline: false,
      safeguarding: false,
      judged: true,
    });
  });

  it('AI fallback with no taps: saved but not judged', () => {
    const r = resolveAttempt(typed({ check: null }));
    expect(r).toMatchObject({ answerVerdict: null, reasoningVerdict: null, aiFallback: true, judged: false });
  });

  it('a typed side with a fallback tap: only the typed side needs the tap', () => {
    const r = resolveAttempt(typed({ answerMode: 'tap', answerText: 'It is hard', check: null, tapReason: 'Hard things keep their shape when hit' }));
    expect(r).toMatchObject({ answerVerdict: 'yes', reasoningVerdict: 'yes', aiFallback: true, judged: true });
  });

  it('unsure answer: the tie-break tap decides, and a borderline flag is needed (FR-22)', () => {
    const r = resolveAttempt(typed({ check: ai({ answerCorrect: 'unsure' }), tapAnswer: 'It is heavy' }));
    expect(r).toMatchObject({ answerVerdict: 'no', reasoningVerdict: 'yes', borderline: true, judged: true, aiFallback: false });
  });

  it('unsure reason: the tie-break tap decides and its code is added once', () => {
    const r = resolveAttempt(
      typed({ check: ai({ reasoningSound: 'unsure', misconceptionCodes: ['1B-M1'] }), tapReason: 'Heavy things are always strong' }),
    );
    expect(r).toMatchObject({ reasoningVerdict: 'no', codes: ['1B-M1'], borderline: true });
  });

  it('unsure with no tie-break tap: saved, not judged, still borderline', () => {
    const r = resolveAttempt(typed({ check: ai({ answerCorrect: 'unsure', reasoningSound: 'unsure' }) }));
    expect(r).toMatchObject({ answerVerdict: null, reasoningVerdict: null, borderline: true, judged: false });
  });

  it('a tie-break tap is ignored when the AI already said yes or no', () => {
    const r = resolveAttempt(typed({ check: ai(), tapAnswer: 'It is heavy', tapReason: 'Shiny things are metal' }));
    expect(r).toMatchObject({ answerVerdict: 'yes', reasoningVerdict: 'yes', codes: [], borderline: false });
  });

  it('safeguarding: no verdict, no codes, no try used (rule 14)', () => {
    const r = resolveAttempt(typed({ check: ai({ safeguarding: true, misconceptionCodes: ['1B-M1'] }), tapAnswer: 'It is hard' }));
    expect(r).toEqual({
      ok: true,
      answerVerdict: null,
      reasoningVerdict: null,
      codes: [],
      aiFallback: false,
      borderline: false,
      safeguarding: true,
      judged: false,
    });
  });

  it('never returns unsure as a final verdict', () => {
    const r = resolveAttempt(typed({ check: ai({ answerCorrect: 'unsure' }) }));
    expect(r.ok && r.answerVerdict).not.toBe('unsure');
  });
});
