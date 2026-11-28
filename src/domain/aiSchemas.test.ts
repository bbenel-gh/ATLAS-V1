/**
 * S19 shared AI shapes (runbook S19 item 5; CLAUDE.md rules 3 and 7).
 * Written before src/domain/aiSchemas.ts.
 */
import {
  READ_BACK_MAX,
  checkReplySchema,
  checkResultSchema,
  cleanReadBack,
  extractJsonObject,
  parseCheckOutput,
} from './aiSchemas';

const good = {
  answer_correct: 'yes',
  reasoning_sound: 'no',
  misconception_codes: ['1B-M1'],
  read_back: 'You said that metal is strong because it is heavy.',
  safeguarding: false,
};
const asText = (o: unknown) => JSON.stringify(o);

describe('extractJsonObject', () => {
  it('reads a bare object', () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it('reads the object out of a code fence and a sentence around it', () => {
    expect(extractJsonObject('Here it is:\n```json\n{"a":1}\n```\nDone.')).toEqual({ a: 1 });
  });

  it('ignores thinking text', () => {
    expect(extractJsonObject('<think>maybe {"a":2}</think>{"a":1}')).toEqual({ a: 1 });
  });

  it('gives null for a list, no braces, or broken JSON', () => {
    expect(extractJsonObject('[{"a":1}]')).toBeNull();
    expect(extractJsonObject('no json here')).toBeNull();
    expect(extractJsonObject('{"a":')).toBeNull();
    expect(extractJsonObject('} {')).toBeNull();
  });
});

describe('cleanReadBack', () => {
  it('trims and joins lines and spaces', () => {
    expect(cleanReadBack('  You said   that\nwood is hard.  ')).toBe('You said that wood is hard.');
  });

  it('turns em and en dashes into commas and exclamation marks into full stops (rule 7)', () => {
    expect(cleanReadBack('You said that wood — not metal – floats!')).toBe(
      'You said that wood, not metal, floats.',
    );
  });
});

describe('parseCheckOutput', () => {
  it('maps the prompt fields to the app shape', () => {
    expect(parseCheckOutput(asText(good))).toEqual({
      answerCorrect: 'yes',
      reasoningSound: 'no',
      misconceptionCodes: ['1B-M1'],
      readBack: 'You said that metal is strong because it is heavy.',
      safeguarding: false,
    });
  });

  it('accepts unsure verdicts and an empty code list', () => {
    const r = parseCheckOutput(asText({ ...good, answer_correct: 'unsure', reasoning_sound: 'unsure', misconception_codes: [] }));
    expect(r).toMatchObject({ answerCorrect: 'unsure', reasoningSound: 'unsure', misconceptionCodes: [] });
  });

  it('accepts a read-back starting "You think"', () => {
    expect(parseCheckOutput(asText({ ...good, read_back: 'You think wood floats.' }))?.readBack).toBe(
      'You think wood floats.',
    );
  });

  it('cleans the read-back before checking it', () => {
    expect(parseCheckOutput(asText({ ...good, read_back: 'You said that it floats!' }))?.readBack).toBe(
      'You said that it floats.',
    );
  });

  it('ignores extra fields from the model', () => {
    expect(parseCheckOutput(asText({ ...good, confidence: 0.9 }))).not.toBeNull();
  });

  it.each([
    ['a missing field', { ...good, safeguarding: undefined }],
    ['a verdict outside yes, no, unsure', { ...good, answer_correct: 'maybe' }],
    ['codes that are not a list of strings', { ...good, misconception_codes: [1] }],
    ['safeguarding that is not true or false', { ...good, safeguarding: 'false' }],
    ['a read-back with the wrong start', { ...good, read_back: 'The pupil said that wood floats.' }],
    ['an empty read-back', { ...good, read_back: '   ' }],
    ['a read-back over the limit', { ...good, read_back: `You said that ${'very '.repeat(40)}hard.` }],
  ])('gives null for %s', (_name, output) => {
    expect(parseCheckOutput(asText(output))).toBeNull();
  });

  it('gives null for text that is not one JSON object', () => {
    expect(parseCheckOutput(`[${asText(good)}]`)).toBeNull();
    expect(parseCheckOutput('Sorry, I cannot help.')).toBeNull();
  });
});

describe('checkResultSchema and checkReplySchema', () => {
  const result = {
    answerCorrect: 'no',
    reasoningSound: 'no',
    misconceptionCodes: [],
    readBack: 'You said "Wood" because it is hard.',
    safeguarding: false,
  };

  it('allows a read-back of exactly the limit', () => {
    const readBack = `You said ${'a'.repeat(READ_BACK_MAX - 9)}`;
    expect(readBack).toHaveLength(READ_BACK_MAX);
    expect(checkResultSchema.safeParse({ ...result, readBack }).success).toBe(true);
    expect(checkResultSchema.safeParse({ ...result, readBack: `${readBack}a` }).success).toBe(false);
  });

  it('is strict: no extra fields ride along', () => {
    expect(checkResultSchema.safeParse({ ...result, name: 'Ama' }).success).toBe(false);
  });

  it('accepts the three reply kinds the function gives', () => {
    expect(checkReplySchema.safeParse({ ok: true, result }).success).toBe(true);
    expect(checkReplySchema.safeParse({ fallback: true, reason: 'ai' }).success).toBe(true);
    expect(checkReplySchema.safeParse({ fallback: true, reason: 'cap' }).success).toBe(true);
    expect(checkReplySchema.safeParse({ error: 'forbidden' }).success).toBe(true);
  });

  it('refuses anything else', () => {
    expect(checkReplySchema.safeParse({ ok: true }).success).toBe(false);
    expect(checkReplySchema.safeParse({ fallback: true }).success).toBe(false);
    expect(checkReplySchema.safeParse({ error: 'teapot' }).success).toBe(false);
    expect(checkReplySchema.safeParse({ ok: true, result: { ...result, answerCorrect: 'maybe' } }).success).toBe(false);
  });
});
