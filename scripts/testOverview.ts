/**
 * Runs the ai-overview Edge Function against atlas-dev (runbook S17, D-49).
 *
 * Usage: npm run test:overview
 *
 * Shows: the caller must be that pupil, with consent; bad input is refused;
 * Skip saves a row with no AI call; Send saves a row, logs every AI call in
 * ai_calls with no name or class, and (when ANTHROPIC_API_KEY is set) fills
 * ai_result and the profile; sending the same response again changes nothing;
 * a pupil cannot write the overview words themselves. Each check prints PASS
 * or FAIL. Any FAIL exits with code 1.
 *
 * Fake test pupils only (rule 15). Checks and clean-up go through the Supabase
 * CLI login (D-31). Every row the run makes is removed at the end.
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
const functionUrl = `${supabaseUrl}/functions/v1/ai-overview`;
const TOPIC = 'B7-MATERIALS';

let failures = 0;
function check(name: string, ok: boolean, detail?: string) {
  if (!ok) failures += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? `  (${detail})` : ''}`);
}
function info(text: string) {
  console.log(`INFO  ${text}`);
}

const sql = (text: string, mode: 'read' | 'write' = 'read') => runCliSql(root, ref, text, mode);

async function signIn(u: TestUser): Promise<{ client: SupabaseClient; token: string }> {
  const password = envTest[u.passwordEnv];
  if (!password) throw new Error(`${u.passwordEnv} missing from .env.test. Run npm run seed:dev.`);
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: u.email, password });
  if (error || !data.session) throw new Error(`Cannot sign in as ${u.label}`);
  return { client, token: data.session.access_token };
}

type Reply = { status: number; body: Record<string, unknown> };

async function call(token: string | null, body: Record<string, unknown>): Promise<Reply> {
  const headers: Record<string, string> = { apikey: anonKey, 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(functionUrl, { method: 'POST', headers, body: JSON.stringify(body) });
  let parsed: Record<string, unknown> = {};
  try {
    parsed = (await res.json()) as Record<string, unknown>;
  } catch {
    // leave empty
  }
  return { status: res.status, body: parsed };
}
const shape = (r: Reply) => `HTTP ${r.status} ${JSON.stringify(r.body)}`;

const input = (pupilId: string, responseId: string, summary: string, confusing: string) => ({
  pupil_id: pupilId,
  topic_code: TOPIC,
  response_id: responseId,
  summary_text: summary,
  confusing_text: confusing,
  client_created_at: new Date().toISOString(),
});

const made: string[] = [];
const newId = () => {
  const id = randomUUID();
  made.push(id);
  return id;
};
const rowsFor = (id: string) => sql(`select pupil_id, skipped, summary_text, ai_result from public.overview_responses where id = '${id}';`);
const callsFor = (id: string) => sql(`select ok, model, input, output from public.ai_calls where job = 'overview' and input->>'response_id' = '${id}' order by id;`);

async function main() {
  const p1 = await signIn(PUPILS.p1.user);
  const p2 = await signIn(PUPILS.p2.user);
  const p3 = await signIn(PUPILS.p3.user);
  const before = sql(`select overview_keywords, overview_interests, overview_confusions from public.profiles where pupil_id = '${PUPILS.p1.id}';`)[0];

  console.log('\nWho may call');
  const noToken = await call(null, input(PUPILS.p1.id, newId(), 'wood', ''));
  check('No session: refused, nothing saved', noToken.status === 401 && rowsFor(made.at(-1)!).length === 0, shape(noToken));
  const asOther = await call(p1.token, input(PUPILS.p2.id, newId(), 'wood', ''));
  check("P1 cannot send as P2: 403, nothing saved", asOther.status === 403 && rowsFor(made.at(-1)!).length === 0, shape(asOther));
  const noConsent = await call(p3.token, input(PUPILS.p3.id, newId(), 'wood', ''));
  check('P3 has no consent: 403, nothing saved', noConsent.status === 403 && rowsFor(made.at(-1)!).length === 0, shape(noConsent));

  console.log('\nBad input');
  const tooLong = await call(p1.token, input(PUPILS.p1.id, newId(), 'a'.repeat(601), ''));
  check('601 characters: 400', tooLong.status === 400, shape(tooLong));
  const withName = await call(p1.token, { ...input(PUPILS.p1.id, newId(), 'wood', ''), name: PUPILS.p1.name });
  check('A name field is refused: 400', withName.status === 400 && rowsFor(made.at(-1)!).length === 0, shape(withName));
  const unknownTopic = await call(p1.token, { ...input(PUPILS.p1.id, newId(), 'wood', ''), topic_code: 'NO-SUCH-TOPIC' });
  check('Unknown topic: 400', unknownTopic.status === 400, shape(unknownTopic));

  console.log('\nSkip');
  const skipId = newId();
  const skip = await call(p1.token, input(PUPILS.p1.id, skipId, '', ''));
  const skipRow = rowsFor(skipId)[0];
  check('Skip: 200 ok', skip.status === 200 && skip.body.ok === true, shape(skip));
  check('Skip: row saved as skipped', skipRow?.skipped === true && skipRow.pupil_id === PUPILS.p1.id, JSON.stringify(skipRow));
  check('Skip: no AI call', callsFor(skipId).length === 0);

  console.log('\nSend');
  const sendId = newId();
  const summary = 'It was about materials like wood, plastic and metal. I play football with a plastic ball.';
  const confusing = 'The part about why metal feels cold.';
  const t0 = Date.now();
  const send = await call(p1.token, input(PUPILS.p1.id, sendId, summary, confusing));
  info(`reply in ${Date.now() - t0} ms: ${shape(send)}`);
  const aiAnswered = send.status === 200 && send.body.ok === true;
  const fellBack = send.status === 200 && send.body.fallback === true && send.body.retry === true;
  check('Send: 200 with ok, or a fallback the phone retries', aiAnswered || fellBack, shape(send));
  const sendRow = rowsFor(sendId)[0];
  check('Send: row saved with the texts', sendRow?.summary_text === summary && sendRow.skipped === false, JSON.stringify(sendRow));
  const calls = callsFor(sendId);
  check('Send: every AI call logged (1 or 2 tries)', calls.length >= 1 && calls.length <= 2, `${calls.length} rows`);
  check('Send: logged with model claude-haiku-5-5', calls.every((c) => c.model === 'claude-haiku-5-5'));
  const loggedText = JSON.stringify(calls.map((c) => c.input));
  const nameParts = PUPILS.p1.name.split(' ');
  check('Send: no name in ai_calls input', !nameParts.some((n) => loggedText.includes(n)), loggedText.slice(0, 200));
  check('Send: no class in ai_calls input', !/Basic [789]|Test Basic/.test(loggedText), loggedText.slice(0, 200));
  const keys = [...new Set(calls.flatMap((c) => Object.keys((c.input ?? {}) as object)))].sort();
  check('Send: input holds only segment titles, the two texts and the response id', JSON.stringify(keys) === JSON.stringify(['pupil_confusion', 'pupil_summary', 'response_id', 'segment_titles', 'try']), JSON.stringify(keys));

  if (aiAnswered) {
    check('Send: one call when the first answer is good, logged ok', calls.length === 1 && calls[0]?.ok === true);
    const result = sendRow?.ai_result as Record<string, unknown> | null;
    check('Send: ai_result has keywords and segment codes', Array.isArray(result?.keywords) && Array.isArray(result?.segmentsMentioned), JSON.stringify(result));
    info(`ai_result: ${JSON.stringify(result)}`);
    const after = sql(`select overview_keywords, overview_interests, overview_confusions from public.profiles where pupil_id = '${PUPILS.p1.id}';`)[0];
    check('Send: the profile gained keywords', Array.isArray(after?.overview_keywords) && (after.overview_keywords as string[]).length > 0, JSON.stringify(after));
    const codes = (result?.segmentsMentioned ?? []) as string[];
    check('Send: segments mentioned are codes of this topic', codes.every((c) => /^(OV|1[A-Z]+)$/.test(c)), JSON.stringify(codes));
  } else {
    info('The AI did not answer (no ANTHROPIC_API_KEY yet, or a failure). Checking the fallback path.');
    check('Fallback: two tries, both logged not ok', calls.length === 2 && calls.every((c) => c.ok === false), JSON.stringify(calls.map((c) => c.output)));
    check('Fallback: no ai_result yet', (sendRow?.ai_result ?? null) === null);
  }

  console.log('\nSend again');
  const callsBefore = callsFor(sendId).length;
  const again = await call(p1.token, input(PUPILS.p1.id, sendId, summary, confusing));
  const rowsAfter = sql(`select count(*)::int as n from public.overview_responses where id = '${sendId}';`)[0];
  check('Same response twice: still one row', rowsAfter?.n === 1, JSON.stringify(rowsAfter));
  if (aiAnswered) check('Same response twice: no second AI call', again.body.ok === true && callsFor(sendId).length === callsBefore, shape(again));
  else info(`Resend while the AI is not answering: ${shape(again)}`);
  const steal = await call(p2.token, input(PUPILS.p2.id, sendId, 'changed', ''));
  check("P2 cannot use P1's response id: 403", steal.status === 403, shape(steal));
  check("P1's row is unchanged", rowsFor(sendId)[0]?.summary_text === summary);

  console.log('\nThe pupil cannot write the overview words');
  const forged = await p1.client.from('profiles').update({ overview_keywords: ['forged'] }).eq('pupil_id', PUPILS.p1.id).select('pupil_id');
  check('P1 cannot set their own overview_keywords', forged.error !== null || (forged.data ?? []).length === 0, JSON.stringify(forged.data));
  const forgedI = await p1.client.from('profiles').update({ overview_interests: ['forged'] } as never).eq('pupil_id', PUPILS.p1.id).select('pupil_id');
  check('P1 cannot set their own overview_interests', forgedI.error !== null || (forgedI.data ?? []).length === 0, JSON.stringify(forgedI.data));
  const ai = await p1.client.from('overview_responses').update({ ai_result: { keywords: ['forged'] } } as never).eq('id', sendId).select('id');
  check('P1 cannot write ai_result', ai.error !== null || (ai.data ?? []).length === 0);

  // Clean up everything this run made, and put P1's profile back.
  const ids = made.map((id) => `'${id}'`).join(', ');
  const arr = (v: unknown) => `array[${((v as string[] | undefined) ?? []).map((s) => `'${s.replace(/'/g, "''")}'`).join(', ')}]::text[]`;
  sql(
    `delete from public.ai_calls where job = 'overview' and input->>'response_id' in (${ids});
     delete from public.flags where note like 'Overview response %' and pupil_id = '${PUPILS.p1.id}';
     delete from public.overview_responses where id in (${ids});
     update public.profiles set overview_keywords = ${arr(before?.overview_keywords)}, overview_interests = ${arr(before?.overview_interests)},
       overview_confusions = ${arr(before?.overview_confusions)} where pupil_id = '${PUPILS.p1.id}';`,
    'write',
  );
  const left = sql(`select count(*)::int as n from public.overview_responses where id in (${ids});`)[0];
  check('Clean-up: no rows left from this run', left?.n === 0, JSON.stringify(left));

  console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
