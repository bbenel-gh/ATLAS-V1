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

/**
 * { code } alone asks whether the pupil must choose a PIN (S11): the answer is
 * needsPin for a pupil with no PIN, and askPin for everyone else, unknown codes
 * included, so it says no more than S10 already did. setPin needs a PIN.
 */
export const signinInputSchema = z
  .strictObject({
    code: z.string().transform(normaliseCode).pipe(z.string().regex(CODE_PATTERN)),
    pin: z.string().regex(PIN_PATTERN).optional(),
    setPin: z.boolean().optional(),
  })
  .refine((v) => !v.setPin || v.pin !== undefined, { message: 'setPin needs a PIN', path: ['pin'] });
export type SigninInput = z.infer<typeof signinInputSchema>;

const CODE_CHARS = new Set(CODE_ALPHABET);

/** As the pupil types: uppercase, drop anything that cannot be in a code (0, O, 1, I, spaces), at most 6. */
export function filterCodeInput(text: string): string {
  return Array.from(text.toUpperCase())
    .filter((c) => CODE_CHARS.has(c))
    .join('')
    .slice(0, CODE_LENGTH);
}

/** As the pupil types: digits only, at most 4. */
export function filterPinInput(text: string): string {
  return text.replace(/[^0-9]/g, '').slice(0, 4);
}

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
  expires_at?: number;
  expires_in: number;
  token_type: string;
};

export type SigninResponse =
  | { session: SigninSession }
  | { needsPin: true }
  | { askPin: true }
  | { locked: true; minutes: number }
  | { error: 'bad_input' | 'rate_limited' | 'no_match' | 'server' };

// What the app makes of a reply ------------------------------------------------------

export type SigninOutcome =
  | { kind: 'session'; session: SigninSession }
  | { kind: 'needsPin' }
  | { kind: 'askPin' }
  | { kind: 'locked'; minutes: number }
  | { kind: 'noMatch' }
  | { kind: 'rateLimited' }
  | { kind: 'failed' };

const sessionSchema = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
  expires_at: z.number().optional(),
  expires_in: z.number(),
  token_type: z.string(),
});

/** Checks the reply's status and shape with zod. Anything unexpected is "failed". */
export function interpretSigninReply(status: number, body: unknown): SigninOutcome {
  const obj = body !== null && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  if (status === 200) {
    const session = sessionSchema.safeParse(obj.session);
    if (session.success) return { kind: 'session', session: session.data };
    if (obj.needsPin === true) return { kind: 'needsPin' };
    if (obj.askPin === true) return { kind: 'askPin' };
    return { kind: 'failed' };
  }
  if (status === 423 && obj.locked === true && typeof obj.minutes === 'number' && obj.minutes > 0) {
    return { kind: 'locked', minutes: Math.ceil(obj.minutes) };
  }
  if (status === 401 && obj.error === 'no_match') return { kind: 'noMatch' };
  if (status === 429) return { kind: 'rateLimited' };
  return { kind: 'failed' };
}
