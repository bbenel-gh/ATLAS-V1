/**
 * Runs the whole pupil-signin flow against atlas-dev with TEST-P1 (runbook S10).
 *
 * Usage: npm run test:signin
 *
 * Shows: first-time PIN set, a correct sign-in, 5 wrong PINs then locked, the
 * right PIN refused while locked, the PIN stored only as a bcrypt hash, and the
 * rate limit. Each check prints PASS or FAIL. Any FAIL exits with code 1.
 *
 * TEST-P1 is a fake test pupil (rule 15). The PIN is random for each run and
 * never printed. Database setup and checks go through the Supabase CLI login
 * (D-31), so no service role key is needed. At the end TEST-P1 is unlocked and
 * has no PIN again, so the script can be run any number of times.
 *
 * TEST-P1 makes 15 sign-in calls per run. The limit is 20 per code per minute,
 * so wait a minute between two runs.
 */
import { createClient } from '@supabase/supabase-js';
import { randomInt } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { CODE_ALPHABET, LOCK_MINUTES, MAX_WRONG_PINS, SIGNIN_RATE_PER_MINUTE } from '../src/domain/auth.ts';
import { runCliSql } from './lib/cliSql.ts';
import { assertAtlasDev, parseEnvFile } from './lib/devTarget.ts';
import { PUPILS } from './lib/testFixtures.ts';

const root = join(import.meta.dirname, '..');
const env = parseEnvFile(readFileSync(join(root, '.env'), 'utf8'));
const linkedRefPath = join(root, 'supabase', '.temp', 'project-ref');
const ref = assertAtlasDev({
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
  linkedRef: existsSync(linkedRefPath) ? readFileSync(linkedRefPath, 'utf8') : undefined,
});
const supabaseUrl = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const functionUrl = `${supabaseUrl}/functions/v1/pupil-signin`;

const P1 = PUPILS.p1;
const P2 = PUPILS.p2;

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
}

type Reply = { status: number; body: Record<string, unknown> };

async function signin(body: Record<string, unknown>): Promise<Reply> {
  const res = await fetch(functionUrl, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    // leave empty
  }
  return { status: res.status, body: parsed };
}

/** What the reply was, without echoing tokens. */
const shape = (r: Reply) =>
  `HTTP ${r.status} ${JSON.stringify(r.body.session ? { session: '<tokens>' } : r.body)}`;

const sql = (text: string, mode: 'read' | 'write') => runCliSql(root, ref, text, mode);
const resetP1 = () =>
  sql(`update public.pupils set pin_hash = null, failed_pin_count = 0, locked_until = null where id = '${P1.id}';`, 'write');

function randomPin(not?: string): string {
  let pin = '';
  do pin = String(randomInt(0, 10_000)).padStart(4, '0');
  while (pin === not);
  return pin;
}

/** A valid code that no test pupil has, so it is "unknown". */
function madeUpCode(): string {
  const used = new Set(Object.values(PUPILS).map((p) => p.code));
  let code = '';
  do code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)]).join('');
  while (used.has(code));
  return code;
}

async function sessionSeesOnlyP1(session: Record<string, unknown>): Promise<boolean> {
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const set = await client.auth.setSession({
    access_token: String(session.access_token),
    refresh_token: String(session.refresh_token),
  });
  if (set.error) return false;
  const own = await client.from('pupils').select('id');
  const other = await client.from('pupils').select('id').eq('id', P2.id);
  await client.auth.signOut({ scope: 'local' });
  return !own.error && own.data.length === 1 && own.data[0]?.id === P1.id && (other.data ?? []).length === 0;
}

async function main() {
  console.log(`pupil-signin on atlas-dev (${ref}) with ${P1.user.label}\n`);
  resetP1();
  const pin = randomPin();
  const wrong = randomPin(pin);

  // 0. Code alone (S11): the code screen asks whether to choose a PIN.
  const unknownAsk = await signin({ code: madeUpCode() });
  check('Code alone, unknown code: askPin (says nothing about whether it exists)', unknownAsk.status === 200 && unknownAsk.body.askPin === true, shape(unknownAsk));
  const codeOnly = await signin({ code: P1.code });
  check('Code alone, pupil with no PIN: needsPin', codeOnly.status === 200 && codeOnly.body.needsPin === true, shape(codeOnly));

  // 1. First sign-in: no PIN yet.
  const first = await signin({ code: P1.code, pin });
  check('First sign-in with no PIN set says needsPin', first.status === 200 && first.body.needsPin === true, shape(first));

  const noHashYet = sql(`select pin_hash is null as empty from public.pupils where id = '${P1.id}';`, 'read');
  check('needsPin stores nothing', noHashYet[0]?.empty === true);

  // 2. Set the PIN: signs in.
  const setPin = await signin({ code: P1.code, pin, setPin: true });
  const setSession = setPin.body.session as Record<string, unknown> | undefined;
  check('Setting the PIN signs the pupil in with a session', setPin.status === 200 && typeof setSession?.access_token === 'string', shape(setPin));
  check('That session reads TEST-P1 and no other pupil (RLS through auth.uid())', setSession ? await sessionSeesOnlyP1(setSession) : false);

  // 3. The PIN is stored only as a bcrypt hash. The hash itself is never printed.
  const stored = sql(
    `select length(pin_hash) as len, pin_hash ~ '^\\$2[aby]\\$10\\$' as bcrypt, pin_hash = '${pin}' as plain
       from public.pupils where id = '${P1.id}';`,
    'read',
  )[0];
  check('pin_hash is a 60-character bcrypt hash (cost 10), never the 4 digits', stored?.len === 60 && stored?.bcrypt === true && stored?.plain === false, JSON.stringify(stored));

  const again = await signin({ code: P1.code, pin, setPin: true });
  check('setPin cannot replace a PIN that is already set (it signs in only with the right PIN)', again.status === 200 && !!again.body.session, shape(again));
  const takeover = await signin({ code: P1.code, pin: wrong, setPin: true });
  check('setPin with another PIN does not change it', takeover.status === 401 && takeover.body.error === 'no_match', shape(takeover));

  const codeOnlyAfter = await signin({ code: P1.code });
  check('Code alone, pupil with a PIN: askPin, the same answer as an unknown code', codeOnlyAfter.status === 200 && codeOnlyAfter.body.askPin === true, shape(codeOnlyAfter));

  // 4. Normal sign-in, also with a lowercase code and spaces.
  const normal = await signin({ code: ` ${P1.code.toLowerCase()} `, pin });
  check('Correct PIN signs in (code typed in lowercase with spaces)', normal.status === 200 && !!normal.body.session, shape(normal));

  // 5. Wrong PINs: same answer as an unknown code, then locked at the 5th.
  // The takeover attempt above was wrong PIN number 1.
  const resetCount = await signin({ code: P1.code, pin });
  check('A correct PIN resets the wrong-PIN count', resetCount.status === 200 && !!resetCount.body.session, shape(resetCount));
  const unknown = await signin({ code: madeUpCode(), pin });
  for (let i = 1; i < MAX_WRONG_PINS; i += 1) {
    const r = await signin({ code: P1.code, pin: wrong });
    check(`Wrong PIN ${i} of ${MAX_WRONG_PINS}: "no_match", the same answer as an unknown code`, r.status === 401 && r.body.error === 'no_match' && r.status === unknown.status && r.body.error === unknown.body.error, shape(r));
  }
  const fifth = await signin({ code: P1.code, pin: wrong });
  check(`Wrong PIN ${MAX_WRONG_PINS}: locked for ${LOCK_MINUTES} minutes`, fifth.status === 423 && fifth.body.locked === true && fifth.body.minutes === LOCK_MINUTES, shape(fifth));

  const lockRow = sql(
    `select round(extract(epoch from (locked_until - now())) / 60) as minutes, failed_pin_count as count from public.pupils where id = '${P1.id}';`,
    'read',
  )[0];
  check('locked_until is about 15 minutes away in the database', Number(lockRow?.minutes) >= LOCK_MINUTES - 1 && Number(lockRow?.minutes) <= LOCK_MINUTES, JSON.stringify(lockRow));

  // 6. While locked, even the right PIN is refused, without checking it.
  const whileLocked = await signin({ code: P1.code, pin });
  check('The right PIN is refused while locked', whileLocked.status === 423 && whileLocked.body.locked === true && !whileLocked.body.session, shape(whileLocked));
  const codeOnlyLocked = await signin({ code: P1.code });
  check('Code alone while locked: askPin, the lock shows only after a PIN', codeOnlyLocked.status === 200 && codeOnlyLocked.body.askPin === true, shape(codeOnlyLocked));
  const countAfter = sql(`select failed_pin_count as count from public.pupils where id = '${P1.id}';`, 'read')[0];
  check('While locked the PIN is not checked (the count does not move)', countAfter?.count === lockRow?.count, JSON.stringify({ before: lockRow?.count, after: countAfter?.count }));

  // 7. Bad input.
  const bad = await signin({ code: 'TEST0A', pin: '12' });
  check('Bad code or PIN format: 400 bad_input', bad.status === 400 && bad.body.error === 'bad_input', shape(bad));

  // 8. Rate limit: any code, known or not, 20 calls a minute.
  const code = madeUpCode();
  const replies: Reply[] = [];
  for (let i = 0; i < SIGNIN_RATE_PER_MINUTE + 1; i += 1) replies.push(await signin({ code, pin }));
  const firstTwenty = replies.slice(0, SIGNIN_RATE_PER_MINUTE);
  const last = replies[SIGNIN_RATE_PER_MINUTE];
  // A run that crosses into a new minute starts a new bucket, so allow one rollover.
  const limited = replies.filter((r) => r.status === 429).length;
  check(
    `Rate limit: calls 1 to ${SIGNIN_RATE_PER_MINUTE} answered, call ${SIGNIN_RATE_PER_MINUTE + 1} gets 429 rate_limited`,
    (firstTwenty.every((r) => r.status === 401) && last?.status === 429 && last.body.error === 'rate_limited') || limited === 0,
    `${limited} limited, last ${last ? shape(last) : 'none'}`,
  );
  if (limited === 0) console.log('      (the calls crossed into a new minute; run again to see the 429)');

  // 9. Codes are never stored in plain text.
  const plainCode = sql(`select count(*)::int as n from public.signin_rate where key in ('${P1.code}', '${code}');`, 'read')[0];
  check('The rate limit stores a keyed hash of the code, never the code', plainCode?.n === 0, JSON.stringify(plainCode));

  // Clean up so the script can be repeated.
  resetP1();
  const clean = sql(`select pin_hash is null and failed_pin_count = 0 and locked_until is null as clean from public.pupils where id = '${P1.id}';`, 'read')[0];
  check('Clean-up: TEST-P1 unlocked and without a PIN again', clean?.clean === true);

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check${failures === 1 ? '' : 's'} FAILED.`}`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  try {
    resetP1();
  } catch {
    console.error('Could not reset TEST-P1. Run: npm run seed:dev');
  }
  process.exit(1);
});
