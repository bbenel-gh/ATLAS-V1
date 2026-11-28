/**
 * S19 answer and reason check rules (runbook S19; specs/prd.md FR-17;
 * specs/ai-prompts.md ai-check; CLAUDE.md rules 2, 3 and 11).
 * Written before src/domain/check.ts.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

import type { CheckResult } from './aiSchemas';
import {
  CHECK_MODEL,
  CHECK_SYSTEM_PROMPT,
  CHECK_TEXT_MAX,
  buildCheckUserMessage,
  checkInputSchema,
  combineCheck,
  filterCodes,
  judgeTapAnswer,
  judgeTapReason,
  tapReadBack,
  type CheckItem,
  type CheckSegment,
} from './check';

const input = {
  pupil_id: '7e570000-0000-4000-8000-000000000001',
  segment_code: '1B',
  try_number: 1,
  question_id: '7e570000-0000-4000-8000-0000000000aa',
  answer_text: 'Metal',
  answer_mode: 'typing',
  reason_text: 'It does not bend easily',
  reason_mode: 'typing',
};

const item: CheckItem = {
  question: 'Which is stronger, a metal spoon or a plastic spoon?',
  acceptedAnswers: ['The metal spoon', 'Metal'],
  tapOptions: ['The metal spoon', 'The plastic spoon', 'They are the same'],
  reasonOptions: [
    { text: 'It does not break or bend easily', code: null },
    { text: 'It is heavier', code: '1B-M1' },
    { text: 'It is shiny', code: '1B-M2' },
  ],
  referenceReasoning: 'Strength is how well a material resists breaking or bending.',
};

const segment: CheckSegment = {
  code: '1B',
  referenceMeaning: 'A strong material does not break or bend easily.',
  misconceptions: [
    { code: '1B-M1', text: 'Heavy means strong' },
    { code: '1B-M2', text: 'Shiny means strong' },
  ],
};

describe('model and prompt', () => {
  it('uses claude-sonnet-5-5 for the check', () => {
    expect(CHECK_MODEL).toBe('claude-sonnet-5-5');
  });

  it('is word for word the ai-check prompt in specs/ai-prompts.md', () => {
    const spec = readFileSync(join(__dirname, '..', '..', 'specs', 'ai-prompts.md'), 'utf8').replace(/\r\n/g, '\n');
    const section = (spec.split('## ai-check')[1] ?? '').split('## ai-overview')[0] ?? '';
    const block = (section.split('```text\n')[1] ?? '').split('\n```')[0];
    expect(CHECK_SYSTEM_PROMPT).toBe(block);
  });
});

describe('checkInputSchema', () => {
  it('accepts a typed attempt and trims the texts', () => {
    const r = checkInputSchema.parse({ ...input, answer_text: '  Metal ', reason_text: ' because ' });
    expect(r.answer_text).toBe('Metal');
    expect(r.reason_text).toBe('because');
  });

  it('accepts tap modes and an empty reason', () => {
    expect(checkInputSchema.safeParse({ ...input, answer_mode: 'tap', reason_mode: 'tap' }).success).toBe(true);
    expect(checkInputSchema.safeParse({ ...input, reason_text: '' }).success).toBe(true);
  });

  it('S20: takes an optional attempt id, so the server can keep the result for save-attempt', () => {
    const id = '00000000-0000-4000-8000-000000000001';
    expect(checkInputSchema.parse({ ...input, attempt_id: id }).attempt_id).toBe(id);
    expect(checkInputSchema.parse(input).attempt_id).toBeUndefined();
    expect(checkInputSchema.safeParse({ ...input, attempt_id: 'not-a-uuid' }).success).toBe(false);
  });

  it(`allows ${CHECK_TEXT_MAX} characters and no more`, () => {
    expect(CHECK_TEXT_MAX).toBe(600);
    expect(checkInputSchema.safeParse({ ...input, answer_text: 'a'.repeat(600) }).success).toBe(true);
    expect(checkInputSchema.safeParse({ ...input, answer_text: 'a'.repeat(601) }).success).toBe(false);
    expect(checkInputSchema.safeParse({ ...input, reason_text: 'a'.repeat(601) }).success).toBe(false);
  });

  it.each([
    ['an extra field such as a name (rule 2)', { ...input, name: 'Ama' }],
    ['a class field', { ...input, class: '7A' }],
    ['an empty answer', { ...input, answer_text: '   ' }],
    ['try 0', { ...input, try_number: 0 }],
    ['try 4', { ...input, try_number: 4 }],
    ['a try that is not a whole number', { ...input, try_number: 1.5 }],
    ['an unknown answer mode', { ...input, answer_mode: 'voice' }],
    ['an unknown reason mode', { ...input, reason_mode: 'handwriting' }],
    ['a pupil id that is not a uuid', { ...input, pupil_id: 'P1' }],
    ['a question id that is not a uuid', { ...input, question_id: '12' }],
    ['a segment code in the wrong form', { ...input, segment_code: '1b' }],
    ['a missing field', { ...input, reason_mode: undefined }],
  ])('refuses %s', (_name, body) => {
    expect(checkInputSchema.safeParse(body).success).toBe(false);
  });
});

describe('judgeTapAnswer', () => {
  it('is yes for a tap option that is an accepted answer, ignoring case and spaces', () => {
    expect(judgeTapAnswer('the metal  SPOON ', item.tapOptions, item.acceptedAnswers)).toBe('yes');
  });

  it('is no for a tap option that is not accepted', () => {
    expect(judgeTapAnswer('The plastic spoon', item.tapOptions, item.acceptedAnswers)).toBe('no');
  });

  it('is invalid for a "tap" answer that is not one of the options', () => {
    expect(judgeTapAnswer('Metal', item.tapOptions, item.acceptedAnswers)).toBe('invalid');
  });
});

describe('judgeTapReason', () => {
  it('maps the sound option to sound with no code', () => {
    expect(judgeTapReason('it does not break or bend easily', item.reasonOptions)).toEqual({ sound: true, code: null });
  });

  it('maps an unsound option to its misconception code', () => {
    expect(judgeTapReason('It is heavier', item.reasonOptions)).toEqual({ sound: false, code: '1B-M1' });
  });

  it('is invalid for text that is not one of the options, or empty', () => {
    expect(judgeTapReason('Because it is metal', item.reasonOptions)).toBe('invalid');
    expect(judgeTapReason('', item.reasonOptions)).toBe('invalid');
  });
});

describe('buildCheckUserMessage', () => {
  it('sends only the question, the references, the misconceptions and the two texts (rule 2)', () => {
    const msg = JSON.parse(buildCheckUserMessage(item, segment, 'Metal', 'It is heavier')) as Record<string, unknown>;
    expect(Object.keys(msg).sort()).toEqual(
      ['misconceptions', 'pupil_answer', 'pupil_reason', 'question', 'reference_meaning', 'reference_reasoning'].sort(),
    );
    expect(msg).toEqual({
      question: item.question,
      reference_meaning: segment.referenceMeaning,
      reference_reasoning: item.referenceReasoning,
      misconceptions: [
        { code: '1B-M1', description: 'Heavy means strong' },
        { code: '1B-M2', description: 'Shiny means strong' },
      ],
      pupil_answer: 'Metal',
      pupil_reason: 'It is heavier',
    });
  });

  it('never carries the accepted answers or the tap options', () => {
    const text = buildCheckUserMessage(item, segment, 'x', 'y');
    expect(text).not.toContain('They are the same');
    expect(text).not.toContain('accepted');
  });
});

describe('filterCodes', () => {
  it('keeps codes from this segment, without duplicates, and lists the rest as dropped', () => {
    expect(filterCodes(['1B-M1', '1C-M1', '1B-M1', 'made-up'], ['1B-M1', '1B-M2'])).toEqual({
      kept: ['1B-M1'],
      dropped: ['1C-M1', 'made-up'],
    });
  });

  it('gives two empty lists for no codes', () => {
    expect(filterCodes([], ['1B-M1'])).toEqual({ kept: [], dropped: [] });
  });
});

describe('tapReadBack', () => {
  it('builds one calm sentence starting "You said"', () => {
    expect(tapReadBack('The metal spoon', 'It is heavier')).toBe('You said "The metal spoon" because it is heavier.');
  });

  it('keeps a reason starting with "I" as it is and drops end punctuation', () => {
    expect(tapReadBack('Wood.', 'I have seen it float.')).toBe('You said "Wood" because I have seen it float.');
  });

  it('keeps a reason starting with a word in capitals as it is', () => {
    expect(tapReadBack('Wood', 'NaCCA says so')).toBe('You said "Wood" because NaCCA says so.');
    expect(tapReadBack('Wood', 'DRAFT: x')).toBe('You said "Wood" because DRAFT: x.');
  });

  it('cuts a long read-back at a word to stay within 200 characters', () => {
    const out = tapReadBack('The metal spoon', `It is ${'very '.repeat(60)}heavy`);
    expect(out.length).toBeLessThanOrEqual(200);
    expect(out.startsWith('You said "The metal spoon" because it is very')).toBe(true);
    expect(out.endsWith('very.')).toBe(true);
  });

  it('cuts even a single word that is too long', () => {
    expect(tapReadBack('a'.repeat(300), 'b').length).toBeLessThanOrEqual(200);
  });
});

describe('combineCheck', () => {
  const ai: CheckResult = {
    answerCorrect: 'no',
    reasoningSound: 'unsure',
    misconceptionCodes: ['1B-M2'],
    readBack: 'You said that the spoon is shiny.',
    safeguarding: false,
  };

  it('both taps: judged without AI, no safeguarding', () => {
    expect(
      combineCheck({ ai: null, tapAnswer: 'yes', tapReason: { sound: false, code: '1B-M1' }, readBack: 'You said "x" because y.' }),
    ).toEqual({
      answerCorrect: 'yes',
      reasoningSound: 'no',
      misconceptionCodes: ['1B-M1'],
      readBack: 'You said "x" because y.',
      safeguarding: false,
    });
  });

  it('both taps with the sound reason gives no codes', () => {
    const r = combineCheck({ ai: null, tapAnswer: 'yes', tapReason: { sound: true, code: null }, readBack: 'You said "x" because y.' });
    expect(r).toMatchObject({ reasoningSound: 'yes', misconceptionCodes: [] });
  });

  it('tap answer and typed reason: the answer verdict is the fixed one, the rest from the AI', () => {
    expect(combineCheck({ ai, tapAnswer: 'yes' })).toEqual({ ...ai, answerCorrect: 'yes' });
  });

  it('typed answer and tap reason: the reason verdict and its code are fixed, the rest from the AI', () => {
    expect(combineCheck({ ai, tapReason: { sound: false, code: '1B-M1' } })).toEqual({
      ...ai,
      reasoningSound: 'no',
      misconceptionCodes: ['1B-M2', '1B-M1'],
    });
  });

  it('does not repeat a code the AI already gave', () => {
    expect(combineCheck({ ai, tapReason: { sound: false, code: '1B-M2' } }).misconceptionCodes).toEqual(['1B-M2']);
  });

  it('both typed: the AI result as it is, safeguarding included', () => {
    expect(combineCheck({ ai: { ...ai, safeguarding: true } })).toEqual({ ...ai, safeguarding: true });
  });

  it('throws when there is no AI result and not both taps', () => {
    expect(() => combineCheck({ ai: null, tapAnswer: 'yes' })).toThrow();
  });
});
