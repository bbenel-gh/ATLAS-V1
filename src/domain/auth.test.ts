import {
  afterWrongPin,
  CODE_ALPHABET,
  filterCodeInput,
  filterPinInput,
  interpretSigninReply,
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

  it('accepts a code alone, to ask whether the pupil must choose a PIN (S11)', () => {
    expect(signinInputSchema.parse({ code: 'testpa' })).toEqual({ code: 'TESTPA' });
  });

  it.each([
    ['setPin without a PIN', { code: 'TESTPA', setPin: true }],
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

describe('typing a code', () => {
  it('uppercases as the pupil types', () => {
    expect(filterCodeInput('testpa')).toBe('TESTPA');
  });

  it('ignores letters that cannot appear: 0, O, 1, I (and their lowercase)', () => {
    expect(filterCodeInput('A0B1CoDiE')).toBe('ABCDE');
    expect(filterCodeInput('OoIi01')).toBe('');
  });

  it('ignores spaces, dashes and other marks', () => {
    expect(filterCodeInput(' te-st p.a ')).toBe('TESTPA');
  });

  it('stops at 6 characters', () => {
    expect(filterCodeInput('ABCDEFGH')).toBe('ABCDEF');
  });

  it('only ever gives characters from the code alphabet', () => {
    const all = Array.from({ length: 128 }, (_, i) => String.fromCharCode(i)).join('');
    for (const c of filterCodeInput(all + all)) expect(CODE_ALPHABET).toContain(c);
  });
});

describe('typing a PIN', () => {
  it('keeps digits only, at most 4', () => {
    expect(filterPinInput('12a3 4567')).toBe('1234');
    expect(filterPinInput('abc')).toBe('');
  });
});

describe('interpretSigninReply', () => {
  const session = { access_token: 'a', refresh_token: 'r', expires_at: 1, expires_in: 3600, token_type: 'bearer' };

  it.each([
    [200, { session }, { kind: 'session', session }],
    [200, { needsPin: true }, { kind: 'needsPin' }],
    [200, { askPin: true }, { kind: 'askPin' }],
    [423, { locked: true, minutes: 15 }, { kind: 'locked', minutes: 15 }],
    [401, { error: 'no_match' }, { kind: 'noMatch' }],
    [429, { error: 'rate_limited' }, { kind: 'rateLimited' }],
    [400, { error: 'bad_input' }, { kind: 'failed' }],
    [500, { error: 'server' }, { kind: 'failed' }],
  ])('HTTP %i %j', (status, body, outcome) => {
    expect(interpretSigninReply(status, body)).toEqual(outcome);
  });

  it.each([
    ['a session without tokens', 200, { session: { access_token: 'a' } }],
    ['a locked reply without minutes', 423, { locked: true }],
    ['nothing', 200, null],
    ['text', 502, 'Bad gateway'],
    ['a session on an error status', 401, { session }],
  ])('treats %s as failed', (_, status, body) => {
    expect(interpretSigninReply(status, body)).toEqual({ kind: 'failed' });
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
