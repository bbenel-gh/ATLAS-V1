/**
 * Saves scripted attempts for fake pupil TEST-P1 on segment 1A against
 * atlas-dev (runbook S20 "You check", D-54).
 *
 * Usage: npm run try:attempt
 *
 * Proves, PASS or FAIL: one attempt row with every FR-23 field filled; the
 * same attempt id sent twice is still one row; rounds open only in order and
 * a resend changes nothing; the tries rule moves the segment on after 3
 * failed tries and a stalled flag is there; a Relearn round completes it and
 * clears the flag; refusals for no consent, another pupil, a name field, a
 * fake tap, a wrong round and flags the facts do not support; a pupil cannot
 * insert an attempt directly.
 *
 * Two-tap checks only, so no AI call is made (D-52). Fake test pupils only
 * (rule 15). P1's 1A rows are cleared before and after, so the run repeats.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { runCliSql } from './lib/cliSql.ts';
import { assertAtlasDev, parseEnvFile } from './lib/devTarget.ts';
import { PUPILS, type TestUser } from './lib/testFixtures.ts';

const root = join(import.meta.dirname, '..');
const env = parseEnvFile(readFileSync(join(root, '.env'), 'utf8'));
const envTestPath = join(root, '.env.test');
if (!existsSync(envTestPath)) {
  console.error('No .env.test. Run npm run seed:dev first.');
  process.exit(1);
}
const envTest = parseEnvFile(readFileSync(envTestPath, 'utf8'));
const linkedRefPath = join(root, 'supabase', '.temp', 'project-ref');
const ref = assertAtlasDev({
  supabaseUrl: env.EXPO_PUBLIC_SUPABASE_URL,
  linkedRef: existsSync(linkedRefPath) ? readFileSync(linkedRefPath, 'utf8') : undefined,
});
const supabaseUrl = (env.EXPO_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '');
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
const read = (text: string) => runCliSql(root, ref, text, 'read');
const write = (text: string) => runCliSql(root, ref, text, 'write');
const P1 = PUPILS.p1.id;

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
}

async function signIn(u: TestUser): Promise<{ token: string; client: SupabaseClient }> {
  const password = envTest[u.passwordEnv];
  if (!password) throw new Error(`${u.passwordEnv} missing from .env.test. Run npm run seed:dev.`);
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: u.email, password });
  if (error || !data.session) throw new Error(`Cannot sign in as ${u.label}`);
  return { token: data.session.access_token, client };
}

type Reply = { status: number; body: Record<string, unknown> | null };
async function call(fn: string, token: string, body: Record<string, unknown>): Promise<Reply> {
  const res = await fetch(`${supabaseUrl}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { apikey: anonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json().catch(() => null)) as Record<string, unknown> | null };
}
const shape = (r: Reply) => `HTTP ${r.status} ${JSON.stringify(r.body)}`;

type Item = { id: string; try_number: number; tap_options: string[]; accepted_answers: string[]; reason_options: { text: string; code: string | null }[] };

function clear(segmentId: string) {
  write(`delete from public.check_results where pupil_id = '${P1}' and check_item_id in (select id from public.check_items where segment_id = '${segmentId}');
    delete from public.flags where pupil_id = '${P1}' and segment_id = '${segmentId}';
    delete from public.attempts where pupil_id = '${P1}' and segment_id = '${segmentId}';
    delete from public.segment_status where pupil_id = '${P1}' and segment_id = '${segmentId}';`);
}

async function main() {
  const seg = read(`select s.id from public.segments s join public.topics t on t.id = s.topic_id
    where t.code = 'B7-MATERIALS' and s.code = '1A';`)[0] as { id: string } | undefined;
  if (!seg) throw new Error('No 1A segment on atlas-dev. Run npm run content:import.');
  const items = read(`select id, try_number, tap_options, accepted_answers, reason_options from public.check_items
    where segment_id = '${seg.id}' order by try_number;`) as Item[];
  if (items.length < 3) throw new Error('1A needs 3 check items.');
  const norm = (s: string) => s.trim().toLowerCase();
  const right = (i: Item) => i.tap_options.find((o) => i.accepted_answers.some((a) => norm(a) === norm(o))) ?? '';
  const wrong = (i: Item) => i.tap_options.find((o) => !i.accepted_answers.some((a) => norm(a) === norm(o))) ?? '';
  const sound = (i: Item) => i.reason_options.find((o) => o.code === null)?.text ?? '';
  const unsound = (i: Item) => i.reason_options.find((o) => o.code !== null) ?? { text: '', code: null };
  const [item1, item2, item3] = items as [Item, Item, Item];

  clear(seg.id);
  const p1 = await signIn(PUPILS.p1.user);
  const p3 = await signIn(PUPILS.p3.user);

  const rpc = (round: number) => p1.client.rpc('start_segment_round', { p_segment_id: seg.id, p_round: round });
  const status = () =>
    read(`select status, round, tries_used, round_done from public.segment_status where pupil_id = '${P1}' and segment_id = '${seg.id}';`)[0] as
      | { status: string; round: number; tries_used: number; round_done: boolean }
      | undefined;
  const openFlags = () =>
    Number(read(`select count(*) as n from public.flags where pupil_id = '${P1}' and segment_id = '${seg.id}' and kind = 'stalled' and cleared_at is null;`)[0]?.n ?? 0);

  // Taps through ai-check (no AI call), then save-attempt.
  async function tapTry(round: number, item: Item, answer: string, reason: string, over: Record<string, unknown> = {}) {
    const attemptId = randomUUID();
    const base = { pupil_id: P1, segment_code: '1A', try_number: item.try_number, question_id: item.id };
    const checked = await call('ai-check', p1.token, {
      ...base, attempt_id: attemptId, answer_text: answer, answer_mode: 'tap', reason_text: reason, reason_mode: 'tap',
    });
    const body = {
      ...base, attempt_id: attemptId, round, version_label: 'a', answer_text: answer, answer_mode: 'tap', reason_text: reason,
      reason_mode: 'tap', sure: false, time_taken_ms: 8421, changed_answer: true, read_back_confirmed: true, tap_answer: null,
      tap_reason: null, client_created_at: new Date().toISOString(), ...over,
    };
    return { attemptId, checked, body, saved: await call('save-attempt', p1.token, body) };
  }

  console.log('\nRounds');
  const early = await rpc(2);
  check('Round 2 cannot start before round 1', early.error !== null, JSON.stringify(early));
  const r1 = await rpc(1);
  check('Round 1 starts', !r1.error && r1.data === 1, JSON.stringify(r1));
  const r1again = await rpc(1);
  check('Starting round 1 again changes nothing (a resend)', !r1again.error && r1again.data === 1 && status()?.tries_used === 0, JSON.stringify(r1again));
  const r2open = await rpc(2);
  check('Round 2 cannot start while round 1 is open', r2open.error !== null);
  const r3 = await p3.client.rpc('start_segment_round', { p_segment_id: seg.id, p_round: 1 });
  check('P3 (no consent) cannot start a round', r3.error !== null);

  console.log('\nTry 1: two taps, wrong answer, unsound reason');
  const t1 = await tapTry(1, item1, wrong(item1), unsound(item1).text);
  check('ai-check answered two taps', t1.checked.status === 200 && t1.checked.body?.ok === true, shape(t1.checked));
  check('save-attempt saved it', t1.saved.status === 200 && t1.saved.body?.ok === true && t1.saved.body?.judged === true, shape(t1.saved));
  const again = await call('save-attempt', p1.token, t1.body);
  check('Same id sent again: ok, marked duplicate', again.status === 200 && again.body?.duplicate === true, shape(again));
  const count = Number(read(`select count(*) as n from public.attempts where id = '${t1.attemptId}';`)[0]?.n ?? -1);
  check('Still exactly one row for that id', count === 1, `${count} rows`);
  const row = read(`select a.try_number, a.round, v.label as version, a.answer, a.input_mode, a.reason, a.reason_input_mode, a.sure,
      a.time_taken_ms, a.changed_answer, a.answer_verdict, a.reasoning_verdict, a.misconception_codes, a.ai_fallback,
      a.read_back, a.read_back_confirmed, a.check_item_id, a.client_created_at
    from public.attempts a left join public.video_versions v on v.id = a.video_version_id where a.id = '${t1.attemptId}';`)[0] ?? {};
  console.log(`INFO  ${JSON.stringify(row)}`);
  const missing = Object.entries(row).filter(([, v]) => v === null || v === undefined || (Array.isArray(v) && v.length === 0)).map(([k]) => k);
  check('Every FR-23 field is filled', Object.keys(row).length === 18 && missing.length === 0, `empty: ${missing.join(', ')}`);
  check('Fields are as sent and as judged',
    row.try_number === 1 && row.version === 'a' && row.input_mode === 'tap' && row.sure === false && row.time_taken_ms === 8421 &&
      row.changed_answer === true && row.answer_verdict === 'no' && row.reasoning_verdict === 'no' &&
      JSON.stringify(row.misconception_codes) === JSON.stringify([unsound(item1).code]) && row.ai_fallback === false,
    JSON.stringify(row));
  check('One try used, round open', status()?.tries_used === 1 && status()?.round_done === false, JSON.stringify(status()));

  console.log('\nRefusals');
  const replay = await call('save-attempt', p1.token, { ...t1.body, attempt_id: randomUUID() });
  check('Try 1 again with a new id: 409 (not the next try)', replay.status === 409, shape(replay));
  const otherRound = await call('save-attempt', p1.token, { ...t1.body, attempt_id: randomUUID(), round: 2, try_number: 2, question_id: item2.id });
  check('A try in a round that is not open: 409', otherRound.status === 409, shape(otherRound));
  const asP2 = await call('save-attempt', p1.token, { ...t1.body, attempt_id: randomUUID(), pupil_id: PUPILS.p2.id });
  check('P1 cannot save as P2: 403', asP2.status === 403, shape(asP2));
  const noConsent = await call('save-attempt', p3.token, { ...t1.body, attempt_id: randomUUID(), pupil_id: PUPILS.p3.id });
  check('P3 has no consent: 403', noConsent.status === 403, shape(noConsent));
  const named = await call('save-attempt', p1.token, { ...t1.body, attempt_id: randomUUID(), name: PUPILS.p1.name });
  check('A name field is refused: 400', named.status === 400, shape(named));
  const verdict = await call('save-attempt', p1.token, { ...t1.body, attempt_id: randomUUID(), answer_verdict: 'yes' });
  check('A verdict from the phone is refused: 400', verdict.status === 400, shape(verdict));
  const fakeTap = await call('save-attempt', p1.token, {
    ...t1.body, attempt_id: randomUUID(), try_number: 2, question_id: item2.id, answer_text: 'not an option',
  });
  check('A "tap" that is not an option: 400', fakeTap.status === 400, shape(fakeTap));
  const direct = await p1.client.from('attempts').insert({ pupil_id: P1, segment_id: seg.id, try_number: 2, input_mode: 'tap', answer: 'x' });
  check('P1 cannot insert an attempt directly', direct.error !== null);
  const stalledEarly = await call('raise-flag', p1.token, { pupil_id: P1, kind: 'stalled', segment_code: '1A' });
  check('raise-flag stalled while in progress: 409', stalledEarly.status === 409, shape(stalledEarly));
  const borderline = await call('raise-flag', p1.token, { pupil_id: P1, kind: 'borderline', segment_code: '1A', attempt_id: t1.attemptId });
  check('raise-flag borderline with no unsure verdict: 409', borderline.status === 409, shape(borderline));
  const safeguard = await call('raise-flag', p1.token, { pupil_id: P1, kind: 'safeguarding', segment_code: '1A' });
  check('raise-flag safeguarding is not allowed: 400', safeguard.status === 400, shape(safeguard));

  console.log('\nTry 2: typed, AI not reached, fallback taps decide');
  const id2 = randomUUID();
  const t2 = await call('save-attempt', p1.token, {
    ...t1.body, attempt_id: id2, try_number: 2, question_id: item2.id, version_label: 'b', answer_text: 'my own words', answer_mode: 'typing',
    reason_text: 'because of my own idea', reason_mode: 'typing', read_back_confirmed: null, tap_answer: right(item2), tap_reason: unsound(item2).text,
  });
  check('Saved and judged from the fallback taps', t2.status === 200 && t2.body?.answerVerdict === 'yes' && t2.body?.reasoningVerdict === 'no', shape(t2));
  const row2 = read(`select input_mode, ai_fallback, tap_answer, tap_reason from public.attempts where id = '${id2}';`)[0] ?? {};
  check('ai_fallback set, typed mode kept as "typed", taps kept', row2.ai_fallback === true && row2.input_mode === 'typed' && row2.tap_answer === right(item2), JSON.stringify(row2));

  console.log('\nTry 3 fails: moved on');
  const t3 = await tapTry(1, item3, wrong(item3), sound(item3));
  check('Try 3 saved', t3.saved.status === 200, shape(t3.saved));
  const s3 = status();
  check('Segment moved on, round done, 3 tries', s3?.status === 'moved_on' && s3.round_done === true && s3.tries_used === 3, JSON.stringify(s3));
  check('One open stalled flag (trigger)', openFlags() === 1, `${openFlags()}`);
  const ensure = await call('raise-flag', p1.token, { pupil_id: P1, kind: 'stalled', segment_code: '1A' });
  check('raise-flag stalled: ok, no second flag', ensure.status === 200 && ensure.body?.created === false && openFlags() === 1, shape(ensure));
  const late = await call('save-attempt', p1.token, { ...t3.body, attempt_id: randomUUID() });
  check('No more tries in a finished round: 409', late.status === 409, shape(late));

  console.log('\nRelearn: round 2 completes it');
  const r2 = await rpc(2);
  const s4 = status();
  check('Round 2 starts after round 1 ended; status stays moved on', !r2.error && r2.data === 2 && s4?.status === 'moved_on' && s4.tries_used === 0 && s4.round_done === false,
    JSON.stringify({ r2, s4 }));
  const t4 = await tapTry(2, item1, right(item1), sound(item1));
  check('Round 2 try 1 right and sound', t4.saved.status === 200 && t4.saved.body?.answerVerdict === 'yes' && t4.saved.body?.reasoningVerdict === 'yes', shape(t4.saved));
  const s5 = status();
  check('Segment complete, round done', s5?.status === 'complete' && s5.round_done === true, JSON.stringify(s5));
  check('Stalled flag cleared', openFlags() === 0, `${openFlags()}`);
  const rounds = read(`select round, count(*) as n from public.attempts where pupil_id = '${P1}' and segment_id = '${seg.id}' group by round order by round;`);
  check('Attempts record their round (3 in round 1, 1 in round 2)', JSON.stringify(rounds.map((r) => [r.round, Number(r.n)])) === '[[1,3],[2,1]]', JSON.stringify(rounds));

  clear(seg.id);
  const left = Number(read(`select count(*) as n from public.attempts where pupil_id = '${P1}' and segment_id = '${seg.id}';`)[0]?.n ?? -1);
  check("P1's 1A rows cleared after the run", left === 0, `${left}`);

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
