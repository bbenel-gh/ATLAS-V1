/**
 * Row Level Security suite against atlas-dev (runbook S07, CLAUDE.md rule 8).
 *
 * Usage: npm run seed:dev   (once, or after changing the seed)
 *        npm run test:rls
 *
 * Signs in over the real API, with the public anon key, as each test user that
 * scripts/seedDev.ts created, and proves what each one can and cannot see or
 * change. Every check prints PASS or FAIL. Any FAIL exits with code 1.
 *
 * Reads are limited to the seeded test rows (ids starting 7e57), so other data
 * in atlas-dev never makes a check pass or fail. Write attempts that are
 * supposed to be refused are re-read as the admin to prove nothing changed.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { assertAtlasDev, parseEnvFile } from './lib/devTarget.ts';
import {
  CLASS_7A_PUPIL_IDS,
  CLASSES,
  CONTENT,
  PUPIL_IDS,
  PUPILS,
  rowIds,
  SCHOOL,
  STAFF,
  USERS,
  type TestUser,
} from './lib/testFixtures.ts';

const root = join(import.meta.dirname, '..');
const appEnv = parseEnvFile(readFileSync(join(root, '.env'), 'utf8'));
const envTestPath = join(root, '.env.test');
if (!existsSync(envTestPath)) {
  console.error('No .env.test. Run npm run seed:dev first.');
  process.exit(1);
}
const envTest = parseEnvFile(readFileSync(envTestPath, 'utf8'));
const linkedRefPath = join(root, 'supabase', '.temp', 'project-ref');
assertAtlasDev({
  supabaseUrl: appEnv.EXPO_PUBLIC_SUPABASE_URL,
  linkedRef: existsSync(linkedRefPath) ? readFileSync(linkedRefPath, 'utf8') : undefined,
});
const url = appEnv.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = appEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Output ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `\n        ${detail}` : ''}`);
}
function section(title: string) {
  console.log(`\n${title}`);
}

// Clients --------------------------------------------------------------------------

function newClient(): SupabaseClient {
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function signIn(u: TestUser): Promise<SupabaseClient> {
  const password = envTest[u.passwordEnv];
  if (!password) throw new Error(`${u.passwordEnv} missing from .env.test. Run npm run seed:dev.`);
  const client = newClient();
  const { error } = await client.auth.signInWithPassword({ email: u.email, password });
  check(`${u.label} signs in`, !error, error?.message);
  if (error) throw new Error(`Cannot sign in as ${u.label}`);
  return client;
}

// Read helpers ---------------------------------------------------------------------

type Rows = { rows: Record<string, unknown>[]; error: string | null };

async function read(client: SupabaseClient, table: string, columns: string, column: string, ids: string[]): Promise<Rows> {
  const { data, error } = await client.from(table).select(columns).in(column, ids);
  return { rows: (data ?? []) as unknown as Record<string, unknown>[], error: error?.message ?? null };
}

const sorted = (values: unknown[]) => values.map(String).sort();
const sameSet = (a: unknown[], b: unknown[]) => JSON.stringify(sorted([...new Set(a)])) === JSON.stringify(sorted([...new Set(b)]));

/** Sees exactly the rows whose `column` is in `expected`, out of the test ids in `scope`. */
async function seesOnly(
  client: SupabaseClient,
  who: string,
  table: string,
  column: string,
  scope: string[],
  expected: string[],
  what = table,
) {
  const { rows, error } = await read(client, table, column, column, scope);
  const got = rows.map((r) => r[column]);
  const ok = !error && sameSet(got, expected) && (expected.length === 0 || got.length > 0);
  check(`${who} sees only ${what} rows ${expected.length === 0 ? '(none)' : `for ${expected.length} expected`}`, ok,
    error ?? `got ${JSON.stringify(sorted(got))}, expected ${JSON.stringify(sorted(expected))}`);
}

/** Reads nothing: either refused outright or an empty result. */
async function seesNothing(client: SupabaseClient, name: string, table: string, column: string, ids: string[]) {
  const { rows, error } = await read(client, table, column, column, ids);
  check(name, rows.length === 0, error ? undefined : `got ${rows.length} rows`);
}

/** A column read that must be refused, even on the user's own row. */
async function columnRefused(client: SupabaseClient, name: string, table: string, columns: string, column: string, ids: string[]) {
  const { rows, error } = await read(client, table, columns, column, ids);
  const leaked = rows.some((r) => Object.keys(r).some((k) => columns.split(',').map((c) => c.trim()).includes(k) && r[k] !== undefined));
  check(name, error !== null && !leaked, error === null ? `no error, ${rows.length} rows returned` : undefined);
}

// Write helpers --------------------------------------------------------------------

/** An update that must change nothing: refused, or matching no visible row. */
async function updateRefused(
  client: SupabaseClient,
  name: string,
  table: string,
  values: Record<string, unknown>,
  column: string,
  idValue: string,
) {
  const { data, error } = await client.from(table).update(values).eq(column, idValue).select(column);
  const changed = (data ?? []).length;
  check(name, error !== null || changed === 0, `no error and ${changed} row(s) updated`);
}

async function insertRefused(client: SupabaseClient, name: string, table: string, values: Record<string, unknown>) {
  const { error } = await client.from(table).insert(values);
  check(name, error !== null, 'insert was accepted');
}

// The suite ------------------------------------------------------------------------

const P1 = PUPILS.p1.id;
const P2 = PUPILS.p2.id;
const P4 = PUPILS.p4.id;
const r1 = rowIds(1);
const r2 = rowIds(2);
const r4 = rowIds(4);

/** Pupil-owned tables, keyed by pupil_id (profiles uses pupil_id as its key). */
const PUPIL_TABLES = [
  'profiles',
  'consents',
  'attempts',
  'segment_status',
  'overview_responses',
  'exam_attempts',
  'exam_answers',
  'mastery',
] as const;

const ALL_TABLES = [
  'schools', 'staff', 'classes', 'pupils', 'consents', 'app_settings', 'profiles', 'topics', 'segments',
  'video_versions', 'check_items', 'worked_examples', 'exam_papers', 'exam_items', 'exam_item_keys',
  'recheck_items', 'overview_responses', 'attempts', 'segment_status', 'flags', 'exam_attempts',
  'exam_answers', 'mastery', 'ai_calls', 'signin_rate',
] as const;

/**
 * S10 (D-31, D-36): the pupil-signin database functions are for the service
 * role only. Nobody signed in, and nobody signed out, may run them: they would
 * let a caller test PINs without the lockout, set a PIN, unlock a pupil or read
 * which codes exist.
 */
async function signinFunctionChecks(who: string, client: SupabaseClient) {
  const calls: [string, Record<string, unknown>][] = [
    ['pupil_signin_lookup', { p_code: PUPILS.p1.code }],
    ['check_pupil_pin', { p_pupil_id: P1, p_pin: '0000' }],
    ['set_pupil_pin', { p_pupil_id: P1, p_pin: '0000' }],
    ['lock_pupil', { p_pupil_id: P1, p_until: null }],
    ['link_pupil_user', { p_pupil_id: P1, p_user_id: P1 }],
    ['signin_rate_hit', { p_key: '0'.repeat(64), p_minute: new Date().toISOString(), p_limit: 1000 }],
  ];
  for (const [fn, args] of calls) {
    const { data, error } = await client.rpc(fn, args);
    // 42501 = permission denied. Any other error (a typo in the arguments, say)
    // would prove nothing, so it fails.
    check(`${who} cannot run ${fn} (permission denied)`, error?.code === '42501', error ? `${error.code}: ${error.message}` : `returned ${JSON.stringify(data)}`);
  }
  const rate = await client.from('signin_rate').select('key').limit(1);
  check(`${who} reads nothing from signin_rate`, (rate.data ?? []).length === 0, rate.error ? undefined : `got ${(rate.data ?? []).length} rows`);
}

// Seeded owners per pupil table, so "sees only" knows which test pupils have rows.
const OWNERS: Record<(typeof PUPIL_TABLES)[number], string[]> = {
  profiles: PUPIL_IDS,
  consents: [P1, P2, P4],
  attempts: PUPIL_IDS,
  segment_status: PUPIL_IDS,
  overview_responses: PUPIL_IDS,
  exam_attempts: [P1, P2, P4],
  exam_answers: [P1, P2, P4],
  mastery: [P1, P2, P4],
};

async function anonChecks() {
  section('anon (not signed in)');
  const anon = newClient();
  for (const table of ALL_TABLES) {
    const { data, error } = await anon.from(table).select('*').limit(1);
    check(`anon reads nothing from ${table}`, (data ?? []).length === 0, error ? undefined : `got ${(data ?? []).length} rows`);
  }
  const items = await anon.rpc('get_exam_items', { p_attempt_id: r1.examAttempt });
  check('anon cannot call get_exam_items', items.error !== null || (items.data ?? []).length === 0);
  const review = await anon.rpc('get_exam_review', { p_attempt_id: r1.examAttempt });
  check('anon cannot call get_exam_review', review.error !== null || (review.data ?? []).length === 0);
}

async function pupilChecks(admin: SupabaseClient) {
  section('P1 (TEST-P1, Test Basic 7A)');
  const p1 = await signIn(USERS.p1);

  await seesOnly(p1, 'P1', 'pupils', 'id', PUPIL_IDS, [P1], 'pupil');
  for (const table of PUPIL_TABLES) {
    await seesOnly(p1, 'P1', table, 'pupil_id', PUPIL_IDS, OWNERS[table].includes(P1) ? [P1] : [], table);
  }
  for (const table of PUPIL_TABLES) {
    await seesNothing(p1, `P1 cannot read P2's ${table}`, table, 'pupil_id', [P2]);
  }
  await seesNothing(p1, "P1 cannot read P2's pupil row", 'pupils', 'id', [P2]);
  await seesNothing(p1, 'P1 cannot read the pupil in 7B', 'pupils', 'id', [P4]);
  await seesOnly(p1, 'P1', 'classes', 'id', [CLASSES.A.id, CLASSES.B.id], [CLASSES.A.id], 'class');
  await seesNothing(p1, 'P1 cannot read staff rows', 'staff', 'id', Object.values(STAFF).map((s) => s.id));

  // Flags and the AI log: not even their own (P1 has one of each).
  await seesNothing(p1, 'P1 cannot read flags, not even their own', 'flags', 'pupil_id', PUPIL_IDS);
  await seesNothing(p1, 'P1 cannot read ai_calls, not even their own', 'ai_calls', 'pupil_id', PUPIL_IDS);
  const settings = await p1.from('app_settings').select('id');
  check('P1 cannot read app_settings', (settings.data ?? []).length === 0);

  // PIN fields.
  await columnRefused(p1, 'P1 cannot read pin_hash, not even their own', 'pupils', 'pin_hash', 'id', [P1]);
  await columnRefused(p1, 'P1 cannot read failed_pin_count or locked_until', 'pupils', 'failed_pin_count, locked_until', 'id', [P1]);

  // Exam answers.
  await seesNothing(p1, 'P1 cannot read exam_items directly', 'exam_items', 'paper_id', [CONTENT.paperId]);
  await seesNothing(p1, 'P1 cannot read exam correct options or scheme points (exam_item_keys)', 'exam_item_keys', 'item_id',
    [CONTENT.objectiveItemId, CONTENT.theoryItemId]);
  const items = await p1.rpc('get_exam_items', { p_attempt_id: r1.examAttempt });
  const itemRows = (items.data ?? []) as Record<string, unknown>[];
  check('P1 gets the questions of their own open attempt', !items.error && itemRows.length === 2, items.error?.message);
  check('Those questions carry no correct option, scheme points or suggested answer',
    itemRows.every((r) => !('correct_option' in r) && !('scheme_points' in r) && !('suggested_answer' in r)));
  const review = await p1.rpc('get_exam_review', { p_attempt_id: r1.examAttempt });
  check('P1 gets no answer key before submitting', (review.data ?? []).length === 0, review.error?.message);
  const otherItems = await p1.rpc('get_exam_items', { p_attempt_id: r2.examAttempt });
  check("P1 gets no questions through P2's attempt", (otherItems.data ?? []).length === 0);
  const otherReview = await p1.rpc('get_exam_review', { p_attempt_id: r2.examAttempt });
  check("P1 gets no answer key through P2's attempt", (otherReview.data ?? []).length === 0);

  // Marks and progress: refused, then proven unchanged by the admin.
  await updateRefused(p1, 'P1 cannot set marks on their own exam answer', 'exam_answers', { marks_awarded: 5 }, 'id', r1.examAnswer);
  await updateRefused(p1, 'P1 cannot mark their own answer as approved', 'exam_answers', { approved_at: new Date().toISOString() }, 'id', r1.examAnswer);
  await updateRefused(p1, 'P1 cannot set a score on their own exam attempt', 'exam_attempts', { score: 100, max_score: 100 }, 'id', r1.examAttempt);
  await updateRefused(p1, 'P1 cannot change the AI verdict on their own attempt', 'attempts', { answer_verdict: 'yes', reasoning_verdict: 'yes' }, 'id', r1.attempt);
  await updateRefused(p1, 'P1 cannot mark their own segment complete', 'segment_status', { status: 'complete' }, 'pupil_id', P1);
  await updateRefused(p1, 'P1 cannot change their own mastery', 'mastery', { status: 'confirmed', exam_score: 100 }, 'pupil_id', P1);
  await updateRefused(p1, "P1 cannot change P2's profile", 'profiles', { interests: ['changed'] }, 'pupil_id', P2);
  await updateRefused(p1, 'P1 cannot change their own class or name', 'pupils', { display_name: 'Changed' }, 'id', P1);
  await insertRefused(p1, 'P1 cannot write a flag', 'flags', { pupil_id: P1, kind: 'safeguarding' });
  await insertRefused(p1, 'P1 cannot write an AI call log row', 'ai_calls', { job: 'check', model: 'x', pupil_id: P1, ok: true });
  await insertRefused(p1, 'P1 cannot save an attempt with their own verdict', 'attempts', {
    pupil_id: P1, segment_id: CONTENT.segmentId, try_number: 2, input_mode: 'typed', answer: 'x', answer_verdict: 'yes', reasoning_verdict: 'yes',
  });
  await insertRefused(p1, 'P1 cannot save an attempt as P2', 'attempts', {
    pupil_id: P2, segment_id: CONTENT.segmentId, try_number: 2, input_mode: 'typed', answer: 'x',
  });

  const answer = await admin.from('exam_answers').select('marks_awarded, approved_at').eq('id', r1.examAnswer).single();
  check("Admin confirms P1's marks did not change", Number(answer.data?.marks_awarded) === 0 && answer.data?.approved_at === null,
    JSON.stringify(answer.data ?? answer.error));
  const attempt = await admin.from('exam_attempts').select('score, status').eq('id', r1.examAttempt).single();
  check("Admin confirms P1's exam score did not change", attempt.data?.score === null && attempt.data?.status === 'in_progress',
    JSON.stringify(attempt.data ?? attempt.error));
  const verdict = await admin.from('attempts').select('answer_verdict').eq('id', r1.attempt).single();
  check("Admin confirms P1's AI verdict did not change", verdict.data?.answer_verdict === 'no', JSON.stringify(verdict.data ?? verdict.error));
  const status = await admin.from('segment_status').select('status, tries_used').eq('pupil_id', P1).eq('segment_id', CONTENT.segmentId).single();
  check("Admin confirms P1's segment is still in progress", status.data?.status === 'in_progress' && status.data?.tries_used === 1,
    JSON.stringify(status.data ?? status.error));
  const name = await admin.from('pupils').select('display_name').eq('id', P1).single();
  check("Admin confirms P1's name did not change", name.data?.display_name === PUPILS.p1.name, JSON.stringify(name.data ?? name.error));

  for (const key of ['p2', 'p3', 'p4'] as const) {
    const pupil = PUPILS[key];
    section(`${pupil.user.label}`);
    const client = await signIn(pupil.user);
    await seesOnly(client, pupil.user.label, 'pupils', 'id', PUPIL_IDS, [pupil.id], 'pupil');
    await seesOnly(client, pupil.user.label, 'attempts', 'pupil_id', PUPIL_IDS, [pupil.id], 'attempts');
    await seesOnly(client, pupil.user.label, 'consents', 'pupil_id', PUPIL_IDS, OWNERS.consents.includes(pupil.id) ? [pupil.id] : [], 'consents');
    await seesNothing(client, `${pupil.user.label} cannot read P1's profile`, 'profiles', 'pupil_id', [P1]);
    await seesNothing(client, `${pupil.user.label} cannot read flags`, 'flags', 'pupil_id', PUPIL_IDS);
  }
}

async function teacherChecks() {
  section('Teacher of Test Basic 7A');
  const t7a = await signIn(USERS.teacher7A);
  await seesOnly(t7a, 'Teacher 7A', 'pupils', 'id', PUPIL_IDS, CLASS_7A_PUPIL_IDS, 'pupil (P1 to P3, not P4)');
  for (const table of PUPIL_TABLES) {
    await seesOnly(t7a, 'Teacher 7A', table, 'pupil_id', PUPIL_IDS, OWNERS[table].filter((p) => CLASS_7A_PUPIL_IDS.includes(p)), table);
  }
  await seesOnly(t7a, 'Teacher 7A', 'flags', 'pupil_id', PUPIL_IDS, [P1, P2], 'flags');
  await seesNothing(t7a, 'Teacher 7A cannot read P4 at all', 'pupils', 'id', [P4]);
  await seesNothing(t7a, "Teacher 7A cannot read P4's flags", 'flags', 'pupil_id', [P4]);
  await seesOnly(t7a, 'Teacher 7A', 'classes', 'id', [CLASSES.A.id, CLASSES.B.id], [CLASSES.A.id], 'class');
  await seesOnly(t7a, 'Teacher 7A', 'staff', 'id', Object.values(STAFF).map((s) => s.id), [STAFF.teacher7A.id], 'staff');
  await seesNothing(t7a, 'Teacher 7A cannot read ai_calls', 'ai_calls', 'pupil_id', PUPIL_IDS);
  await seesNothing(t7a, 'Teacher 7A cannot read the exam answer key', 'exam_item_keys', 'item_id', [CONTENT.objectiveItemId, CONTENT.theoryItemId]);
  await columnRefused(t7a, 'Teacher 7A cannot read pin_hash', 'pupils', 'pin_hash', 'id', CLASS_7A_PUPIL_IDS);
  await updateRefused(t7a, 'Teacher 7A cannot move P1 to another class', 'pupils', { class_id: CLASSES.B.id }, 'id', P1);
  await updateRefused(t7a, 'Teacher 7A cannot clear a flag (admin job)', 'flags', { cleared_at: new Date().toISOString() }, 'id', r1.flag);

  section('Teacher of Test Basic 7B');
  const t7b = await signIn(USERS.teacher7B);
  await seesOnly(t7b, 'Teacher 7B', 'pupils', 'id', PUPIL_IDS, [P4], 'pupil (P4 only)');
  await seesOnly(t7b, 'Teacher 7B', 'attempts', 'pupil_id', PUPIL_IDS, [P4], 'attempts');
  await seesOnly(t7b, 'Teacher 7B', 'flags', 'pupil_id', PUPIL_IDS, [P4], 'flags');
}

async function adminChecks(admin: SupabaseClient) {
  section('Admin (test-admin)');
  const staffIds = Object.values(STAFF).map((s) => s.id);
  const expected: { table: string; column: string; ids: string[]; count: number }[] = [
    { table: 'schools', column: 'id', ids: [SCHOOL.id], count: 1 },
    { table: 'staff', column: 'id', ids: staffIds, count: 3 },
    { table: 'classes', column: 'id', ids: [CLASSES.A.id, CLASSES.B.id], count: 2 },
    { table: 'pupils', column: 'id', ids: PUPIL_IDS, count: 4 },
    { table: 'profiles', column: 'pupil_id', ids: PUPIL_IDS, count: 4 },
    { table: 'consents', column: 'pupil_id', ids: PUPIL_IDS, count: 3 },
    { table: 'attempts', column: 'pupil_id', ids: PUPIL_IDS, count: 4 },
    { table: 'segment_status', column: 'pupil_id', ids: PUPIL_IDS, count: 4 },
    { table: 'overview_responses', column: 'pupil_id', ids: PUPIL_IDS, count: 4 },
    { table: 'exam_attempts', column: 'pupil_id', ids: PUPIL_IDS, count: 3 },
    { table: 'exam_answers', column: 'pupil_id', ids: PUPIL_IDS, count: 3 },
    { table: 'mastery', column: 'pupil_id', ids: PUPIL_IDS, count: 3 },
    { table: 'flags', column: 'pupil_id', ids: PUPIL_IDS, count: 3 },
    { table: 'ai_calls', column: 'pupil_id', ids: PUPIL_IDS, count: 3 },
    { table: 'topics', column: 'id', ids: [CONTENT.topicId], count: 1 },
    { table: 'segments', column: 'id', ids: [CONTENT.segmentId], count: 1 },
    { table: 'video_versions', column: 'id', ids: [CONTENT.videoVersionId], count: 1 },
    { table: 'check_items', column: 'id', ids: [CONTENT.checkItemId], count: 1 },
    { table: 'exam_papers', column: 'id', ids: [CONTENT.paperId], count: 1 },
    { table: 'exam_items', column: 'paper_id', ids: [CONTENT.paperId], count: 2 },
    { table: 'exam_item_keys', column: 'item_id', ids: [CONTENT.objectiveItemId, CONTENT.theoryItemId], count: 2 },
  ];
  for (const e of expected) {
    const { rows, error } = await read(admin, e.table, e.column, e.column, e.ids);
    check(`Admin sees all ${e.count} test ${e.table} rows`, !error && rows.length === e.count, error ?? `got ${rows.length}`);
  }
  const settings = await admin.from('app_settings').select('public_signup_enabled');
  check('Admin reads app_settings', !settings.error && (settings.data ?? []).length === 1, settings.error?.message);
  // Not even an admin reads PIN hashes through the API. Only the service role does.
  await columnRefused(admin, 'Admin cannot read pin_hash either (service role only)', 'pupils', 'pin_hash', 'id', PUPIL_IDS);
}

async function main() {
  console.log(`RLS suite against atlas-dev, ${new Date().toISOString()}`);
  await anonChecks();
  section('Admin sign-in (used to confirm refused writes changed nothing)');
  const admin = await signIn(USERS.admin);
  await pupilChecks(admin);
  await teacherChecks();
  await adminChecks(admin);

  section('Pupil sign-in functions (service role only, S10)');
  await signinFunctionChecks('anon', newClient());
  await signinFunctionChecks('P1', await signIn(USERS.p1));
  await signinFunctionChecks('Admin', admin);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error(`\nFAIL  suite stopped: ${err instanceof Error ? err.message : String(err)}`);
  console.log(`\n${passed} passed, ${failed + 1} failed`);
  process.exit(1);
});
