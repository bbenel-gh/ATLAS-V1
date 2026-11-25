/**
 * pupil-signin: a pupil signs in with code and PIN (specs/prd.md FR-1, FR-2;
 * runbook S10; D-36).
 *
 * POST { code }              (S11, D-37) needsPin for a pupil with no PIN, else askPin
 * POST { code, pin, setPin? }
 *   needsPin   the pupil has no PIN yet; call again with setPin: true
 *   session    a normal Supabase session for the pupil's auth user, so RLS works
 *   locked     5 wrong PINs: wait <minutes>, the PIN is not even checked
 *   no_match   unknown code, wrong PIN or suspended pupil: one answer for all
 *
 * The rules (code format, lockout maths) are in src/domain/auth.ts. The PIN is
 * hashed and compared inside Postgres (bcrypt, pgcrypto); this function never
 * reads the hash. The session is minted with an admin magic link verified here
 * on the server: no email is sent and no password exists.
 *
 * Never logged: the code, the PIN, the hash or the session (rule 9).
 */
import { createClient } from '@supabase/supabase-js';

import {
  afterWrongPin,
  isLocked,
  minutesLeft,
  rateBucket,
  SIGNIN_RATE_PER_MINUTE,
  type SigninResponse,
  signinInputSchema,
} from '../../../src/domain/auth.ts';

/** New projects give JSON maps of keys ({"default": "sb_..."}); older ones give single keys. */
function keyFromEnv(single: string, map: string): string {
  const direct = Deno.env.get(single);
  if (direct) return direct;
  try {
    const keys = JSON.parse(Deno.env.get(map) ?? '{}') as Record<string, string>;
    return keys.default ?? Object.values(keys)[0] ?? '';
  } catch {
    return '';
  }
}

const url = Deno.env.get('SUPABASE_URL') ?? '';
const serviceKey = keyFromEnv('SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SECRET_KEYS');
const anonKey = keyFromEnv('SUPABASE_ANON_KEY', 'SUPABASE_PUBLISHABLE_KEYS');
const pepper = Deno.env.get('SIGNIN_PEPPER') ?? '';

const noSession = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
const admin = createClient(url, serviceKey, noSession);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: SigninResponse, outcome: string, started: number, pupilId?: string): Response {
  console.log(JSON.stringify({ outcome, pupil_id: pupilId ?? null, ms: Date.now() - started }));
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}

async function hmacHex(text: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pepper), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** The pupil's auth user email, creating the user on first sign-in of an admin-made pupil. */
async function authEmail(pupilId: string, userId: string | null): Promise<string> {
  if (userId) {
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data.user.email) throw new Error('auth user not found');
    return data.user.email;
  }
  const email = `pupil-${pupilId}@pupils.atlas.invalid`;
  const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, app_metadata: { atlas_role: 'pupil' } });
  if (error || !data.user) throw new Error('could not create auth user');
  const linked = await admin.rpc('link_pupil_user', { p_pupil_id: pupilId, p_user_id: data.user.id });
  if (linked.error || linked.data !== true) {
    await admin.auth.admin.deleteUser(data.user.id);
    throw new Error('could not link auth user');
  }
  return email;
}

/** A normal session for this auth user: admin magic link, verified here, never emailed. */
async function mintSession(email: string) {
  const link = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  const tokenHash = link.data?.properties?.hashed_token;
  if (link.error || !tokenHash) throw new Error('could not create sign-in link');
  const client = createClient(url, anonKey, noSession);
  const { data, error } = await client.auth.verifyOtp({ type: 'magiclink', token_hash: tokenHash });
  if (error || !data.session) throw new Error('could not verify sign-in link');
  const s = data.session;
  return { access_token: s.access_token, refresh_token: s.refresh_token, expires_at: s.expires_at, expires_in: s.expires_in, token_type: s.token_type };
}

Deno.serve(async (req) => {
  const started = Date.now();
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return reply(405, { error: 'bad_input' }, 'bad_method', started);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'bad_input' }, 'bad_json', started);
  }
  const input = signinInputSchema.safeParse(body);
  if (!input.success) return reply(400, { error: 'bad_input' }, 'bad_input', started);
  const { code, pin, setPin } = input.data;

  try {
    if (!url || !serviceKey || !anonKey || pepper.length < 32) throw new Error('function is not configured');
    const now = new Date();

    // Rate limit every code, known or not, so the limit says nothing about which codes exist.
    const allowed = await admin.rpc('signin_rate_hit', {
      p_key: await hmacHex(code),
      p_minute: rateBucket(now),
      p_limit: SIGNIN_RATE_PER_MINUTE,
    });
    if (allowed.error) throw new Error('rate limit check failed');
    if (allowed.data !== true) return reply(429, { error: 'rate_limited' }, 'rate_limited', started);

    const lookup = await admin.rpc('pupil_signin_lookup', { p_code: code });
    if (lookup.error) throw new Error('lookup failed');
    const pupil = lookup.data?.[0];
    const lockedUntil = pupil?.locked_until ? new Date(pupil.locked_until) : null;

    // Code alone (S11): must this pupil choose a PIN first? Only an active,
    // unlocked pupil with no PIN gets needsPin. Everyone else, unknown codes
    // included, gets the same askPin, so this says no more than needsPin did.
    if (pin === undefined) {
      const choose = pupil && pupil.status === 'active' && !pupil.has_pin && !isLocked(lockedUntil, now);
      return choose
        ? reply(200, { needsPin: true }, 'needs_pin', started, pupil.pupil_id)
        : reply(200, { askPin: true }, 'ask_pin', started);
    }

    if (!pupil || pupil.status !== 'active') return reply(401, { error: 'no_match' }, 'no_match', started);

    if (lockedUntil && isLocked(lockedUntil, now)) {
      return reply(423, { locked: true, minutes: minutesLeft(lockedUntil, now) }, 'locked', started, pupil.pupil_id);
    }

    if (!pupil.has_pin) {
      if (!setPin) return reply(200, { needsPin: true }, 'needs_pin', started, pupil.pupil_id);
      const set = await admin.rpc('set_pupil_pin', { p_pupil_id: pupil.pupil_id, p_pin: pin });
      if (set.error) throw new Error('could not set PIN');
      if (set.data !== true) return reply(401, { error: 'no_match' }, 'pin_already_set', started, pupil.pupil_id);
      const session = await mintSession(await authEmail(pupil.pupil_id, pupil.user_id));
      return reply(200, { session }, 'pin_set', started, pupil.pupil_id);
    }

    const check = await admin.rpc('check_pupil_pin', { p_pupil_id: pupil.pupil_id, p_pin: pin });
    const result = check.data?.[0];
    if (check.error || !result) throw new Error('PIN check failed');

    if (!result.ok) {
      const next = afterWrongPin(result.failed_count, now);
      if (next.lock) {
        const lock = await admin.rpc('lock_pupil', { p_pupil_id: pupil.pupil_id, p_until: next.lockedUntil.toISOString() });
        if (lock.error) throw new Error('could not lock');
        return reply(423, { locked: true, minutes: minutesLeft(next.lockedUntil, now) }, 'locked_now', started, pupil.pupil_id);
      }
      return reply(401, { error: 'no_match' }, 'wrong_pin', started, pupil.pupil_id);
    }

    const session = await mintSession(await authEmail(pupil.pupil_id, pupil.user_id));
    return reply(200, { session }, 'signed_in', started, pupil.pupil_id);
  } catch (e) {
    console.error(JSON.stringify({ outcome: 'server_error', reason: e instanceof Error ? e.message : 'unknown' }));
    return reply(500, { error: 'server' }, 'server_error', started);
  }
});
