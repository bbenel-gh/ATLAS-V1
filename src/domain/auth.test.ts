import {
  afterWrongPin,
  CODE_ALPHABET,
  isLocked,
  isValidCode,
  isValidPin,
  LOCK_MINUTES,
  MAX_WRONG_PINS,
  minutesLeft,
  normaliseCode,
  rateBucket,
  SIGNIN_RATE_PER_MINUTE,
  signinInputSchema,
} from './auth';

const NOW = new Date('2026-11-25T10:00:00.000Z');
const plus = (ms: number) => new Date(NOW.getTime() + ms);
const MIN = 60_000;

describe('codes', () => {
  it('uses 32 characters with no 0, O, 1 or I', () => {
    expect(CODE_ALPHABET).toHaveLength(32);
    for (const c of ['0', 'O', '1', 'I']) expect(CODE_ALPHABET).not.toContain(c);
    expect(new Set(CODE_ALPHABET).size).toBe(32);
  });

  it('uppercases and trims before checking', () => {
    expect(normaliseCode('  testpa ')).toBe('TESTPA');
    expect(isValidCode(normaliseCode('testpa'))).toBe(true);
  });

  it.each([
    ['too short', 'TESTP'],
    ['too long', 'TESTPAA'],
    ['has 0', 'TEST0A'],
    ['has O', 'TESTOA'],
    ['has 1', 'TEST1A'],
    ['has I', 'TESTIA'],
    ['has a space inside', 'TES TA'],
    ['lowercase not normalised', 'testpa'],
    ['empty', ''],
  ])('refuses a code that is %s', (_, code) => {
    expect(isValidCode(code)).toBe(false);
  });
});

describe('PINs', () => {
  it('accepts exactly 4 digits', () => {
    expect(isValidPin('0420')).toBe(true);
  });

  it.each(['123', '12345', '12a4', ' 1234', '', '١٢٣٤'])('refuses "%s"', (pin) => {
    expect(isValidPin(pin)).toBe(false);
  });
});

describe('signinInputSchema', () => {
  it('normalises the code', () => {
    expect(signinInputSchema.parse({ code: ' testpa', pin: '1234' })).toEqual({ code: 'TESTPA', pin: '1234' });
  });

  it('keeps setPin when given', () => {
    expect(signinInputSchema.parse({ code: 'TESTPA', pin: '1234', setPin: true }).setPin).toBe(true);
  });

  it.each([
    ['a bad code', { code: 'TEST0A', pin: '1234' }],
    ['a bad PIN', { code: 'TESTPA', pin: '12' }],
    ['a number PIN', { code: 'TESTPA', pin: 1234 }],
    ['an extra field', { code: 'TESTPA', pin: '1234', pupilId: 'x' }],
    ['setPin not a boolean', { code: 'TESTPA', pin: '1234', setPin: 'yes' }],
    ['nothing', {}],
  ])('refuses %s', (_, input) => {
    expect(signinInputSchema.safeParse(input).success).toBe(false);
  });
});

describe('lockout maths', () => {
  it('locks after 5 wrong PINs for 15 minutes', () => {
    expect(MAX_WRONG_PINS).toBe(5);
    expect(LOCK_MINUTES).toBe(15);
  });

  it.each([1, 2, 3, 4])('does not lock at wrong PIN number %i', (n) => {
    expect(afterWrongPin(n, NOW)).toEqual({ lock: false });
  });

  it('locks at the 5th wrong PIN, until exactly 15 minutes from now', () => {
    expect(afterWrongPin(5, NOW)).toEqual({ lock: true, lockedUntil: plus(15 * MIN) });
  });

  it('still locks if the count somehow went past 5', () => {
    expect(afterWrongPin(7, NOW).lock).toBe(true);
  });

  it('is locked before the end time and unlocked from it on', () => {
    expect(isLocked(plus(1), NOW)).toBe(true);
    expect(isLocked(NOW, NOW)).toBe(false);
    expect(isLocked(plus(-1), NOW)).toBe(false);
    expect(isLocked(null, NOW)).toBe(false);
  });

  it('rounds the minutes left up, and never says 0', () => {
    expect(minutesLeft(plus(15 * MIN), NOW)).toBe(15);
    expect(minutesLeft(plus(14 * MIN + 1), NOW)).toBe(15);
    expect(minutesLeft(plus(1), NOW)).toBe(1);
    expect(minutesLeft(plus(-5 * MIN), NOW)).toBe(1);
  });
});

describe('rate limit', () => {
  it('allows 20 calls per minute per code', () => {
    expect(SIGNIN_RATE_PER_MINUTE).toBe(20);
  });

  it('puts every moment of a minute in the same bucket, and the next minute in a new one', () => {
    const start = new Date('2026-11-25T10:00:00.000Z');
    expect(rateBucket(new Date('2026-11-25T10:00:59.999Z'))).toBe(rateBucket(start));
    expect(rateBucket(new Date('2026-11-25T10:01:00.000Z'))).not.toBe(rateBucket(start));
    expect(rateBucket(start)).toBe('2026-11-25T10:00:00.000Z');
  });
});
