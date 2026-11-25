/**
 * Pupil sign-in rules (specs/prd.md FR-1, FR-2; runbook S10; D-36).
 *
 * Pure TypeScript, zod only. Used by the app (S11) and by the pupil-signin
 * Edge Function, which decides lockouts with these functions. The database only
 * hashes, compares and counts.
 */
import { z } from 'zod';

/** Pupil code characters: no 0, O, 1 or I, so codes are easy to read aloud and copy. */
export const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const CODE_LENGTH = 6;
export const MAX_WRONG_PINS = 5;
export const LOCK_MINUTES = 15;
export const SIGNIN_RATE_PER_MINUTE = 20;

const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const PIN_PATTERN = /^[0-9]{4}$/;
const MINUTE = 60_000;

/** What the pupil typed, made ready to check: spaces trimmed, letters uppercased. */
export const normaliseCode = (code: string): string => code.trim().toUpperCase();

export const isValidCode = (code: string): boolean => CODE_PATTERN.test(code);

export const isValidPin = (pin: string): boolean => PIN_PATTERN.test(pin);

export const signinInputSchema = z.strictObject({
  code: z.string().transform(normaliseCode).pipe(z.string().regex(CODE_PATTERN)),
  pin: z.string().regex(PIN_PATTERN),
  setPin: z.boolean().optional(),
});
export type SigninInput = z.infer<typeof signinInputSchema>;

/** Locked until the end time; from that moment on, free again. */
export function isLocked(lockedUntil: Date | null, now: Date): boolean {
  return lockedUntil !== null && lockedUntil.getTime() > now.getTime();
}

/** Whole minutes to wait, rounded up, at least 1, for "Please wait <n> minutes". */
export function minutesLeft(lockedUntil: Date, now: Date): number {
  return Math.max(1, Math.ceil((lockedUntil.getTime() - now.getTime()) / MINUTE));
}

/**
 * failedCount is the count after this wrong PIN. The 5th locks the code for
 * 15 minutes. The caller then resets the count, so the pupil gets 5 new tries
 * once the lock ends.
 */
export function afterWrongPin(failedCount: number, now: Date): { lock: true; lockedUntil: Date } | { lock: false } {
  if (failedCount < MAX_WRONG_PINS) return { lock: false };
  return { lock: true, lockedUntil: new Date(now.getTime() + LOCK_MINUTES * MINUTE) };
}

/** The start of the minute, as an ISO string: the rate limit counts calls per code per bucket. */
export function rateBucket(now: Date): string {
  return new Date(Math.floor(now.getTime() / MINUTE) * MINUTE).toISOString();
}

// What pupil-signin returns ------------------------------------------------------

export type SigninSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number | undefined;
  expires_in: number;
  token_type: string;
};

export type SigninResponse =
  | { session: SigninSession }
  | { needsPin: true }
  | { locked: true; minutes: number }
  | { error: 'bad_input' | 'rate_limited' | 'no_match' | 'server' };
