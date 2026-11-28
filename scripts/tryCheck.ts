/**
 * Runs the ai-check Edge Function against atlas-dev (runbook S19 item 8, D-52).
 *
 * Usage: npm run try:check
 *
 * Sends the runbook's 6 sample answers for segment 1B (try 1) as fake pupil P1
 * and prints each verdict for the team to read. Also checks, PASS or FAIL:
 * every reply matches checkReplySchema; two taps make no AI call; the logged
 * AI input holds no pupil name or class; refusals for no session, another
 * pupil, no consent, a name field, a fake tap and a wrong segment. Any FAIL
 * exits with code 1.
 *
 * Fake test pupils only (rule 15). The ai_calls rows are kept so the team can
 * read them (job "check", pupil P1).
 */
import { createClient } from '@supabase/supabase-js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { checkReplySchema } from '../src/domain/aiSchemas.ts';
import { runCliSql } from './lib/cliSql.ts';
import { assertAtlasDev, parseEnvFile } from './lib/devTarget.ts';
import { CLASSES, PUPILS, type TestUser } from './lib/testFixtures.ts';

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
const functionUrl = `${supabaseUrl}/functions/v1/ai-check`;
const sql = (text: string) => runCliSql(root, ref, text, 'read');

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
}

async function signIn(u: TestUser): Promise<string> {
  const password = envTest[u.passwordEnv];
  if (!password) throw new Error(`${u.passwordEnv} missing from .env.test. Run npm run seed:dev.`);
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: u.email, password });
  if (error || !data.session) throw new Error(`Cannot sign in as ${u.label}`);
  return data.session.access_token;
}

type Reply = { status: number; body: unknown };
async function call(token: string | null, body: Record<string, unknown>): Promise<Reply> {
  const headers: Record<string, string> = { apikey: anonKey, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(functionUrl, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json().catch(() => null) };
}
const shape = (r: Reply) => `HTTP ${r.status} ${JSON.stringify(r.body)}`;
const p1Calls = () => Number(sql(`select count(*) as n from public.ai_calls where job = 'check' and pupil_id = '${PUPILS.p1.id}';`)[0]?.n ?? 0);

async function main() {
  const rows = sql(`select c.id, c.question, c.accepted_answers, c.tap_options, c.reason_options, c.reference_reasoning
    from public.check_items c join public.segments s on s.id = c.segment_id join public.topics t on t.id = s.topic_id
    where t.code = 'B7-MATERIALS' and s.code = '1B' and c.try_number = 1;`);
  const q = rows[0] as
    | { id: string; question: string; accepted_answers: string[]; tap_options: string[]; reason_options: { text: string; code: string | null }[]; reference_reasoning: string }
    | undefined;
  if (!q) throw new Error('No 1B try 1 check item on atlas-dev. Run npm run content:import.');
  if (/DRAFT/.test(q.question)) console.log('INFO  1B content is still DRAFT: read the verdicts as a shape check, not a teacher check.');

  const p1 = await signIn(PUPILS.p1.user);
  const p3 = await signIn(PUPILS.p3.user);
  const base = { pupil_id: PUPILS.p1.id, segment_code: '1B', try_number: 1, question_id: q.id, answer_mode: 'typing', reason_mode: 'typing' };
  const accepted = q.accepted_answers[0] ?? '';
  const wrongTap = q.tap_options.find((o) => !q.accepted_answers.some((a) => a.trim().toLowerCase() === o.trim().toLowerCase())) ?? 'Plastic';
  const startedAt = new Date().toISOString();
  const replies: Reply[] = [];

  console.log('\nWho may call');
  const noToken = await call(null, { ...base, answer_text: accepted, reason_text: 'x' });
  check('No session: 401', noToken.status === 401, shape(noToken));
  const asOther = await call(p1, { ...base, pupil_id: PUPILS.p2.id, answer_text: accepted, reason_text: 'x' });
  check('P1 cannot send as P2: 403', asOther.status === 403, shape(asOther));
  const noConsent = await call(p3, { ...base, pupil_id: PUPILS.p3.id, answer_text: accepted, reason_text: 'x' });
  check('P3 has no consent: 403', noConsent.status === 403, shape(noConsent));

  console.log('\nBad input');
  const withName = await call(p1, { ...base, answer_text: accepted, reason_text: 'x', name: PUPILS.p1.name });
  check('A name field is refused: 400', withName.status === 400, shape(withName));
  const fakeTap = await call(p1, { ...base, answer_mode: 'tap', answer_text: 'not an option', reason_text: 'x' });
  check('A "tap" answer that is not an option: 400', fakeTap.status === 400, shape(fakeTap));
  const wrongSeg = await call(p1, { ...base, segment_code: '1C', answer_text: accepted, reason_text: 'x' });
  check('Question from another segment: 400', wrongSeg.status === 400, shape(wrongSeg));

  console.log('\nTwo taps');
  const before = p1Calls();
  const sound = q.reason_options.find((o) => o.code === null)?.text ?? '';
  const taps = await call(p1, { ...base, answer_mode: 'tap', reason_mode: 'tap', answer_text: accepted, reason_text: sound });
  replies.push(taps);
  console.log(`INFO  ${shape(taps)}`);
  check('Two taps: answered', taps.status === 200 && (taps.body as { ok?: boolean }).ok === true, shape(taps));
  check('Two taps: no AI call (ai_calls unchanged)', p1Calls() === before, `${before} then ${p1Calls()}`);

  console.log('\nSix sample answers (typed)');
  const samples: [string, string, string][] = [
    ['correct, sound reason', accepted, q.reference_reasoning],
    ['correct, wrong reason (heavy means strong)', accepted, 'Because it is heavy, and heavy things are always strong.'],
    ['wrong, sound-sounding reason', wrongTap, q.reference_reasoning],
    ['nonsense text', 'asdf qwer zxcv', 'lol hahaha'],
    ['empty reason', accepted, ''],
    ['another language (Twi)', 'Dade no yɛ den', 'Ɛfiri sɛ ɛnnbu ntɛm'],
  ];
  for (const [label, answer, reason] of samples) {
    const t0 = Date.now();
    const r = await call(p1, { ...base, answer_text: answer, reason_text: reason });
    replies.push(r);
    console.log(`\n${label}  (${Date.now() - t0} ms)\n  answer: ${answer}\n  reason: ${reason || '(empty)'}\n  reply:  ${shape(r)}`);
  }

  console.log('\nShape and logging');
  const bad = replies.filter((r) => r.status !== 200 || !checkReplySchema.safeParse(r.body).success);
  check(`Every reply matches checkReplySchema (${replies.length})`, bad.length === 0, bad.map(shape).join(' | '));
  const logged = sql(`select input::text as input from public.ai_calls where job = 'check' and pupil_id = '${PUPILS.p1.id}' and created_at >= '${startedAt}';`);
  check('At least one AI call logged for the typed samples', logged.length > 0, `${logged.length} rows`);
  const leaks = logged.filter((row) => {
    const text = String(row.input);
    return text.includes(PUPILS.p1.name) || text.includes(CLASSES.A.name);
  });
  check('No logged AI input holds the pupil name or class', leaks.length === 0, `${leaks.length} rows`);
  const models = sql(`select model, ok, count(*) as n from public.ai_calls where job = 'check' and pupil_id = '${PUPILS.p1.id}' and created_at >= '${startedAt}' group by 1, 2 order by 1, 2;`);
  console.log(`INFO  AI calls this run: ${JSON.stringify(models)}`);

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
