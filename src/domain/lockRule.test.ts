import { LOCK_AFTER_MS, shouldLockOnReturn, shouldLockOnStart } from './lockRule';

const T0 = Date.UTC(2026, 10, 25, 10, 0, 0);
const MIN = 60_000;

describe('lock rule', () => {
  it('locks after more than 5 minutes', () => {
    expect(LOCK_AFTER_MS).toBe(5 * MIN);
  });

  it.each([
    ['30 seconds', 30_000, false],
    ['4 minutes 59', 5 * MIN - 1_000, false],
    ['exactly 5 minutes (not more than 5)', 5 * MIN, false],
    ['5 minutes and 1 millisecond', 5 * MIN + 1, true],
    ['6 minutes', 6 * MIN, true],
    ['a day', 24 * 60 * MIN, true],
  ])('in the background for %s: lock is %s', (_, gap, lock) => {
    expect(shouldLockOnReturn(T0, T0 + gap)).toBe(lock);
  });

  it('does not lock when no background time was recorded', () => {
    expect(shouldLockOnReturn(null, T0)).toBe(false);
  });

  it('locks when the clock went backwards (safe side)', () => {
    expect(shouldLockOnReturn(T0, T0 - 1)).toBe(true);
  });

  it('locks on a cold start (phone restarted, or the app was closed) when a pupil is signed in', () => {
    expect(shouldLockOnStart(true)).toBe(true);
  });

  it('has nothing to lock on a cold start with nobody signed in', () => {
    expect(shouldLockOnStart(false)).toBe(false);
  });
});
