import { COPY } from './copy';

const strings = (value: unknown): string[] =>
  typeof value === 'string'
    ? [value]
    : typeof value === 'function'
      ? [String((value as (n: number) => string)(1)), String((value as (n: number) => string)(15))]
      : value && typeof value === 'object'
        ? Object.values(value).flatMap(strings)
        : [];

describe('pupil copy', () => {
  it('keeps the AI notice under 80 words (specs/prd.md FR-3)', () => {
    const words = COPY.notice.body.trim().split(/\s+/).length;
    expect(words).toBeLessThan(80);
  });

  it('says the AI does not see the name, and that a teacher can check its work', () => {
    expect(COPY.notice.body).toContain('It does not see your name.');
    expect(COPY.notice.body).toContain('A teacher can check its work.');
  });

  it('uses the runbook lines for the notice button, the waiting screen and "Not you?"', () => {
    expect(COPY.notice.button).toBe('I understand');
    expect(COPY.waiting.body).toBe('You are all set. Your teacher will let you start soon.');
    expect(COPY.waiting.button).toBe('Check again');
    expect(COPY.lock.notYou).toBe('Not you?');
  });

  it('says 1 minute and 15 minutes correctly in the lock message', () => {
    expect(COPY.signIn.locked(1)).toBe('Too many tries. Please wait 1 minute, or ask your teacher.');
    expect(COPY.signIn.locked(15)).toBe('Too many tries. Please wait 15 minutes, or ask your teacher.');
  });

  it('has no exclamation mark or em dash anywhere (CLAUDE.md rule 7)', () => {
    for (const s of strings(COPY)) {
      expect(s).not.toContain('!');
      expect(s).not.toContain('—');
    }
  });
});
